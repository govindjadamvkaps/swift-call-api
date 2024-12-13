import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    timeDuration: {
      type: Number,
      default: 0,
    },
    callCount: {
      type: Number,
      default: 1,
    },
   
  },
  {
    timestamps: true,
  }
);

callSchema.pre("save", function (next) {
  if (this.users.length !== 2) {
    next(new Error("A call must have exactly two users"));
  } else {
    next();
  }
});

const Call = mongoose.model("Call", callSchema);

export default Call;
