const express = require("express");
const HoldPaymentController = require("../controllers/HoldPayment.controller.js");

const router = express.Router();

// GET routes
router.get("/", HoldPaymentController.getAllHoldPayments); // SUCCESS
router.get("/statistics", HoldPaymentController.getHoldPaymentStatistics); // SUCCESS
router.get("/availability", HoldPaymentController.getSlotAvailability); // NEW
router.get("/pending", HoldPaymentController.getPendingHoldPayments); // NEW
router.get("/completed", HoldPaymentController.getCompletedHoldPayments); // NEW
router.get(
  "/status/:status",
  HoldPaymentController.getHoldPaymentsByDoneStatus
); // NEW
router.get("/user/:userId", HoldPaymentController.getHoldPaymentsByUserId); // SUCCESS
router.get(
  "/method/:method",
  HoldPaymentController.getHoldPaymentsByPaymentMethod
); // SUCCESS
router.get("/amount-range", HoldPaymentController.getHoldPaymentsByAmountRange); // SUCCESS
router.get("/date-range", HoldPaymentController.getHoldPaymentsByDateRange); // SUCCESS
router.get("/:id", HoldPaymentController.getHoldPaymentById); // SUCCESS

// POST routes
router.post("/", HoldPaymentController.createHoldPayment); // SUCCESS

// PUT routes
router.put("/:id", HoldPaymentController.updateHoldPayment); // SUCCESS
router.put("/:id/mark-done", HoldPaymentController.markHoldPaymentAsDone); // NEW
router.put("/:id/mark-pending", HoldPaymentController.markHoldPaymentAsPending); // NEW

// DELETE routes
router.delete("/:id", HoldPaymentController.deleteHoldPayment); // SUCCESS

module.exports = router;
