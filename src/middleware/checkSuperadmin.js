import { StatusCodes } from "http-status-codes";
const checkSuperadmin = (req, res, next) => {
  try {
    if (req.user && req.user.role.role === "SUPER-ADMIN") {
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

export default checkSuperadmin;
