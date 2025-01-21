import "dotenv/config";
import Role from "../models/RoleModel.js";
import connectDb from "../db/connectDB.js";
import User from "../models/UserModel.js";
import bcryptjs from "bcryptjs";
import permissionModal from "../models/PermissionModel.js";

const existingRole = await Role.find();
const existPermission = await permissionModal.find();
// console.log(!existingRole.length)

if (!existingRole.length) {
  const roles = [
    new Role({ role: "ADMIN" }),
    new Role({ role: "USER" }),
    new Role({ role: "SUPER-ADMIN" }),
  ];
  await Role.insertMany(roles);
}

if (!existPermission.length) {
  const permissions = [
    new permissionModal({
      name: "user",
      permissionType: "view",
    }),
    new permissionModal({
      name: "user",
      permissionType: "create",
    }),
    new permissionModal({
      name: "user",
      permissionType: "edit",
    }),
    new permissionModal({
      name: "user",
      permissionType: "delete",
    }),
  ];

  await permissionModal.insertMany(permissions);
}
const totalPermission = await permissionModal.find({});
const adminRole = await Role.findOne({ role: "SUPER-ADMIN" });
const existingAdmin = await User.findOne({ role: adminRole._id });

if (!existingAdmin) {
  const hashPassword = bcryptjs.hashSync(process.env.ADMIN_PASSWORD, 10);
  const admin = new User({
    name: "super-admin",
    email: process.env.ADMIN_EMAIL,
    password: hashPassword,
    role: adminRole._id,
    username: "super-admin",
    permission: totalPermission,
  });

  await admin.save();
}

console.log("Seeder Data insert successfully");
