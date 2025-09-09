const express = require("express");
const UserController = require("../controllers/User.controller.js");

const router = express.Router();

// GET routes
router.get("/", UserController.getAllUsers);
router.get("/search", UserController.searchUsersByPlateNumber);
router.get("/plate/:plateNumber", UserController.getUserByPlateNumber);
router.get("/service/:serviceId", UserController.getUsersByServiceId);
router.get("/:id", UserController.getUserById);

// POST routes
router.post("/", UserController.createUser);

// PUT routes
router.put("/:id", UserController.updateUser);

// DELETE routes
router.delete("/:id", UserController.deleteUser);

module.exports = router;
