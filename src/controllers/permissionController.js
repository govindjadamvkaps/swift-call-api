import { StatusCodes } from "http-status-codes";
import permissionModal from "../models/PermissionModel.js";
import User from "../models/UserModel.js";

export const getAllPermissions = async (req, res) => {
  try {
    const allpermission = await permissionModal.find();

    return res.status(200).json({
      data: allpermission,
      success: true,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: [],
      success: false,
      message: err?.message,
    });
  }
};

export const changePermissions = async (req, res) => {
  try {
    let id = req.body._id;
    const permissions = req.body.permissions;
    const updatedUser = await User.findByIdAndUpdate(
      { _id: id },
      {
        permission: permissions,
      }
    );

    res.status(200).json({
      message: "Permission added successfully",
      success: true,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: [],
      success: false,
      message: error?.message,
    });
  }
};
