const { validationResult } = require("express-validator");
const PDFDocument = require("pdfkit");
const { User } = require("../models/user");
const { Board } = require("../models/board");
const { Task } = require("../models/task");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Column } = require("../models/column");
const mongoose = require("mongoose");
const { getIO, onlineUsers } = require("../socket/socket.io");
const { Notification } = require("../models/notification");
const { BoardNotification } = require("../models/boardNotification");

// register  user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("inside");
      return res.status(400).json({
        message: "Registeration Failed!!",
        error: errors.array(),
        success: false,
        data: {},
      });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      if (!name)
        return res.status(400).json({
          message: "Registeration Failed",
          error: "name is required",
          success: false,
        });
      if (!email)
        return res.status(400).json({
          message: "Registeration Failed",
          error: "email is required",
          success: false,
        });
      if (!password)
        return res.status(400).json({
          message: "Registeration Failed",
          error: "password is required",
          success: false,
        });
    }
    // check for already registered user
    const isRegisteredAlready = await User.findOne({ email }).select(
      "-password -refreshToken"
    );
    console.log(isRegisteredAlready);
    if (isRegisteredAlready)
      return res.status(409).json({
        message: "Registeration Failed!!",
        error: "User Already exists",
        success: false,
        data: {},
      });
    //   new user
    const hashedPassword = await bcrypt.hash(password, 10);
    // create user into the db

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      data: {},
    });
    await newUser.save();

    return res.status(201).json({
      message: "Registeration successfull",
      error: null,
      success: true,
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      message: "Registeration Failed!! server error",
      error: error.message,
      success: false,
      data: {},
    });
  }
};
// login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "login failed",
        error: "Email and password are required",
        success: false,
      });
    }
    // find in db

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(404).json({
        message: "login failed",
        error: "User not found",
        success: false,
      });
    }
    if (findUser.isBlocked) {
      return res.status(404).json({
        message: "login failed",
        error: "Your account is blocked.Contact Admin =",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      findUser.failedLoginAttempts += 1;
      if (failedLoginAttempts >= process.env.MAX_INVALID_LOGIN) {
        findUser.isBlocked = true;
      }
      await findUser.save();
      return res.status(403).json({
        message: `Login failed!! You have ${
          process.env.MAX_INVALID_LOGIN - findUser.failedLoginAttempts
        } attempts left`,
        error: "Invalid credentials!!",
        success: false,
      });
    }
    // generate token
    const token = jwt.sign(
      {
        userId: findUser._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );
    const options = {
      httpOnly: true,
      secure: false, // it is for developement
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
    };
    res.cookie("token", token, options);
    const user = await User.findById(findUser._id).select(
      "-password -__v -updatedAt"
    );
    return res.status(201).json({
      message: "login successfull",
      error: null,
      success: true,
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "login Failed!! server error",
      error: error.message,
      success: false,
    });
  }
};



module.exports = {
  register,
  loginUser,

 
};
