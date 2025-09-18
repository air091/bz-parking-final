const axios = require("axios");

class ESP8266Controller {
  constructor() {
    this.esp8266BaseUrl =
      process.env.ESP8266_BASE_URL || "http://192.168.1.100"; // Default ESP8266 IP
    this.timeout = 5000; // 5 second timeout
  }

  // Helper method to make requests to ESP8266
  async makeESP8266Request(endpoint) {
    try {
      const response = await axios.get(`${this.esp8266BaseUrl}${endpoint}`, {
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
        },
      });
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      console.error(`ESP8266 request error for ${endpoint}:`, error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
      };
    }
  }

  // Turn sensors ON
  static async turnSensorsOn(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/sensor/on");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensors turned ON successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to turn sensors ON",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in turnSensorsOn controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Turn sensors OFF
  static async turnSensorsOff(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/sensor/off");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Sensors turned OFF successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to turn sensors OFF",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in turnSensorsOff controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get distance from sensor 1
  static async getDistance1(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/distance/1");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Distance sensor 1 data retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to get distance from sensor 1",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getDistance1 controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get distance from sensor 2
  static async getDistance2(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/distance/2");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Distance sensor 2 data retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to get distance from sensor 2",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getDistance2 controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get distances from both sensors
  static async getBothDistances(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/distance/both");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Both sensor distances retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to get distances from both sensors",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getBothDistances controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get ESP8266 status
  static async getESP8266Status(req, res) {
    try {
      const controller = new ESP8266Controller();
      const result = await controller.makeESP8266Request("/");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "ESP8266 status retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: "Failed to get ESP8266 status",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in getESP8266Status controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = ESP8266Controller;
