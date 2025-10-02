const mongoose = require("mongoose");
const { Board } = require("../models/board");
const { BoardNotification } = require("../models/boardNotification");
const { generateFullBoardHtml } = require("../utils/generateBoardReportHTML");
const puppeteer = require("puppeteer");
const { User } = require("../models/user");

const createBoard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Board is not created",
        error: "Name is required",
        success: false,
      });
    }
    // TODO
    // create board document
    // store userId inside it

    const newBoard = await Board.create({
      boardName: name,
      ownerId: userId,
      members: [userId],
    });
    // push owner inside member also

    return res.status(201).json({
      message: "Board is created successfully",
      error: null,
      success: true,
      board: newBoard,
    });
  } catch (error) {
    return res.status(500).json({
      message: "login Failed!! server error",
      error: error.message,
      success: false,
    });
  }
};

const fetchBoard = async (req, res) => {
  try {
    const user = req.user;
    const boardId = new mongoose.Types.ObjectId(req.params.boardId);
    // console.log(boardId);
    // console.log(user._id);

    const boardDetails = await Board.aggregate([
      {
        $match: {
          _id: boardId,
          $or: [{ ownerId: user._id }, { members: { $in: [user._id] } }],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "memberDetails",
          pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
        },
      },
      {
        $lookup: {
          from: "columns",
          let: {
            boardOwner: "$ownerId",
            boardId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$board", "$$boardId"],
                },
              },
            },
            {
              $lookup: {
                from: "tasks",
                let: {
                  boardOwner: "$$boardOwner",
                  columnId: "$_id",
                  currentUser: user._id,
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $eq: ["$column", "$$columnId"],
                          },
                          {
                            $or: [
                              {
                                $eq: ["$$currentUser", "$$boardOwner"],
                              },
                              {
                                $eq: ["$assignedTo", "$$currentUser"],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      title: 1,
                      description: 1,
                      status: 1,
                      dueDate: 1,
                      priority: 1,
                      assignedTo: 1,
                      createdBy: 1,
                      createdAt: 1,
                    },
                  },
                ],
                as: "tasksDetails",
              },
            },
            {
              $project: {
                columnName: 1,
                tasksDetails: 1,
              },
            },
          ],
          as: "columnDetails",
        },
      },
      {
        $project: {
          boardName: 1,
          ownerId: 1,
          memberDetails: 1,
          columnDetails: 1,
        },
      },
    ]);

    return res.status(200).json({
      message: "board fetched successfully",
      error: null,
      success: true,
      boardDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went Wrong! server error",
      error: error.message,
      success: false,
    });
  }
};

const fetchAllBoardForUser = async (req, res) => {
  try {
    const user = req.user;

    const boards = await Board.aggregate([
      {
        $match: {
          $or: [{ ownerId: user._id }, { members: { $in: [user._id] } }],
        },
      },
      {
        $project: {
          boardName: 1,
          ownerId: 1,
        },
      },
    ]);
    res.status(200).json({
      message: "Boards are fetched successfully",
      error: null,
      success: true,
      boards,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something Went Wrong!! Server Error",
      error: error.message,
      success: false,
    });
  }
};

// need to generate pdf reports for the board projects(means column) for all task progress

