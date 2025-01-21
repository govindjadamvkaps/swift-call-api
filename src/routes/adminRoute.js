import express from "express";
import verifyToken from "../middleware/auth.js";
import checkAdmin from "../middleware/checkAdmin.js";
import {
  allYears,
  deleteAdmin,
  getAllAdmins,
  getSingleAdmin,
  registerAdmin,
  updateAdmin,
} from "../controllers/adminController.js";
import { upload } from "../utils/multer.js";
import multer from "multer";
import { updateUser } from "../controllers/userController.js";
import { validateProfile } from "../middleware/validate.js";
import checkSuperadmin from "../middleware/checkSuperadmin.js";
const router = express.Router();

router.get("/get-all-admins", verifyToken, checkSuperadmin, getAllAdmins);
router.post(
  "/signup",
  verifyToken,
  checkSuperadmin,
  (req, res, next) => {
    upload.single("avatar")(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  registerAdmin
);

router.put(
  "/update/:id",
  verifyToken,
  checkSuperadmin,
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
  updateAdmin
);

router.delete("/:id", verifyToken, checkSuperadmin, deleteAdmin);
router.get("/admindata/:id", verifyToken, checkSuperadmin, getSingleAdmin);
router.get("/get-year-based-admin", verifyToken, checkSuperadmin, allYears);

export default router;
