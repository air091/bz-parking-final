const express = require("express");
const ArduinoController = require("../controllers/Arduino.controller.js");

const router = express.Router();

router.get("/", ArduinoController.getAllArduino); // SUCCESS
router.get("/ip/:ip", ArduinoController.getArduinoByIp); // SUCCESS
router.get("/location/:location", ArduinoController.getArduinoByLocation); // SUCCESS
router.get("/status/:status", ArduinoController.getArduinoByStatus);
router.get("/:id", ArduinoController.getArduinoById); // SUCCESS
router.get("/:id/sensors", ArduinoController.getArduinoSensors); // NEW - Get connected sensors
router.post("/", ArduinoController.createArduino); // SUCCESS
router.put("/:id", ArduinoController.updateArduino); // SUCCESS
router.delete("/:id", ArduinoController.deleteArduino); // SUCCESS

module.exports = router;
