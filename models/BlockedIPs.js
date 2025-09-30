const mongoose = require("mongoose");

const blockedIPsSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

blockedIPsSchema.index({ ipAddress: 1, email: 1 }, { unique: true });
const BlockedIP = mongoose.model("BlockedIP", blockedIPsSchema);
module.exports = { BlockedIP };
