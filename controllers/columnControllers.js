const { Board } = require("../models/board");
const { Column } = require("../models/column");

// add column to the board
const createColumn = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    const columnName = req.body.name;
    const user = req.user;
    const userId = user._id;

    if (!columnName) {
      return res.status(400).json({
        message: "column is not added..",
        error: "columnName is required",
        success: false,
      });
    }
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: "column is not added..",
        error: "Board not found",
        success: false,
      });
    }

    if (board.ownerId.toString() !== userId.toString()) {
      return res.status(404).json({
        message: "Column is not added..",
        error: "You are not authorized to add column in this board",
        success: false,
      });
    }

    // all conditions are met so create column now
    const newColumn = await Column.create({
      columnName,
      board: board._id,
    });
    return res.status(201).json({
      message: "Column is Added in the board..",
      error: null,
      success: true,
      column: newColumn,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Column is not added!! server error",
      error: error.message,
      success: false,
    });
  }
};

module.exports = { createColumn };
