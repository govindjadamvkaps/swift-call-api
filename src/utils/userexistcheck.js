import User from "../models/UserModel.js";

export async function findOrCreateUser(username) {
  console.log("username", username);
  let user = await User.findOne({ username: username });
  console.log("user", user);
  if (!user) {
    user = new User({
      name: "guest",
      username: username,
    });
    await user.save();
  }
  return user;
}
