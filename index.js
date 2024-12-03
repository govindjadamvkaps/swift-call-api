import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from 'path'
import { fileURLToPath } from 'url'
import cors from "cors";
import './src/db/connectDB.js'
import UserRouter from "./src/routes/userRoute.js";
import socketHandler from "./src/utils/socket.js";


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express();
const port = process.env.PORT;

// Enable CORS for all routes
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use('/public', express.static(path.join(__dirname, './public')))

app.use('/api/user', UserRouter)

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
socketHandler(server)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