const generateReportBoard = async (req, res) => {
  try {
    const user = req.user;
    const boardId = new mongoose.Types.ObjectId(req.params.boardId);

    // TODO:-
    // find the board
    // get all columns
    // get all task inside each columns
    // get userDetails who performed that task

    const boardDetails = await Board.aggregate([
      {
        $match: {
          _id: boardId,
          ownerId: user._id,
        },
      },

      {
        $lookup: {
          from: "columns",
          localField: "_id",
          foreignField: "board",
          as: "columnDetails",
          pipeline: [
            {
              $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "column",
                as: "taskDetails",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "assignedTo",
                      foreignField: "_id",
                      as: "assignedToDetails",
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
                    $project: {
                      title: 1,
                      status: 1,
                      priority: 1,
                      createdAt: 1,
                      dueDate: 1,
                      updatedAt: 1,
                      assignedTo: { $first: "$assignedToDetails" },
                      completedOn: 1,
                    },
                  },
                ],
              },
            },

            {
              $project: {
                columnName: 1,
                createdAt: 1,
                taskDetails: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          boardName: 1,
          ownerId: 1,
          createdAt: 1,
          columnDetails: 1,
        },
      },
    ]);
    //! How to generate image using puppeter
    // TODO:-
    // Launch Puppeteer
    // creata a page
    // Generate HTML for specific layout
    // Set content inside th page
    // Generate screenshot as a buffer for image
    // close the Puppeteer
    // set the header of response to image/png
    // send the image buffer in response

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const html = generateFullBoardHtml(boardDetails);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({ type: "png", fullPage: true });

    await browser.close();

    res.set({
      "Content-Type": "image/png",
    });
    res.send(buffer);

    // const pdfBuffer = await page.pdf({
    //   format: "A4",
    //   printBackground: true,
    //   margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    // });

    // res.set({
    //   'Content-Type': 'application/pdf',
    //   'Content-Disposition': `attachment; filename="TaskReport.pdf"`,
    //   'Content-Length': pdfBuffer.length,
    // });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

const generateFullReport = async (req, res) => {
  try {
    const user = req.user;
    const boardDetails = await Board.aggregate([
      {
        $match: {
          ownerId: user._id,
        },
      },
      {
        $lookup: {
          from: "columns",
          localField: "_id",
          foreignField: "board",
          as: "columnDetails",
          pipeline: [
            {
              $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "column",
                as: "taskDetails",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "assignedTo",
                      foreignField: "_id",
                      as: "assignedToDetails",
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
                    $project: {
                      title: 1,
                      assignedTo: { $first: "$assignedToDetails" },
                      createdAt: 1,
                      status: 1,
                      completedOn: 1,
                      updatedAt: 1,
                      description: 1,
                      dueDate: 1,
                      priority: 1,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                columnName: 1,
                taskDetails: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },

      {
        $project: {
          boardName: 1,
          columnDetails: 1,
          createdAt: 1,
        },
      },
    ]);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const html = generateFullBoardHtml(boardDetails);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({ type: "png", fullPage: true });

    await browser.close();
    res.set({ "Content-Type": "image/png" });
    res.send(buffer);

    // res.status(200).json({
    //   message: "Fetched Successfully",
    //   boardDetails,
    //   error: null,
    //   success: true,
    // });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

// delete board
const deleteBoard = async (req, res) => {
  try {
    const user = req.user;
    const boardId = new mongoose.Types.ObjectId(req.params.boardId);
    const board = await Board.findOne({ ownerId: user._id, _id: boardId });
    if (!board) {
      return res.status(404).json({
        message: "Board is not deleted!!",
        error: "Board Not Found",
        success: false,
      });
    }
    // TODO
    // first get all the columns ids  belong to that board
    // second delete  all the task where each columnId matches
    // then delete all column where boardId matches
    // then delete the board

    const columnns = await Column.find({ board: boardId }).select("_id");

    const columnIds = columnns.map((el) => el._id);

    await Task.deleteMany({ column: { $in: columnIds } });

    await Column.deleteMany({ _id: { $in: columnIds } });

    await Board.deleteOne({ _id: boardId });

    return res.status(200).json({
      message: "Board is deleted Successfully",
      error: null,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Board is not deleted!! Server Error",
      error: error.message,
      success: false,
    });
  }
};

// add memebers to the board
const addMember = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const { boardId } = req.params;

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Member is not added..",
        error: "Email is required",
        success: false,
      });
    }
    if (email === user.email) {
      return res.status(409).json({
        message: "Member is not added..",
        error: "Owner is already added..",
        success: false,
      });
    }
    // find user in db
    const userFound = await User.findOne({ email }).select(
      "-password -__v -activeToken -updatedAt"
    );
    if (!userFound) {
      return res.status(404).json({
        message: "Member is not added..",
        error: "Member not registered",
        success: false,
      });
    }
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: "Member is not added..",
        error: "Board not found",
        success: false,
      });
    }

    if (board.ownerId.toString() !== userId.toString()) {
      return res.status(404).json({
        message: "Member is not added..",
        error: "You are not authorized to add members in this board",
        success: false,
      });
    }

    if (board.members.includes(userFound._id)) {
      return res.status(409).json({
        message: "Member is not added..",
        error: "Member already added in this board",
        success: false,
      });
    }
    // all conditions are met so add now
    board.members.push(userFound._id);
    await board.save();

    const recipients = board.members.map((id) => {
      return { user: id };
    });
    // console.log(recipients);

    // create board notification
    const boardNotification = await BoardNotification.create({
      boardId,
      sender: userId,
      message: `${userFound.name} is added to the board by admin`,
      recipients,
    });

    const { getIO, onlineUsers } = require("../socket/socket.io");
    const io = getIO();

    board.members.forEach((memberId) => {
      const socketId = onlineUsers.get(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("boardNotification", {
          message: boardNotification.message,
          from: boardNotification.sender,
        });
        boardNotification.recipients = boardNotification.recipients.map((r) => {
          if (r.user.toString() === memberId.toString()) {
            r.status = "delivered";
            r.deliveredAt = new Date();
          }
          return r;
        });
      }
    });

    await boardNotification.save();
    return res.status(201).json({
      message: "Member is Added to the board..",
      error: null,
      success: true,
      board,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Member is not added!! server error",
      error: error.message,
      success: false,
    });
  }
};
// remove member from the board
const removeMember = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const boardId = new mongoose.Types.ObjectId(req.params.boardId);

    const board = await Board.findOneAndUpdate(
      { _id: boardId, ownerId: req.user._id },
      {
        $pull: {
          members: userId,
        },
      },
      { new: true }
    );

    const columns = await Column.find({ board: boardId }).select("_id");
    const columnIds = columns.map((itm) => itm._id);

    // update all the task where this user in curr board has
    await Task.updateMany(
      {
        createdBy: req.user._id,
        assignedTo: userId,
        column: {
          $in: columnIds,
        },
      },
      {
        $set: {
          assignedTo: null,
        },
      }
    );

    if (!board) {
      return res.status(404).json({
        message: "Member isn't removed..",
        error: "Board not found...",
        success: false,
      });
    }

    const { getIO, onlineUsers } = require("../socket/socket.io");
    const io = getIO();
    // create board notification
    const recipients = board.members.map((id) => {
      return { user: id };
    });
    const boardNotification = await BoardNotification.create({
      sender: board.ownerId,
      boardId: board._id,
      recipients,
      message: `A user has been removed by Admin from the board "${board.boardName}"`,
    });

    board.members.forEach((member) => {
      if (onlineUsers.has(member.toString())) {
        io.to(onlineUsers.get(member.toString())).emit("boardNotification", {
          message: boardNotification.message,
          board: board.boardName,
          user: userId,
        });
        boardNotification.recipients = boardNotification.recipients.map(
          (item) => {
            if (item.user.toString() === member.toString()) {
              (item.status = "delivered"), (item.deliveredAt = new Date());
            }
            return item;
          }
        );
      }
    });
    await boardNotification.save();

    return res.status(200).json({
      message: "Member is removed..",
      error: null,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Member isn't removed.. Server Error",
      error: error.message,
      success: false,
    });
  }
};

