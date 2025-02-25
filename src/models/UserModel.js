import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    encryptPassword: {
      type: String,
    },
    avatar: {
      type: String,
      default: "",
    },
    username: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    permission: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      required: true,
    },
    ip: {
      type: String,
    },
    country: {
      type: String,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to format the name
userSchema.pre("save", function (next) {
  if (this.name) {
    this.name = this.name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  next();
});

// Generate Token
userSchema.methods.generateAuthToken = async function () {
  try {
    // console.log("token code")
    const token = await jwt.sign(
      { _id: this._id, email: this.email },
      process.env.SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );
    // this.tokens = this.tokens.concat({token:token})
    // await this.save()
    return token;
  } catch (error) {
    console.log("error in generating token", error);
  }
};
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  this.otp = otp;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
  return otp;
};
userSchema.plugin(aggregatePaginate);
const User = mongoose.model("user", userSchema);

export default User;
