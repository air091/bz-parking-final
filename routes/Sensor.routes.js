const express = require("express");
const SensorController = require("../controllers/Sensor.controller.js");

const router = express.Router();

router.get("/", SensorController.getAllSensors); // SUCCESS
router.get("/arduino/:arduinoId", SensorController.getSensorsByArduino); //
router.get("/status/:status", SensorController.getSensorsByStatus); // SUCCESS
router.get("/:id", SensorController.getSensorById); // SUCCEESS
router.post("/", SensorController.createSensor); // SUCCESS
router.put("/:id", SensorController.updateSensor); // SUCCESS
router.delete("/:id", SensorController.deleteSensor); // SUCCESS

module.exports = router;
