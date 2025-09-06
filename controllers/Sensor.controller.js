const SensorModel = require("../models/Sensor.models.js");

class SensorController {
  // Get all sensors
  static async getAllSensors(req, res) {
    try {
      console.log("GET /api/sensor - Fetching all sensors");

      const result = await SensorModel.getAll();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensors retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve sensors",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getAllSensors controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get sensor by ID
  static async getSensorById(req, res) {
    try {
      const { id } = req.params;
      console.log(`GET /api/sensor/${id} - Fetching sensor by ID`);

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await SensorModel.getById(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensor retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Sensor not found",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getSensorById controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get sensors by Arduino ID
  static async getSensorsByArduino(req, res) {
    try {
      const { arduinoId } = req.params;
      console.log(
        `GET /api/sensor/arduino/${arduinoId} - Fetching sensors by Arduino ID`
      );

      if (!arduinoId || isNaN(parseInt(arduinoId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid Arduino ID provided",
          error: "Arduino ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await SensorModel.getByArduinoId(parseInt(arduinoId));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensors retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve sensors",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getSensorsByArduino controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get sensors by status
  static async getSensorsByStatus(req, res) {
    try {
      const { status } = req.params;
      console.log(
        `GET /api/sensor/status/${status} - Fetching sensors by status`
      );

      if (!status || status.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Status is required",
          error: "Status parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await SensorModel.getByStatus(status.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensors retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve sensors",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getSensorsByStatus controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Create new sensor
  static async createSensor(req, res) {
    try {
      const { sensor_type, arduino_id, status, sensor_range } = req.body;
      console.log("POST /api/sensor - Creating new sensor", {
        sensor_type,
        arduino_id,
        status,
        sensor_range,
      });

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await SensorModel.create({
        sensor_type,
        arduino_id,
        status,
        sensor_range,
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
          message: "Failed to create sensor",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in createSensor controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update sensor
  static async updateSensor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`PUT /api/sensor/${id} - Updating sensor`, updateData);

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor ID provided",
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

      const result = await SensorModel.update(parseInt(id), updateData);

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
          message: "Failed to update sensor",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in updateSensor controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete sensor
  static async deleteSensor(req, res) {
    try {
      const { id } = req.params;
      console.log(`DELETE /api/sensor/${id} - Deleting sensor`);

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await SensorModel.delete(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          deletedSensor: result.deletedSensor,
          timestamp: new Date().toISOString(),
        });
      } else {
        const statusCode = result.error.includes("not found")
          ? 404
          : result.error.includes("assigned")
          ? 409
          : 500;
        res.status(statusCode).json({
          success: false,
          message: "Failed to delete sensor",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in deleteSensor controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = SensorController;
