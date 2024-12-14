import express from "express";
import {
  addCall,
  addUser,
  getCallDetails,
  getDetails,
} from "../controllers/callController.js";
import verifyToken from "../middleware/auth.js";
import checkAdmin from "../middleware/checkAdmin.js";

const CallRoutes = express.Router();

CallRoutes.post("/add-user", addUser);

CallRoutes.post("/add-call", addCall);

CallRoutes.get("/get-call-details",verifyToken, checkAdmin, getCallDetails);

CallRoutes.get(
  "/get-dashboard-page-details",
  verifyToken,
  checkAdmin,
  getDetails
);

export default CallRoutes;
