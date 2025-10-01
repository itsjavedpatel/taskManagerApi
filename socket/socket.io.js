const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const { Board } = require("../models/Board");
const { Notification } = require("../models/Notification");
const { BoardNotification } = require("../models/BoardNotification");
const mongoose = require("mongoose");
const onlineUsers = new Map();

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    let token;

    if (socket.handshake.auth?.token) token = socket.handshake.auth.token;
    else if (socket.handshake.headers?.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies.token;
    }

    if (!token) return next(new Error("Unauthorized: No token"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.userId };
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    onlineUsers.set(userId, socket.id);

    console.log(`User connected: ${userId}, socketId: ${socket.id}`);
    console.log("Current online users:", onlineUsers);

    socket.join(userId);

    // send notification which are not delivered
    Notification.find({ reciever: userId, status: "sent" })
      .select("-__v -updatedAt")
      .then((notifications) => {
        notifications.forEach(async (notification) => {
          socket.emit("notification", notification);
          notification.status = "delivered";
          await notification.save();
        });
      });

    socket.on("joinboard", async (boardId) => {
      try {
        // find board
        const board = await Board.findById(boardId).select("-__v -updatedAt");

        // console.log("User wanted to join the board", socket.user.id);
        if (!board) {
          socket.emit("error", { message: "Board not found" });
        }

        // now find that user is a memebr of the board or not
        const isMember =
          board.ownerId.toString() === userId ||
          board.members.some((m) => m.toString() === userId);

        if (!isMember) {
          socket.emit("error", { message: "Board not found" });
        }
        socket.join(boardId);
        socket.emit("joinedboard", { boardId, message: "Board is joined" });

        // find unread message for this user for the board
        BoardNotification.find({
          boardId: new mongoose.Types.ObjectId(boardId),
          $nor: [{ sender: userId }],
          recipients: { $elemMatch: { user: userId, status: "sent" } },
        }).then((notifications) => {
          // console.log(notifications);
          notifications.forEach(async (notification) => {
            socket.emit("boardNotification", {
              message: notification.message,
              from: notification.sender,
            });
            await BoardNotification.updateMany(
              { recipients: { $elemMatch: { user: userId, status: "sent" } } },
              {
                $set: {
                  "recipients.$.status": "delivered",
                  "recipients.$.deliveredAt": new Date(),
                },
              }
            );
          });
        });
      } catch (error) {
        console.log(error);
        socket.emit("error", {
          message: "Error in joining board",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}, socketId: ${socket.id}`);

      if (onlineUsers.has(userId)) {
        onlineUsers.delete(userId);
      }
    });
  });

  return io;
}

// Get io instance in controllers
function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initializeSocket, getIO, onlineUsers };
