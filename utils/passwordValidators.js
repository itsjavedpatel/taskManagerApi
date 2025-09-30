const { body } = require("express-validator");

const passwordValidators = [
  body("password")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6-20 characters long")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/\d/)
    .withMessage("Password must contain a number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain a special character")
    .not()
    .matches(/\s/)
    .withMessage("Password must not contain spaces"),
];

module.exports = { passwordValidators };
