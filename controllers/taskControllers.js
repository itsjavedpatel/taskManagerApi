const PDFDocument = require("pdfkit");
const { User } = require("../models/user");
const { Board } = require("../models/board");
const { Task } = require("../models/task");
const { Column } = require("../models/column");
const mongoose = require("mongoose");
const { getIO, onlineUsers } = require("../socket/socket.io");
const { Notification } = require("../models/notification");

const addTask = async (req, res) => {
  try {
    const columnId = req.params.columnId;

    const { title, assignedToEmail, description, dueDate, priority } = req.body;
    const user = req.user;
    const userId = user._id;
    let date = dueDate ? new Date(dueDate) : "";
    if (!title || !assignedToEmail || !dueDate) {
      if (!title)
        return res.status(400).json({
          message: "task is not added..",
          error: "title is required",
          success: false,
        });
      if (!assignedToEmail)
        return res.status(400).json({
          message: "task is not added..",
          error: "Assigned user email is required",
          success: false,
        });
      if (!dueDate)
        return res.status(400).json({
          message: "task is not added..",
          error: "dueDate is required",
          success: false,
        });
    }
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        message: "task is not added..",
        error: "column not found",
        success: false,
      });
    }
    const findAssignedUser = await User.findOne({
      email: assignedToEmail,
    }).select("-password -__v -updatedAt");
    if (!findAssignedUser)
      return res.status(404).json({
        message: "task is not added..",
        error: "User not registered",
        success: false,
      });
    const board = await Board.findById(column.board);
    if (!board.members.includes(findAssignedUser._id))
      return res.status(404).json({
        message: "task is not added..",
        error: "User is not a board member",
        success: false,
      });
    if (board.ownerId.toString() !== userId.toString()) {
      return res.status(404).json({
        message: "task is not added..",
        error: "You are not authorized to add task in this column",
        success: false,
      });
    }

    // all conditions are met so create task now

    const newTask = await Task.create({
      title,
      assignedTo: findAssignedUser._id,
      column: column._id,
      createdBy: userId,
      description,
      dueDate: date,
      priority,
    });
    // create a notification
    const notification = await Notification.create({
      message: `A new Task "${newTask.title}" has been assigned to you`,
      sender: userId,
      reciever: findAssignedUser._id,
    });

    // notify the assigned user
    const { getIO, onlineUsers } = require("../socket/socket.io");
    const io = getIO();

    if (onlineUsers.has(findAssignedUser._id.toString())) {
      io.to(onlineUsers.get(findAssignedUser._id.toString())).emit(
        "notification",
        notification
      );

      notification.status = "delivered";
      await notification.save();
    }

    return res.status(201).json({
      message: "Task is Added in the column..",
      error: null,
      success: true,
      task: newTask,
    });
  } catch (error) {
    return res.status(500).json({
      message: "task is not added!! server error",
      error: error.message,
      success: false,
    });
  }
};

// delete tasks
const deleteTask = async (req, res) => {
  try {
    const user = req.user;
    const taskId = new mongoose.Types.ObjectId(req.params.taskId);

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      createdBy: user._id,
    });

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task is not deleted...",
        error: "Task not found..",
        success: false,
      });
    }
    const { getIO, onlineUsers } = require("../socket/socket.io");
    const io = getIO();
    // create notification
    const notification = await Notification.create({
      message: `Task "${deletedTask.title} has been deleted by admin"`,
      sender: req.user._id,
      reciever: deletedTask.assignedTo,
    });

    // emit notification to assigned user that task is deleted
    if (onlineUsers.has(deletedTask.assignedTo.toString())) {
      io.to(onlineUsers.get(deletedTask.assignedTo.toString())).emit(
        "notification",
        notification
      );
      notification.status = "delivered";
      await notification.save();
    }
    return res.status(200).json({
      message: "Task is deleted Successfully...",
      error: null,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Its not you its us!! Server Error",
      error: error.message,
      success: false,
    });
  }
};

