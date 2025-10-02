const { Router } = require("express");
const { authUser } = require("../middlewares/authUser");
const {
  addTask,
  deleteTask,
  updateTaskAdmin,
  updateTaskStatusUser,
  generateTaskReport,
} = require("../controllers/taskControllers");

const taskRouter = Router();

// adding and delete tasks
taskRouter.post("/addtask/:columnId", authUser, addTask);
taskRouter.delete("/deletetask/:taskId", authUser, deleteTask);

// updatingg task
taskRouter.patch("/updatetaskadmin/:taskId", authUser, updateTaskAdmin);
taskRouter.patch("/updatetaskuser/:taskId", authUser, updateTaskStatusUser);

// generate tasks report
taskRouter.get("/generate-report-pdf/:userId", authUser, generateTaskReport);

module.exports = {
  taskRouter,
};
