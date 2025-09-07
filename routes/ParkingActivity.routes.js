const express = require("express");
const ParkingActivityController = require("../controllers/ParkingActivity.controller.js");

const router = express.Router();

// GET routes
router.get("/", ParkingActivityController.getAllParkingActivities); // SUCCESS
router.get("/active", ParkingActivityController.getActiveParkingActivities); // SUCCESS
router.get(
  "/completed",
  ParkingActivityController.getCompletedParkingActivities
); // SUCCESS
router.get("/statistics", ParkingActivityController.getParkingStatistics); // SUCCESS
router.get(
  "/user/:userId",
  ParkingActivityController.getParkingActivitiesByUserId
); // SUCCESS
router.get(
  "/date-range",
  ParkingActivityController.getParkingActivitiesByDateRange
); // SUCCESS
router.get("/:id", ParkingActivityController.getParkingActivityById); // SUCCESS

// POST routes
router.post("/", ParkingActivityController.startParkingActivity); // SUCCESS
router.post("/:id/end", ParkingActivityController.endParkingActivity); // SUCCESS

// PUT routes
router.put("/:id", ParkingActivityController.updateParkingActivity); // SUCCESS

// DELETE routes
router.delete("/:id", ParkingActivityController.deleteParkingActivity); // SUCCESS

module.exports = router;
