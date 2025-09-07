const express = require("express");
const ServiceController = require("../controllers/Service.controller.js");

const router = express.Router();

// GET
router.get("/", ServiceController.getAllServices);
router.get("/statistics", ServiceController.getServiceStatistics);
router.get("/vehicle/:vehicleType", ServiceController.getServicesByVehicleType);
router.get("/:id", ServiceController.getServiceById);

// POST
router.post("/", ServiceController.createService);

// PUT
router.put("/:id", ServiceController.updateService);

// DELETE
router.delete("/:id", ServiceController.deleteService);

module.exports = router;
