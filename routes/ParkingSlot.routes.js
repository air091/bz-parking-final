const express = require("express");
const ParkingSlotController = require("../controllers/ParkingSlot.controller.js");

const router = express.Router();

router.get("/", ParkingSlotController.getAllParkingSlots);
router.get(
  "/location/:location",
  ParkingSlotController.getParkingSlotsByLocation
);
router.get("/status/:status", ParkingSlotController.getParkingSlotsByStatus);
router.get("/sensor/:sensorId", ParkingSlotController.getParkingSlotsBySensor);
router.get("/:id", ParkingSlotController.getParkingSlotById);
router.post("/", ParkingSlotController.createParkingSlot);
router.put("/:id", ParkingSlotController.updateParkingSlot);
router.delete("/:id", ParkingSlotController.deleteParkingSlot);

module.exports = router;
