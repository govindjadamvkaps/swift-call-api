import mongoose from "mongoose";
const PermissionSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  permissionType: {
    type: String,
    required: true,
  },
});

const permissionModal = mongoose.model("Permission", PermissionSchema);

export default permissionModal;
