import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import "./src/db/connectDB.js";
import UserRouter from "./src/routes/userRoute.js";
import CallRoutes from "./src/routes/callRoute.js";
import AdminRoutes from "./src/routes/adminRoute.js";
import { initializeSocket } from "./src/utils/socketData.js";
import PermissionRouter from "./src/routes/permissionRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static(path.join(__dirname, "./public")));

app.use("/api/user", UserRouter);
app.use("/api/permission", PermissionRouter);
app.use("/api/call", CallRoutes);
app.use("/api/admin", AdminRoutes);

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ success: true, message: "Socket API is running new code!!!" });
});

app.get("/api/socket", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Socket API is running with new code testing",
  });
});

const server = createServer(app);
initializeSocket(server);
// socketHandler(server);
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
