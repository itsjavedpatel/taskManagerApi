const { Router } = require("express");
const { authUser } = require("../middlewares/authUser");
const { createColumn } = require("../controllers/columnControllers");
const columnRouter = Router();

columnRouter.post("/createcolumn/:boardId", authUser, createColumn);

module.exports = { columnRouter };
