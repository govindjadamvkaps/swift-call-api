import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import bcryptjs from "bcryptjs";
import Role from "../models/RoleModel.js";
import errorHandler from "../middleware/validationErrorHandler.js";
import { validationResult } from "express-validator";
import geoip from "geoip-country";
import { emailSendAdmin } from "../utils/email.js";

// @desc Register a new admin
// @route POST '/api/admin/signup'
// @access Private:Superadmin

export const registerAdmin = async (req, res) => {
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
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email address is already registered.",
      });
    }

    const hashPassword = bcryptjs.hashSync(password, 10);
    const userRole = await Role.findOne({ role: "ADMIN" });
    let imagePath;

    if (req.file) {
      imagePath = `images/${req.file.filename}`;
    }
    await emailSendAdmin(email, name, password);
    const user = new User({
      name,
      email,
      permission: [],
      avatar: imagePath,
      password: hashPassword,
      role: userRole._id,
    });

    const token = await user.generateAuthToken();

    const userData = await user.save();
    await userData.populate("role");

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Admin registered successfully!",
      data: { user: userData, token: token },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// @desc Get All User
// @route POST '/api/admins/get-all-admins'
// @access Private: Superadmin

export const getAllAdmins = async (req, res) => {
  try {
    const search = req.query.search || "";
    const filterMonth = req.query.month ? parseInt(req.query.month) : null;
    const filterYear = req.query.year ? parseInt(req.query.year) : null;

    const userRole = await Role.findOne({ role: "ADMIN" });

    let matchOptions = {
      role: userRole._id,
      isDeleted: false,
      email: { $exists: true, $ne: "" },
    };

    // Add search condition if search query is provided
    if (search) {
      matchOptions.$or = [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ];
    }

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

    const aggregationPipeline = [
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
      {
        $unwind: "$role",
      },
      {
        $lookup: {
          from: "permissions",
          localField: "permission",
          foreignField: "_id",
          as: "permissions",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
          username: 1,
          role: 1,
          ip: 1,
          country: 1,
          createdAt: 1,
          updatedAt: 1,
          permissions: {
            $map: {
              input: "$permissions",
              as: "permission",
              in: {
                _id: "$$permission._id",
                name: "$$permission.name",
                permissionType: "$$permission.permissionType",
              },
            },
          },
        },
      },
    ];

    // Check if pagination is required
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let data;
    if (page && limit) {
      // If page and limit are provided, use pagination
      const skip = (page - 1) * limit;
      data = await User.aggregate(aggregationPipeline).skip(skip).limit(limit);

      const total = await User.countDocuments(matchOptions);

      data = {
        docs: data,
        totalDocs: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
      };
    } else {
      // If page and limit are not provided, return all users
      data = await User.aggregate(aggregationPipeline);
    }

    if (
      !data ||
      (Array.isArray(data) && data.length === 0) ||
      (data.docs && data.docs.length === 0)
    ) {
      return res.status(StatusCodes.OK).json({ success: true, data: [] });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Admins fetched successfully",
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

//@desc delete single admin
//@route DELETE 'api/admin/:id"
//@access Private :Superadmin

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ message: "Admin not found", success: false });
    }

    res
      .status(200)
      .json({ message: "Admin deleted successfully", success: true });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err?.message,
    });
  }
};

//@desc get allyears based on admin
//@route GET '/api/admin/get-year-based-admin"
//@access Private :Superadmin

export const allYears = async (req, res) => {
  try {
    const role = await Role.findOne({ role: "ADMIN" });
    if (!role) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Role 'ADMIN' not found.",
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
    console.log("err", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err?.message,
    });
  }
};

//@desc get single admin
//@route GET 'api/admin/:id"
//@access Private :Superadmin

export const getSingleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const userFound = await User.findOne({ _id: id });

    if (!userFound) {
      return res
        .status(404)
        .json({ message: "Admin not found", success: false });
    }

    res.status(200).json({
      message: "Admin deleted successfully",
      success: true,
      data: userFound,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: [],
      message: err?.message,
    });
  }
};

// @desc Put Update admin
// @route POST '/api/admin/update/:id'
// @access Private: Superadmin

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    let updatedData = req.body;

    if (updatedData.email !== req.user.email) {
      const userFound = await User.findOne({
        email: updatedData.email,
        _id: { $ne: id },
      });
      if (userFound) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:
            "User already exist with this email id please change your email",
        });
      }
    }
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
