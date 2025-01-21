import express from "express";
import verifyToken from "../middleware/auth.js";
import checkAdmin from "../middleware/checkAdmin.js";
import {
  changePermissions,
  getAllPermissions,
} from "../controllers/permissionController.js";
import checkSuperadmin from "../middleware/checkSuperadmin.js";
const PermissionRouter = express.Router();

PermissionRouter.get(
  "/all-permissions",
  verifyToken,
  checkSuperadmin,
  getAllPermissions
);

PermissionRouter.patch(
  "/change-permissions",
  verifyToken,
  checkSuperadmin,
  changePermissions
);

export default PermissionRouter;
