import User from "../models/UserModel.js";

export async function findOrCreateUser(username) {
  let user = await User.findOne({ _id: username });

  if (!user) {
    user = new User({
      name: "guest",
    });
    await user.save();
  }
  return user;
}
