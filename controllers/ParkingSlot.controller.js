const ParkingSlotModel = require("../models/ParkingSlot.models.js");

class ParkingSlotController {
  // Get all parking slots
  static async getAllParkingSlots(req, res) {
    try {
      console.log("GET /api/parking-slot - Fetching all parking slots");

      const result = await ParkingSlotModel.getAll();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slots retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slots",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getAllParkingSlots controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slot by ID
  static async getParkingSlotById(req, res) {
    try {
      const { id } = req.params;
      console.log(`GET /api/parking-slot/${id} - Fetching parking slot by ID`);

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid parking slot ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.getById(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slot retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Parking slot not found",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getParkingSlotById controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slots by location
  static async getParkingSlotsByLocation(req, res) {
    try {
      const { location } = req.params;
      console.log(
        `GET /api/parking-slot/location/${location} - Fetching parking slots by location`
      );

      if (!location || location.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Location is required",
          error: "Location parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.getByLocation(location.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slots retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slots",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "Error in getParkingSlotsByLocation controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slots by status
  static async getParkingSlotsByStatus(req, res) {
    try {
      const { status } = req.params;
      console.log(
        `GET /api/parking-slot/status/${status} - Fetching parking slots by status`
      );

      if (!status || status.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Status is required",
          error: "Status parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.getByStatus(status.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slots retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slots",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "Error in getParkingSlotsByStatus controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slots by sensor ID
  static async getParkingSlotsBySensor(req, res) {
    try {
      const { sensorId } = req.params;
      console.log(
        `GET /api/parking-slot/sensor/${sensorId} - Fetching parking slots by sensor ID`
      );

      if (!sensorId || isNaN(parseInt(sensorId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor ID provided",
          error: "Sensor ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.getBySensorId(parseInt(sensorId));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slots retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slots",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "Error in getParkingSlotsBySensor controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Create new parking slot
  static async createParkingSlot(req, res) {
    try {
      const { location, status, sensor_id, service_id } = req.body;
      console.log("POST /api/parking-slot - Creating new parking slot", {
        location,
        status,
        sensor_id,
        service_id,
      });

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.create({
        location,
        status: status || "maintenance",
        sensor_id,
        service_id,
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        const statusCode = result.error.includes("not found") ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: "Failed to create parking slot",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in createParkingSlot controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slots by service ID
  static async getParkingSlotsByService(req, res) {
    try {
      const { serviceId } = req.params;
      console.log(
        `GET /api/parking-slot/service/${serviceId} - Fetching parking slots by service ID`
      );

      if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID provided",
          error: "Service ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.getByServiceId(parseInt(serviceId));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slots retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slots",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "Error in getParkingSlotsByService controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update parking slot
  static async updateParkingSlot(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(
        `PUT /api/parking-slot/${id} - Updating parking slot`,
        updateData
      );

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid parking slot ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No update data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.update(parseInt(id), updateData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        let statusCode = 500;
        if (result.error.includes("not found")) {
          statusCode = 404;
        } else if (
          result.error.includes("Invalid") ||
          result.error.includes("required")
        ) {
          statusCode = 400;
        }

        res.status(statusCode).json({
          success: false,
          message: "Failed to update parking slot",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in updateParkingSlot controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update parking slot based on sensor data
  static async updateSlotFromSensor(req, res) {
    try {
      const { id } = req.params;
      const { sensor_range, sensor_status } = req.body;
      console.log(
        `PUT /api/parking-slot/${id}/sensor-update - Updating slot based on sensor data`,
        {
          sensor_range,
          sensor_status,
        }
      );

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid parking slot ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No sensor data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate sensor data
      if (
        sensor_status &&
        !["working", "maintenance"].includes(sensor_status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor status",
          error: "Sensor status must be either 'working' or 'maintenance'",
          timestamp: new Date().toISOString(),
        });
      }

      if (
        sensor_range !== undefined &&
        (isNaN(parseInt(sensor_range)) || parseInt(sensor_range) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor range",
          error: "Sensor range must be a valid non-negative number",
          timestamp: new Date().toISOString(),
        });
      }

      const sensorData = {
        status: sensor_status || "working",
        sensor_range: sensor_range || 0,
      };

      const result = await ParkingSlotModel.updateSlotBasedOnSensor(
        parseInt(id),
        sensorData
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          statusChanged: result.statusChanged,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          sensorData: {
            status: sensorData.status,
            range_in: sensorData.sensor_range,
            threshold: "5 in",
            logic:
              sensorData.sensor_range < 5
                ? "occupied (< 5 in)"
                : sensorData.sensor_range > 5
                ? "available (> 5 in)"
                : "maintenance (sensor in maintenance or range = 5 in)",
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        const statusCode = result.error.includes("not found") ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          message: "Failed to update parking slot based on sensor data",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in updateSlotFromSensor controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete parking slot
  static async deleteParkingSlot(req, res) {
    try {
      const { id } = req.params;
      console.log(`DELETE /api/parking-slot/${id} - Deleting parking slot`);

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid parking slot ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ParkingSlotModel.delete(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          deletedSlot: result.deletedSlot,
          timestamp: new Date().toISOString(),
        });
      } else {
        const statusCode = result.error.includes("not found") ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          message: "Failed to delete parking slot",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in deleteParkingSlot controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get parking slot statistics
  static async getParkingSlotStats(req, res) {
    try {
      console.log(
        "GET /api/parking-slot/stats - Fetching parking slot statistics"
      );

      const result = await ParkingSlotModel.getStats();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Parking slot statistics retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve parking slot statistics",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getParkingSlotStats controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Health check endpoint for parking slot service
  static async healthCheck(req, res) {
    try {
      console.log(
        "GET /api/parking-slot/health - Parking slot service health check"
      );

      const result = await ParkingSlotModel.getAll();

      res.status(200).json({
        success: true,
        message: "Parking slot service is healthy",
        service: "Parking Slot Controller",
        database: result.success ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      console.error("Error in parking slot health check:", error.message);
      res.status(503).json({
        success: false,
        message: "Parking slot service is unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = ParkingSlotController;
