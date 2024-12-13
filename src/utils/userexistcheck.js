import User from "../models/UserModel.js";

export async function findOrCreateUser(ip) {
  let user = await User.findOne({ ip: ip });
  if (!user) {
    user = new User({
      name: "guest",
      ip: ip,
    });
    await user.save();
  }
  return user;
}
