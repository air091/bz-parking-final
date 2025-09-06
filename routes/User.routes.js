const express = require("express");
const UserController = require("../controllers/User.controller.js");

const router = express.Router();

// GET routes
router.get("/", UserController.getAllUsers); // SUCCESS
router.get("/search", UserController.searchUsersByPlateNumber); // SUCCESS
router.get("/plate/:plateNumber", UserController.getUserByPlateNumber); // SUCCESS
router.get("/:id", UserController.getUserById); // SUCCESS

// POST routes
router.post("/", UserController.createUser); // SUCCESS

// PUT routes
router.put("/:id", UserController.updateUser); // SUCCESS

// DELETE routes
router.delete("/:id", UserController.deleteUser); // SUCCESS

module.exports = router;
