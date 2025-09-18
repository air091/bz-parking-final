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
        // If sensor status is being updated, also update associated parking slots
        if (updateData.status) {
          try {
            await SensorController.updateParkingSlotsFromSensorStatus(
              parseInt(id),
              updateData.status
            );
            console.log(
              `✅ Updated parking slots for sensor ${id} to status: ${updateData.status}`
            );
          } catch (parkingSlotError) {
            console.error(
              "Error updating parking slots from sensor status:",
              parkingSlotError.message
            );
            // Don't fail the sensor update if parking slot update fails
          }
        }

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

  // Helper method to update parking slots based on sensor status
  static async updateParkingSlotsFromSensorStatus(sensorId, sensorStatus) {
    try {
      const ParkingSlotModel = require("../models/ParkingSlot.models.js");

      // Get all parking slots that use this sensor
      const parkingSlotsResult = await ParkingSlotModel.getBySensorId(sensorId);

      if (parkingSlotsResult.success && parkingSlotsResult.data.length > 0) {
        console.log(
          `Found ${parkingSlotsResult.data.length} parking slot(s) using sensor ${sensorId}`
        );

        // Update each parking slot based on sensor status
        for (const slot of parkingSlotsResult.data) {
          let newSlotStatus;

          if (sensorStatus === "maintenance") {
            // If sensor goes to maintenance, parking slot goes to maintenance
            newSlotStatus = "maintenance";
          } else if (sensorStatus === "working") {
            // If sensor goes to working, determine slot status based on sensor range
            // This will be handled by the automatic sensor range updates
            continue; // Skip manual status change, let sensor range logic handle it
          }

          if (newSlotStatus && newSlotStatus !== slot.status) {
            await ParkingSlotModel.update(slot.slot_id, {
              status: newSlotStatus,
            });
            console.log(
              `✅ Updated parking slot ${slot.slot_id} from "${slot.status}" to "${newSlotStatus}" due to sensor ${sensorId} status change`
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "Error updating parking slots from sensor status:",
        error.message
      );
      throw error;
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

  // Scan for connected devices on the network
  static async scanConnectedDevices(req, res) {
    try {
      console.log(
        "GET /api/sensor/scan-devices - Scanning for connected devices"
      );

      // This is a simplified approach - in a real implementation, you might want to use
      // network scanning libraries or system commands
      const connectedDevices = await SensorController.performNetworkScan();

      res.status(200).json({
        success: true,
        message: "Network scan completed",
        data: connectedDevices,
        count: connectedDevices.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error scanning connected devices:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to scan connected devices",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Helper method to perform network scan
  static async performNetworkScan() {
    try {
      // This is a basic implementation - you might want to enhance this
      // with actual network scanning libraries like 'node-nmap' or 'ping'
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      // Get the local network range (assuming 192.168.1.x)
      const networkBase = "192.168.1";
      const devices = [];

      // Scan common IP ranges (1-254)
      const scanPromises = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${networkBase}.${i}`;
        scanPromises.push(SensorController.pingDevice(ip));
      }

      const results = await Promise.allSettled(scanPromises);

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.isAlive) {
          devices.push({
            ip: result.value.ip,
            hostname: result.value.hostname || "Unknown",
            mac: result.value.mac || "Unknown",
            responseTime: result.value.responseTime || "Unknown",
            deviceType: SensorController.guessDeviceType(result.value.hostname),
            lastSeen: new Date().toISOString(),
          });
        }
      });

      return devices.sort((a, b) => {
        // Sort by IP address
        const ipA = a.ip.split(".").map(Number);
        const ipB = b.ip.split(".").map(Number);
        for (let i = 0; i < 4; i++) {
          if (ipA[i] !== ipB[i]) return ipA[i] - ipB[i];
        }
        return 0;
      });
    } catch (error) {
      console.error("Error performing network scan:", error.message);
      return [];
    }
  }

  // Helper method to ping a single device
  static async pingDevice(ip) {
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      // Use ping command to check if device is alive
      const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`);

      return {
        ip,
        isAlive: true,
        hostname: await SensorController.getHostname(ip),
        mac: await SensorController.getMacAddress(ip),
        responseTime: SensorController.extractResponseTime(stdout),
      };
    } catch (error) {
      return {
        ip,
        isAlive: false,
      };
    }
  }

  // Helper method to get hostname
  static async getHostname(ip) {
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      const { stdout } = await execAsync(`nslookup ${ip}`);
      const match = stdout.match(/name = (.+)\./);
      return match ? match[1] : "Unknown";
    } catch (error) {
      return "Unknown";
    }
  }

  // Helper method to get MAC address
  static async getMacAddress(ip) {
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      const { stdout } = await execAsync(`arp -n ${ip}`);
      const match = stdout.match(
        /([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i
      );
      return match ? match[1] : "Unknown";
    } catch (error) {
      return "Unknown";
    }
  }

  // Helper method to extract response time from ping output
  static extractResponseTime(pingOutput) {
    try {
      const match = pingOutput.match(/time=(\d+\.?\d*)/);
      return match ? `${match[1]}ms` : "Unknown";
    } catch (error) {
      return "Unknown";
    }
  }

  // Helper method to guess device type based on hostname
  static guessDeviceType(hostname) {
    if (!hostname || hostname === "Unknown") return "Unknown";

    const hostnameLower = hostname.toLowerCase();

    if (hostnameLower.includes("esp") || hostnameLower.includes("arduino")) {
      return "ESP8266/Arduino";
    } else if (
      hostnameLower.includes("android") ||
      hostnameLower.includes("phone")
    ) {
      return "Android Device";
    } else if (
      hostnameLower.includes("iphone") ||
      hostnameLower.includes("ipad")
    ) {
      return "iOS Device";
    } else if (
      hostnameLower.includes("laptop") ||
      hostnameLower.includes("pc")
    ) {
      return "Computer";
    } else if (
      hostnameLower.includes("router") ||
      hostnameLower.includes("gateway")
    ) {
      return "Router/Gateway";
    } else {
      return "Unknown Device";
    }
  }
}

module.exports = SensorController;
