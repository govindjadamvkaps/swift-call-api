import 'dotenv/config'
import Role from '../models/RoleModel.js'
import connectDb from '../db/connectDB.js'
import User from '../models/UserModel.js'
import bcryptjs from 'bcryptjs';

const existingRole = await Role.find()
// console.log(!existingRole.length)

if (!existingRole.length) {
  const roles = [
    new Role({ role: 'ADMIN' }),
    new Role({ role: 'USER' }),
  ]
  await Role.insertMany(roles)
}

const adminRole = await Role.findOne({ role: 'ADMIN' })

const existingAdmin = await User.findOne({ role: adminRole._id })

if (!existingAdmin) {
  const hashPassword = bcryptjs.hashSync(process.env.ADMIN_PASSWORD, 10)
  const admin = new User({
    name: 'admin',
    email: process.env.ADMIN_EMAIL,
    password: hashPassword,
    role: adminRole._id,
    username:"ADMIN"
  })
  await admin.save()
}

console.log('Seeder Data insert successfully')