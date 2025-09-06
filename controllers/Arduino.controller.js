const ArduinoModel = require("../models/Arduino.models.js");

class ArduinoController {
  // Get all Arduino devices
  static async getAllArduino(req, res) {
    try {
      console.log("GET /api/arduino - Fetching all Arduino devices");

      const result = await ArduinoModel.getAll();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Arduino devices retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve Arduino devices",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getAllArduino controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get Arduino device by ID
  static async getArduinoById(req, res) {
    try {
      const { id } = req.params;
      console.log(`GET /api/arduino/${id} - Fetching Arduino device by ID`);

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid Arduino ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.getById(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Arduino device retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Arduino device not found",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getArduinoById controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get Arduino device by IP address
  static async getArduinoByIp(req, res) {
    try {
      const { ip } = req.params;
      console.log(`GET /api/arduino/ip/${ip} - Fetching Arduino device by IP`);

      // Validate IP parameter
      if (!ip || ip.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "IP address is required",
          error: "IP address parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.getByIpAddress(ip.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Arduino device retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Arduino device not found",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getArduinoByIp controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get Arduino devices by location
  static async getArduinoByLocation(req, res) {
    try {
      const { location } = req.params;
      console.log(
        `GET /api/arduino/location/${location} - Fetching Arduino devices by location`
      );

      // Validate location parameter
      if (!location || location.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Location is required",
          error: "Location parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.getByLocation(location.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Arduino devices retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve Arduino devices",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getArduinoByLocation controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Create new Arduino device
  static async createArduino(req, res) {
    try {
      const { ip_address, location, status } = req.body;
      console.log("POST /api/arduino - Creating new Arduino device", {
        ip_address,
        location,
        status,
      });

      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.create({
        ip_address,
        location,
        status,
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Check if it's a validation error or duplicate error
        const statusCode = result.error.includes("already exists") ? 409 : 400;
        res.status(statusCode).json({
          success: false,
          message: "Failed to create Arduino device",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in createArduino controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update Arduino device
  static async updateArduino(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(
        `PUT /api/arduino/${id} - Updating Arduino device`,
        updateData
      );

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid Arduino ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No update data provided in request body",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.update(parseInt(id), updateData);

      if (result.success) {
        // Check if status was changed to maintenance
        let message = result.message;
        if (updateData.status === "maintenance") {
          message =
            "Arduino device updated successfully. All connected sensors have been set to maintenance status.";
        }

        res.status(200).json({
          success: true,
          message: message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Check if it's a not found error, validation error, or duplicate error
        let statusCode = 500;
        if (result.error.includes("not found")) {
          statusCode = 404;
        } else if (
          result.error.includes("already exists") ||
          result.error.includes("Invalid") ||
          result.error.includes("required")
        ) {
          statusCode = 400;
        }

        res.status(statusCode).json({
          success: false,
          message: "Failed to update Arduino device",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in updateArduino controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete Arduino device
  static async deleteArduino(req, res) {
    try {
      const { id } = req.params;
      console.log(`DELETE /api/arduino/${id} - Deleting Arduino device`);

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid Arduino ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.delete(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          deletedDevice: result.deletedDevice,
          timestamp: new Date().toISOString(),
        });
      } else {
        const statusCode = result.error.includes("not found") ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          message: "Failed to delete Arduino device",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in deleteArduino controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get Arduino devices by status
  static async getArduinoByStatus(req, res) {
    try {
      const { status } = req.params;
      console.log(
        `GET /api/arduino/status/${status} - Fetching Arduino devices by status`
      );

      // Validate status parameter
      if (!status || status.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Status is required",
          error: "Status parameter cannot be empty",
          timestamp: new Date().toISOString(),
        });
      }

      if (!["maintenance", "working"].includes(status.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
          error: "Status must be either 'maintenance' or 'working'",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.getByStatus(status.trim());

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Arduino devices retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve Arduino devices",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getArduinoByStatus controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get sensors connected to Arduino
  static async getArduinoSensors(req, res) {
    try {
      const { id } = req.params;
      console.log(
        `GET /api/arduino/${id}/sensors - Fetching sensors connected to Arduino`
      );

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid Arduino ID provided",
          error: "ID must be a valid number",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await ArduinoModel.getConnectedSensors(parseInt(id));

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Connected sensors retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve connected sensors",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getArduinoSensors controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = ArduinoController;
