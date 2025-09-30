const mongoose = require("mongoose");

const boardNotificationSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipients: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deliveredAt: {
          type: Date,
        },
        readAt: {
          type: Date,
        },
        status: {
          type: String,
          enum: ["sent", "delivered", "read"],
          default: "sent",
        },
      },
    ],
  },
  { timestamps: true }
);
boardNotificationSchema.index({
  boardId: 1,
  "reciepants.user": 1,
  "reciepants.status": 1,
});

const BoardNotification = mongoose.model(
  "BoardNotification",
  boardNotificationSchema
);

module.exports = { BoardNotification };
