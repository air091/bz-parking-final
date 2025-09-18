const express = require("express");
const ESP8266Controller = require("../controllers/ESP8266.controller.js");

const router = express.Router();

// ESP8266 sensor control routes
router.get("/status", ESP8266Controller.getESP8266Status);
router.get("/sensor/on", ESP8266Controller.turnSensorsOn);
router.get("/sensor/off", ESP8266Controller.turnSensorsOff);
router.get("/distance/1", ESP8266Controller.getDistance1);
router.get("/distance/2", ESP8266Controller.getDistance2);
router.get("/distance/both", ESP8266Controller.getBothDistances);

// New route for manual sensor range updates
router.post("/update-sensor-ranges", ESP8266Controller.updateSensorRanges);

module.exports = router;
