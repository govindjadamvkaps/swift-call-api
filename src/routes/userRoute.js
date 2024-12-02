import express from 'express'
import { getAllUsers, login, registerUser, updateUser } from '../controllers/userController.js'
import { validateLogin, validateSignup } from '../middleware/validate.js';
import { upload } from '../utils/multer.js';
import verifyToken from '../middleware/auth.js';
import checkAdmin from '../middleware/checkAdmin.js';

const UserRouter = express.Router()

UserRouter.post('/signup', validateSignup, registerUser)

UserRouter.post('/login', validateLogin, login)

UserRouter.put('/update/:id', upload.single('avatar'), updateUser)

UserRouter.get('/get-all-users',verifyToken, checkAdmin, getAllUsers)

export default UserRouter;