import { StatusCodes } from "http-status-codes";
import permissionModal from "../models/PermissionModel.js";

const permissionCheck = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const userPermit = await permissionModal.findOne({
        permissionType: requiredRole,
      });

      if (req.user?.permission?.includes(userPermit._id)) {
        next();
      } else {
        throw new Error();
      }
    } catch (err) {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "unAuthorized" });
    }
  };
};

export default permissionCheck;
