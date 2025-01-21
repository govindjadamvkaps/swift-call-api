import mongoose, { mongo } from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["ADMIN", "USER", "SUPER-ADMIN"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model("role", roleSchema);

export default Role;
