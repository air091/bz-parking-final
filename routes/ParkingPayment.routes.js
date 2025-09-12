const express = require("express");
const ParkingPaymentController = require("../controllers/ParkingPayment.controller.js");

const router = express.Router();

// GET routes
router.get("/", ParkingPaymentController.getAllParkingPayments);
router.get("/statistics", ParkingPaymentController.getParkingPaymentStatistics);
router.get(
  "/user/:userId",
  ParkingPaymentController.getParkingPaymentsByUserId
);
router.get(
  "/activity/:actId",
  ParkingPaymentController.getParkingPaymentsByActId
);
router.get(
  "/method/:method",
  ParkingPaymentController.getParkingPaymentsByPaymentMethod
);
router.get(
  "/date-range",
  ParkingPaymentController.getParkingPaymentsByDateRange
);
router.get("/:id", ParkingPaymentController.getParkingPaymentById);

// POST
router.post("/", ParkingPaymentController.createParkingPayment);

// PUT
router.put("/:id", ParkingPaymentController.updateParkingPayment);

// DELETE
router.delete("/:id", ParkingPaymentController.deleteParkingPayment);

module.exports = router;
