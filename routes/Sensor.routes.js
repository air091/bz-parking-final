const express = require("express");
const SensorController = require("../controllers/Sensor.controller.js");

const router = express.Router();

router.get("/", SensorController.getAllSensors); // SUCCESS
router.get("/scan-devices", SensorController.scanConnectedDevices); // Move this BEFORE /:id
router.get("/arduino/:arduinoId", SensorController.getSensorsByArduino);
router.get("/status/:status", SensorController.getSensorsByStatus);
router.get("/:id", SensorController.getSensorById); // This should be LAST
router.post("/", SensorController.createSensor); // SUCCESS
router.put("/:id", SensorController.updateSensor); // SUCCESS
router.delete("/:id", SensorController.deleteSensor); // SUCCESS

module.exports = router;
