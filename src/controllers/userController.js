import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import bcryptjs from "bcryptjs";
import Role from "../models/RoleModel.js";
import errorHandler from "../middleware/validationErrorHandler.js";
import { validationResult } from "express-validator";

// @desc Register a new user
// @route POST '/api/users/signup'
// @access Public

export const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    const errMessages = errorHandler(errors);

    if (errMessages && errMessages.length) {
      const firstError = errMessages[0];
      const firstErrorMessage = Object.values(firstError)[0];
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: firstErrorMessage });
    }
    const { name, email, password } = req.body;
    const isEmailMatch = await User.findOne({ email: email });
    if (isEmailMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({
          success: false,
          message: "The email address is already registered.",
        });
    }

    const userRole = await Role.findOne({ role: "USER" });
    const hashPassword = bcryptjs.hashSync(password, 10);

    const user = new User({
      name,
      email,
      password: hashPassword,
      role: userRole._id,
    });

    const token = await user.generateAuthToken();

    const userData = await user.save();
    await userData.populate("role");
  
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully!",
      data: {user:userData, token: token},
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message:
          "An unexpected error occurred during signup. Please try again later.",
        error: error.message,
      });
  }
};

// @desc Login a new user
// @route POST '/api/users/login'
// @access Public

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    const errMessages = errorHandler(errors);

    if (errMessages && errMessages.length) {
      const firstError = errMessages[0];
      const firstErrorMessage = Object.values(firstError)[0];
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: firstErrorMessage });
    }
    
    const { email, password } = req.body;
    const user = await User.findOne({ email: email }).populate('role');

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User does not exist." });
    }

    if (user.isDeleted) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({
          success: false,
          message: "Your account has been deactivated.",
        });
    }
    const isPasswordMatch = bcryptjs.compareSync(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Generate token and send success response
    const token = await user.generateAuthToken();
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful.",
      data: {user: user, token: token},
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success: false, message: "An unexpected error occurred during login. Please try again later.", error: error.message})
  }
};

// @desc Put Update User
// @route POST '/api/users/update'
// @access Private: User

export const updateUser = async (req, res) => {
  try {
    console.log("update User");
  } catch (error) {}
};


// @desc Get All User 
// @route POST '/api/users/get-all-users'
// @access Private: Admin

export const getAllUsers = async(req, res) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = ( page -1 ) * limit

    const userRole = await Role.findOne({role: "USER"})

    let matchOptions = {
      role: userRole._id,
      isDeleted: false,
      $or: [
        {name: { $regex: '.*' + search + '.*', $options: 'i'}},
        {email: { $regex: '.*' + search + '.*', $options: 'i'}}
      ]
    }
    const users = User.aggregate([
      {
        $match: matchOptions,
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'role',
        },
      },
    ])
    const data = await User.aggregatePaginate(users, { page, limit })

    if(!data) {
      return res.status(StatusCodes.NOT_FOUND).json({success: false, message: "No users found"})
    }
    return res.status(StatusCodes.OK).json({success: true, message: "Users fetched successfully", data: data})
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success: false, message: "An error occurred while fetching users", error: error.message})
  }
}