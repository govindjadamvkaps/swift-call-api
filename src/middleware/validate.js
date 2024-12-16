import { check, body, param, query } from "express-validator";

export const validateSignup = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")

    .isString()
    .withMessage("Name must be of string type")

    .isLength({ min: 3 })
    .withMessage("Name must contain atleast 3 characters"),

  check("email")
    .notEmpty()
    .withMessage("Email is required")

    .isEmail()
    .withMessage("Please enter valid email")

    .normalizeEmail(),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be of length greater than 5"),

  check("username").notEmpty().withMessage("username is required"),

  // check('role')
  //   .isMongoId()
  //   .withMessage("Invalid role")

  //   .notEmpty()
  //   .withMessage("Role is required"),
];

export const validateLogin = [
  body("email")
    .notEmpty()
    .withMessage("Email field should not be empty")
    .isEmail()
    .withMessage("Please enter valid email"),

  body("password")
    .notEmpty()
    .withMessage("Password Field should not be empty")
    .isLength({ min: 6 })
    .withMessage("Password must contain more than 6 characters"),
];

//validate profile
export const validateProfile = [
  body("email")
    .notEmpty()
    .withMessage("Email must be required")
    .isEmail()
    .withMessage("Please enter valid email"),

  body("name").notEmpty().withMessage("Name must be required"),
];
