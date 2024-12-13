import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import bcryptjs from "bcryptjs";
import Role from "../models/RoleModel.js";
import errorHandler from "../middleware/validationErrorHandler.js";
import { validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendForgotMail } from "../utils/email.js";
import jwt from "jsonwebtoken";
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
    const { name, email, password, ip } = req.body;
    const isEmailMatch = await User.findOne({ email: email });
    if (isEmailMatch) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The email address is already registered.",
      });
    }
    const hashPassword = bcryptjs.hashSync(password, 10);
    const userRole = await Role.findOne({ role: "USER" });
    const userIp = await User.findOne({ ip: ip });
    if (userIp) {
      const userUpdated = await User.findByIdAndUpdate(
        { _id: userIp?._id },
        {
          name,
          email,
          password: hashPassword,
          role: userRole._id,
        },
        { new: true }
      );
      const token = await userUpdated.generateAuthToken();
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "User registered successfully!",
        data: { user: userUpdated, token: token },
      });
    }

    const user = new User({
      name,
      email,
      password: hashPassword,
      role: userRole._id,

      ip: ip,
    });

    const token = await user.generateAuthToken();

    const userData = await user.save();
    await userData.populate("role");

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully!",
      data: { user: userData, token: token },
    });
  } catch (error) {
    return res.status(500).json({
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
    const user = await User.findOne({ email: email }).populate("role");

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User does not exist." });
    }

    if (user.isDeleted) {
      return res.status(StatusCodes.FORBIDDEN).json({
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
      data: { user: user, token: token },
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        "An unexpected error occurred during login. Please try again later.",
      error: error.message,
    });
  }
};

// @desc Get All User
// @route POST '/api/users/get-all-users'
// @access Private: Admin

export const getAllUsers = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const filterMonth = parseInt(req.query.month);
    const filterYear = parseInt(req.query.year);

    const userRole = await Role.findOne({ role: "USER" });

    let matchOptions = {
      role: userRole._id,
      isDeleted: false,
      email: { $exists: true, $ne: "" },
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };
    // Add date filtering if month and year are provided
    if (filterYear || filterMonth) {
      matchOptions.$expr = {
        $and: [
          ...(filterYear
            ? [{ $eq: [{ $year: "$createdAt" }, filterYear] }]
            : []),
          ...(filterMonth
            ? [{ $eq: [{ $month: "$createdAt" }, filterMonth] }]
            : []),
        ],
      };
    }

    const users = User.aggregate([
      {
        $match: matchOptions,
      },
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "_id",
          as: "role",
        },
      },
    ]);
    const data = await User.aggregatePaginate(users, { page, limit });

    if (!data) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "No users found" });
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Users fetched successfully",
      data: data,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
};

//@desc delete single User
//@route DELETE 'api/users/:id"
//@access Private :Admin

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    res
      .status(200)
      .json({ message: "User deleted successfully", success: true });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err?.message,
    });
  }
};

//@desc get allyears based on user
//@route GET '/api/user/get-year-based-onUsers"
//@access Private :Admin

export const allYears = async (req, res) => {
  try {
    const role = await Role.findOne({ role: "USER" });
    if (!role) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Role 'USER' not found.",
      });
    }
    const allyears = await User.aggregate([
      {
        $match: { role: role._id },
      },
      {
        $project: {
          year: { $year: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$year",
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $project: {
          year: "$_id",
          _id: 0,
        },
      },
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "",
      data: allyears,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err?.message,
    });
  }
};

//@desc get user profle
//@route GET '/api/user/user-profile
export const getUserProfile = async (req, res) => {
  try {
    return res.status(StatusCodes.OK).json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err?.message,
    });
  }
};

// @desc Put Update User
// @route POST '/api/users/update'
// @access Private: User

export const updateUser = async (req, res) => {
  try {
    const id = req.user._id;
    let updatedData = req.body;
    if (req.file) {
      const imagePath = `images/${req.file.filename}`;
      updatedData.avatar = imagePath;

      if (!req?.user) {
        return res.status(404).json({ error: "User not found." });
      }
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const oldImagePath = path.join(
        __dirname,
        "../../public",
        req.user.avatar
      );

      if (req.user.avatar && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const updatedUser = await User.findByIdAndUpdate({ _id: id }, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};

//@desc forgot password
//@route POST "/api/users/forgot-password"
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const userFound = await User.findOne({ email: email });
    if (!userFound) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The email address does not exist.",
      });
    }
    const token = await jwt.sign(
      { _id: userFound._id, email: userFound.email },
      process.env.SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    await sendForgotMail(email, token);
    return res.status(StatusCodes.OK).json({
      success: true,
      message:
        "An email has been sent to your email address. Please check your inbox for password reset.",
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
      error: err.message,
    });
  }
};

//@desc reset password
//@route POST "api/users/reset-password"
export const resetPassword = async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || !token) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Token and password must be required",
      });
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decode._id);
    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "unAuthorized" });
    }
    const hashPassword = bcryptjs.hashSync(password, 10);
    await User.findByIdAndUpdate(
      { _id: user._id },
      {
        password: hashPassword,
      },
      { new: true }
    );
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Reset password successfully.",
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};