// chat in the board
const groupChat = async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;
    console.log(user._id);
    const { boardId } = req.params;
    if (!message)
      return res.status(400).json({
        message: "Message not sent",
        error: "Message is required...",
        success: false,
      });

    // find board
    const board = await Board.findOne({
      _id: boardId,

      $or: [
        {
          members: {
            $in: [user._id],
          },
        },
        { ownerId: user._id },
      ],
    });

    if (!board) {
      return res.status(404).json({
        message: "Message not sent",
        error: "Board not found...",
        success: false,
      });
    }
    const recipients = board.members.map((id) => {
      return {
        user: id,
      };
    });
    // create message
    const newMessage = await BoardNotification.create({
      sender: user._id,
      boardId,
      message,
      recipients,
    });

    // notify  the users about message

    const { getIO, onlineUsers } = require("../socket/socket.io");
    const io = getIO();
    board.members.forEach(async (memberId) => {
      const socketId = onlineUsers.get(memberId.toString());
      if (socketId && user._id.toString() !== memberId.toString()) {
        io.to(socketId).emit("boardNotification", {
          message: newMessage.message,
          from: newMessage.sender,
          name: user.name,
          board: board.name,
        });

        newMessage.recipients = newMessage.recipients.map((item) => {
          if (item.user.toString() === memberId.toString()) {
            (item.status = "delivered"), (item.deliveredAt = new Date());
          }
          return item;
        });
      }
    });

    await newMessage.save();

    return res.status(200).json({
      message: "message sent✅",
      success: true,
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error while sending message❗❌",
      error: error.message,
      success: false,
    });
  }
};

// fetch chat for user for board

const fetchChat = async (req, res) => {
  try {
    const user = req.user;
    const { boardId } = req.params;

    // find board
    const board = await Board.findOne({
      _id: boardId,
      members: {
        $in: [user._id],
      },
    });

    if (!board) {
      return res.status(404).json({
        message: "❌Unable to fetch chat...",
        error: "Board not found...",
        success: false,
      });
    }

    // now find all chats

    const chats = await BoardNotification.aggregate([
      {
        $match: {
          boardId: new mongoose.Types.ObjectId(boardId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderDetails",
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
        $project: {
          message: 1,
          senderDetails: { $first: "$senderDetails" },
          createdAt: 1,
          recipients: {
            $cond: [
              {
                $eq: ["$sender", user._id],
              },
              "$recipients",
              [],
            ],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      message: "Chat fetched successfully",
      error: null,
      success: true,
      chats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error while fetching chat",
      error: error.message,
      success: false,
    });
  }
};

module.exports = {
  generateReportBoard,
  createBoard,
  fetchBoard,
  fetchAllBoardForUser,
  deleteBoard,
  fetchChat,
  groupChat,
  addMember,
  removeMember,
  generateFullReport,
};
