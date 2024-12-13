import express from "express";
import {
  allYears,
  deleteUser,
  forgotPassword,
  getAllUsers,
  getUserProfile,
  login,
  registerUser,
  resetPassword,
  updateUser,
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

const UserRouter = express.Router();

UserRouter.post("/signup", validateSignup, registerUser);

UserRouter.post("/login", validateLogin, login);

UserRouter.delete("/:id", verifyToken, checkAdmin, deleteUser);

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

UserRouter.get("/get-all-users", verifyToken, checkAdmin, getAllUsers);

UserRouter.get("/user-profile", verifyToken, getUserProfile);

UserRouter.get("/get-year-based-onUsers", verifyToken, checkAdmin, allYears);

UserRouter.post("/forgot-password", forgotPassword);

UserRouter.post("/reset-password", resetPassword);

export default UserRouter;
