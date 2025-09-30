const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    columnName: {
      type: String,
      required: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
  },
  { timestamps: true }
);

columnSchema.index({ board: 1 });
const Column = mongoose.model("Column", columnSchema);

module.exports = { Column };
