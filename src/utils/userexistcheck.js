import User from "../models/UserModel.js";

export async function findOrCreateUser(username) {
  let user = await User.findOne({ username: username });
  if (!user) {
    user = new User({
      name: "guest",
      username: username,
    });
    await user.save();
  }
  return user;
}