// update task by admin
const updateTaskAdmin = async (req, res) => {
  try {
    const io = getIO();
    const user = req.user;

    const taskId = new mongoose.Types.ObjectId(req.params.taskId);
    const { status, description, assignedToEmail, dueDate, title, priority } =
      req.body;
    let updates = {};
    if (title) {
      updates.title = title;
    }
    if (description) {
      updates.description = description;
    }
    if (dueDate) {
      updates.dueDate = new Date(dueDate);
    }
    if (status) {
      updates.status = status;
    }
    if (priority) {
      updates.priority = priority;
    }
    if (assignedToEmail) {
      const findAssignedUser = await User.findOne({
        email: assignedToEmail,
      }).select("-password -__v -updatedAt");
      if (!findAssignedUser)
        return res.status(404).json({
          message: "task is not added..",
          error: "User not registered",
          success: false,
        });
      const board = await Board.findOne({
        ownerId: user._id,
        members: { $in: [findAssignedUser._id] },
      });
      if (!board)
        return res.status(404).json({
          message: "task is not updated..",
          error: "User is not a board member",
          success: false,
        });

      updates.assignedTo = findAssignedUser._id;
    }
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, createdBy: user._id },
      {
        $set: updates,
      },
      { new: true }
    ).select("-__v -updatedAt");
    if (!updatedTask)
      return res.status(400).json({
        message: "Unable to update task",
        error: "Task not Found",
        success: false,
      });

    // create notification
    const notification = await Notification.create({
      message: `Task "${updatedTask.title}" has been updated by admin"`,
      sender: req.user._id,
      reciever: updatedTask.assignedTo,
    });

    // emit notification now
    if (onlineUsers.has(updatedTask.assignedTo.toString())) {
      io.to(onlineUsers.get(updatedTask.assignedTo.toString())).emit(
        "notification",
        notification
      );
      notification.status = "delivered";
      await notification.save();
    }
    return res.status(200).json({
      message: "Task is updates successfully",
      task: updatedTask,
      error: null,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update Task",
      error: error.message,
      success: false,
    });
  }
};

// update task by user
const updateTaskStatusUser = async (req, res) => {
  try {
    const io = getIO();
    const user = req.user;
    const taskId = new mongoose.Types.ObjectId(req.params.taskId);
    const { status } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: taskId,
        assignedTo: user._id,
      },
      {
        $set: {
          status,
        },
      },
      {
        new: true,
      }
    ).select("-__v -updatedAt");
    if (!updatedTask) {
      return res.status(404).json({
        message: "Task status is not updated",
        error: "Task not Found",
        success: false,
      });
    }
    // emit notification
    const notification = await Notification.create({
      message: `${req.user.name} updated task "${updatedTask.title}" to ${updatedTask.status}`,
      sender: req.user._id,
      reciever: updatedTask.createdBy,
    });

    if (onlineUsers.has(updatedTask.createdBy.toString())) {
      io.to(onlineUsers.get(updatedTask.createdBy.toString())).emit(
        "notification",
        notification
      );

      (notification.status = "delivered"), await notification.save();
    }

    return res.status(200).json({
      message: "Task status is updated",
      error: null,
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update Task",
      error: error.message,
      success: false,
    });
  }
};

// generate report for user's all tasks progress

const generateTaskReport = async (req, res) => {
  try {
    const user = req.user;
    // TODO
    // fetch all tasks which he has to do
    // generate pdf report

    const tasks = await Task.aggregate([
      {
        $match: {
          assignedTo: req.user._id,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByDetails",
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "columns",
          localField: "column",
          foreignField: "_id",
          as: "columnDetails",
          pipeline: [
            {
              $lookup: {
                from: "boards",
                localField: "board",
                foreignField: "_id",
                as: "boardDetails",
                pipeline: [
                  {
                    $project: {
                      boardName: 1,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                columnName: 1,
                boardDetails: { $first: "$boardDetails" },
              },
            },
          ],
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          columnDetails: { $first: "$columnDetails" },
          status: 1,
          createdBy: { $first: "$createdByDetails" },
          dueDate: 1,
          priority: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
    ]);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const filename = `taskreport${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment;filname="${filename}"`);

    doc
      .fontSize(24)
      .text(`Task Progress Report`, { align: "center", underline: 1 });
    doc.moveDown(2);

    tasks.forEach((task, idx) => {
      doc.fontSize(19).text(`S.No: ${idx + 1}`, { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(19)
        .text(`Board:${task.columnDetails.boardDetails.boardName}`);
      doc.moveDown(0.5);
      doc.fontSize(18).text(`Project: ${task.columnDetails.columnName}`);
      doc.moveDown(0.5);

      doc.fontSize(16).text(`Task:${task.title}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Created On:${task.createdAt.toLocaleString()}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Description:${task.description}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Status:${task.status}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Priority:${task.priority}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Created by:${task.createdBy.name}`);
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Due-date :${task.dueDate?.toLocaleString()}`);
      doc.moveDown(0.5);
      if (task.status === "Completed") {
        doc
          .fontSize(16)
          .text(`Task completed on :${task.updatedAt?.toLocaleString()}`);
        doc.moveDown(0.5);
      }
      doc.moveDown(1);
    });

    doc.end();
    doc.pipe(res);

    // return res.status(200).json({
    //   message: " pdf is generated",
    //   error: null,
    //   success: true,
    //   tasks,
    // });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

module.exports = {
  addTask,
  updateTaskAdmin,
  updateTaskStatusUser,
  deleteTask,
  generateTaskReport,
};
