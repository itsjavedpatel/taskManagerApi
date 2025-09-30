const { Router } = require("express");
const userRouter = Router();
const {
  register,
  loginUser,
  createBoard,
  addMember,
  createColumn,
  addTask,
  fetchBoard,
  fetchAllBoardForUser,
  updateTaskAdmin,
  updateTaskStatusUser,
  deleteTask,
  deleteBoard,
  removeMember,
  groupChat,
  fetchChat,
} = require("../controllers/userControllers");
const { passwordValidators } = require("../utils/passwordValidators");
const { authUser } = require("../middlewares/authUser");

// user login register
userRouter.post("/register", passwordValidators, register);
userRouter.post("/login", loginUser);

// creating board ,and column and add member, remove member
userRouter.post("/createboard", authUser, createBoard);
userRouter.post("/addmember/:boardId", authUser, addMember);
userRouter.post("/createcolumn/:boardId", authUser, createColumn);
userRouter.delete("/deleteboard/:boardId", authUser, deleteBoard);
userRouter.patch("/:boardId/remove/:userId", authUser, removeMember);
// fetchinng data about boards
userRouter.get("/fetchboard/:boardId", authUser, fetchBoard);
userRouter.get("/fetchallboards", authUser, fetchAllBoardForUser);

// adding and delete tasks
userRouter.post("/addtask/:columnId", authUser, addTask);
userRouter.delete("/deletetask/:taskId", authUser, deleteTask);

// updatingg task
userRouter.patch("/updatetaskadmin/:taskId", authUser, updateTaskAdmin);
userRouter.patch("/updatetaskuser/:taskId", authUser, updateTaskStatusUser);

// group chat for board
userRouter.post("/chat/:boardId", authUser, groupChat);
userRouter.get("/getchat/:boardId", authUser, fetchChat);

module.exports = { userRouter };
  