import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imageLocation = path.join(__dirname, "../../public/images");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageLocation);
  },
  filename: function (req, file, cb) {
    const fname = Date.now() + "-" + file.originalname;
    cb(null, fname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Invalid file type. Only PNG, JPEG, and JPG are allowed!"));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});
