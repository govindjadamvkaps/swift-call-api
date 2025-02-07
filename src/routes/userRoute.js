import express from "express";
import {
  allYears,
  dashboardGraphDetails,
  deleteUser,
  deleteUserByToken,
  forgotPassword,
  getAllUsers,
  getUserProfile,
  login,
  registerUser,
  resetPassword,
  updateUser,
  verifyOTP,
} from "../controllers/userController.js";
import {
  validateLogin,
  validateProfile,
  validateSignup,
} from "../middleware/validate.js";
import { upload } from "../utils/multer.js";
import verifyToken from "../middleware/auth.js";
import checkAdmin from "../middleware/checkAdmin.js";
import multer from "multer";
import checkBoth from "../middleware/checkAdmin.js";
import permissionCheck from "../middleware/permissionCheck.js";

const UserRouter = express.Router();

UserRouter.post("/signup", validateSignup, registerUser);

UserRouter.post("/login", validateLogin, login);

//need to chANGE IN THIS API
UserRouter.delete(
  "/:id",
  verifyToken,
  checkBoth,
  permissionCheck("delete"),
  deleteUser
);

UserRouter.put(
  "/update",
  verifyToken,
  validateProfile,
  (req, res, next) => {
    upload.single("avatar")(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  updateUser
);
//need to chANGE IN THIS API
UserRouter.get(
  "/get-all-users",
  verifyToken,
  checkBoth,
  permissionCheck("view"),
  getAllUsers
);

UserRouter.get("/user-profile", verifyToken, getUserProfile);

UserRouter.get("/get-year-based-onUsers", verifyToken, allYears);

UserRouter.post("/forgot-password", forgotPassword);

UserRouter.post("/reset-password", resetPassword);

UserRouter.get(
  "/dashboard-graph-details",
  verifyToken,
  checkBoth,
  dashboardGraphDetails
);

UserRouter.post("/verify-otp", verifyOTP);

UserRouter.delete("/user/delete-user", verifyToken, deleteUserByToken);

export default UserRouter;
