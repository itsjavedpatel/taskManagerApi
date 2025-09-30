const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { BlockedIP } = require("../models/BlockedIPs.js");

const authUser = async (req, res, next) => {
  try {
    const token =
      req.headers?.authorization?.split(" ")[1] || req.cookies.token;

    if (!token) return res.status(401).json({ message: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.userId)
      return res.status(401).json({ message: "Invalid token" });
    const user = await User.findById(payload.userId).select(
      "-password -__v -updatedAt"
    );
    if (!user) return res.status(401).json({ message: "User not found" });

    const ipAddress = req.ip;
    const isFound = await BlockedIP.findOne({
      ipAddress,
      email: req.email,
    });
    if (isFound) {
      return res.status(403).json({
        message: "unauthorized accees",
        success: false,
        error: "This IP is Blocked for the requested Account. Contact Admin",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Authentication failed", error: error.message });
  }
};

module.exports = { authUser };
