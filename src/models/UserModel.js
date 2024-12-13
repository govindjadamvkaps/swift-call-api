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
    avatar: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      required: true,
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

userSchema.plugin(aggregatePaginate);
const User = mongoose.model("user", userSchema);

export default User;
