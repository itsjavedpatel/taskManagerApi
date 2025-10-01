const { Router } = require("express");
const { authUser } = require("../middlewares/authUser");
const {
  generateReportBoard,
  createBoard,
  fetchAllBoardForUser,
  fetchBoard,
  fetchChat,
  groupChat,
  deleteBoard,
  addMember,
  removeMember,
} = require("../controllers/boardControllers");

const boardRouter = Router();

// fetchinng data about boards
boardRouter.get("/fetchboard/:boardId", authUser, fetchBoard);
boardRouter.get("/fetchallboards", authUser, fetchAllBoardForUser);

boardRouter.delete("/deleteboard/:boardId", authUser, deleteBoard);

boardRouter.post("/addmember/:boardId", authUser, addMember);
boardRouter.patch("/:boardId/remove/:userId", authUser, removeMember);

// group chat for board
boardRouter.post("/chat/:boardId", authUser, groupChat);
boardRouter.get("/getchat/:boardId", authUser, fetchChat);

boardRouter.get("/generate-pdf/:boardId", authUser, generateReportBoard);
boardRouter.post("/createboard", authUser, createBoard);

module.exports = { boardRouter };
