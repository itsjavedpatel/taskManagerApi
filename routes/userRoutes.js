const { Router } = require("express");
const userRouter = Router();
const {
  register,
  loginUser,


} = require("../controllers/userControllers");
const { passwordValidators } = require("../utils/passwordValidators");
const { authUser } = require("../middlewares/authUser");

// user login register
userRouter.post("/register", passwordValidators, register);
userRouter.post("/login", loginUser);


module.exports = { userRouter };
