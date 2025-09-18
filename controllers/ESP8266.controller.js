const axios = require("axios");
require("dotenv").config();

class ESP8266Controller {
  constructor(ipAddress = null) {
    this.esp8266BaseUrl = ipAddress
      ? `http://${ipAddress}`
      : process.env.ESP8266_BASE_URL || "http://192.168.1.100";
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

  // Get IP address from request headers or use default
  static getIpFromRequest(req) {
    return (
      req.headers["x-arduino-ip"] ||
      process.env.ESP8266_BASE_URL?.replace("http://", "") ||
      "192.168.137.198"
    );
  }

  // Helper method to update sensor range in database
  static async updateSensorRange(sensorId, rangeValue) {
    try {
      const response = await axios.put(
        `${
          process.env.BACKEND_URL || "http://localhost:8888"
        }/api/sensor/${sensorId}`,
        {
          sensor_range: rangeValue,
          status: "working",
        },
        {
          timeout: 3000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        `Failed to update sensor ${sensorId} range:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sensors for Arduino device
  static async getArduinoSensors(arduinoId) {
    try {
      const response = await axios.get(
        `${
          process.env.BACKEND_URL || "http://localhost:8888"
        }/api/arduino/${arduinoId}/sensors`,
        {
          timeout: 3000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      console.error(
        `Failed to get sensors for Arduino ${arduinoId}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get Arduino device by IP address
  static async getArduinoByIp(ipAddress) {
    try {
      const response = await axios.get(
        `${
          process.env.BACKEND_URL || "http://localhost:8888"
        }/api/arduino/ip/${ipAddress}`,
        {
          timeout: 3000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error(`Failed to get Arduino by IP ${ipAddress}:`, error.message);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Direct sensor ID mapping (like sensorServer.js approach)
  static getSensorIdsForIp(ipAddress) {
    // Define direct mapping from ESP8266 IP to sensor IDs
    const sensorMapping = {
      "192.168.137.198": { sensor1Id: 7, sensor2Id: 6 }, // Your ESP8266 IP
    };

    return sensorMapping[ipAddress] || { sensor1Id: null, sensor2Id: null };
  }

  // Enhanced method to update sensor ranges automatically
  static async updateSensorRangesFromDistances(ipAddress, distanceData) {
    try {
      // First try to find Arduino device by IP
      const arduinoResult = await ESP8266Controller.getArduinoByIp(ipAddress);

      let sensors = [];
      let updates = [];

      if (arduinoResult.success && arduinoResult.data) {
        // Arduino device found in database - use database mapping
        const arduinoId = arduinoResult.data.arduino_id;
        const sensorsResult = await ESP8266Controller.getArduinoSensors(
          arduinoId
        );

        if (sensorsResult.success && sensorsResult.data.length > 0) {
          sensors = sensorsResult.data;
          console.log(
            `📡 Found Arduino device ${arduinoId} with ${sensors.length} sensors`
          );
        }
      } else {
        // Arduino device not found - use direct sensor ID mapping
        const sensorMapping = ESP8266Controller.getSensorIdsForIp(ipAddress);
        if (sensorMapping.sensor1Id || sensorMapping.sensor2Id) {
          // Create mock sensor objects for direct mapping
          if (sensorMapping.sensor1Id) {
            sensors.push({ sensor_id: sensorMapping.sensor1Id });
          }
          if (sensorMapping.sensor2Id) {
            sensors.push({ sensor_id: sensorMapping.sensor2Id });
          }
          console.log(
            `📡 Using direct sensor mapping for ${ipAddress}: Sensor1=${sensorMapping.sensor1Id}, Sensor2=${sensorMapping.sensor2Id}`
          );
        }
      }

      if (sensors.length === 0) {
        console.log(`❌ No sensors found for IP ${ipAddress}`);
        return {
          success: false,
          message: `No sensors found for IP ${ipAddress}. Please add this ESP8266 to the Arduino database or configure sensor mapping.`,
        };
      }

      // Update sensor 1 if distance1 exists
      if (
        distanceData.distance1 !== undefined &&
        distanceData.distance1 !== null &&
        sensors[0]
      ) {
        const updateResult = await ESP8266Controller.updateSensorRange(
          sensors[0].sensor_id,
          Math.round(distanceData.distance1)
        );
        if (updateResult.success) {
          updates.push(
            `Sensor ${sensors[0].sensor_id}: ${Math.round(
              distanceData.distance1
            )} in`
          );
          console.log(
            `✅ Updated Sensor ${sensors[0].sensor_id} range to ${Math.round(
              distanceData.distance1
            )} inches in database`
          );
        }
      }

      // Update sensor 2 if distance2 exists
      if (
        distanceData.distance2 !== undefined &&
        distanceData.distance2 !== null &&
        sensors[1]
      ) {
        const updateResult = await ESP8266Controller.updateSensorRange(
          sensors[1].sensor_id,
          Math.round(distanceData.distance2)
        );
        if (updateResult.success) {
          updates.push(
            `Sensor ${sensors[1].sensor_id}: ${Math.round(
              distanceData.distance2
            )} in`
          );
          console.log(
            `✅ Updated Sensor ${sensors[1].sensor_id} range to ${Math.round(
              distanceData.distance2
            )} inches in database`
          );
        }
      }

      if (updates.length > 0) {
        console.log(
          `✅ Updated sensor ranges for ${ipAddress}: ${updates.join(", ")}`
        );
        return {
          success: true,
          message: `Updated ${updates.length} sensor(s)`,
          updates,
        };
      } else {
        return {
          success: true,
          message: "No sensor updates needed",
        };
      }
    } catch (error) {
      console.error("Error updating sensor ranges:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Turn sensors ON
  static async turnSensorsOn(req, res) {
    try {
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/sensor/on");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Sensors turned ON successfully on ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: `Failed to turn sensors ON on ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/sensor/off");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Sensors turned OFF successfully on ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: `Failed to turn sensors OFF on ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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

  // Enhanced get distance from sensor 1 with automatic database update
  static async getDistance1(req, res) {
    try {
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/distance/1");

      if (result.success) {
        // Output distance measurement to console
        const distanceValue = result.data.distance || result.data.distance1;
        if (distanceValue !== undefined && distanceValue !== null) {
          console.log(
            `📏 [${ipAddress}] Sensor 1 Distance: ${distanceValue} inches`
          );
        }

        // Automatically update sensor range in database
        if (
          result.data &&
          (result.data.distance !== undefined ||
            result.data.distance1 !== undefined)
        ) {
          const updateResult =
            await ESP8266Controller.updateSensorRangesFromDistances(ipAddress, {
              distance1: distanceValue,
            });

          if (updateResult.success) {
            console.log(
              `✅ Auto-updated sensor ranges: ${updateResult.message}`
            );
          }
        }

        res.status(200).json({
          success: true,
          message: `Distance sensor 1 data retrieved successfully from ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(
          `❌ [${ipAddress}] Failed to get distance from sensor 1: ${result.error}`
        );
        res.status(result.status).json({
          success: false,
          message: `Failed to get distance from sensor 1 on ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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

  // Enhanced get distance from sensor 2 with automatic database update
  static async getDistance2(req, res) {
    try {
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/distance/2");

      if (result.success) {
        // Output distance measurement to console
        const distanceValue = result.data.distance || result.data.distance2;
        if (distanceValue !== undefined && distanceValue !== null) {
          console.log(
            `📏 [${ipAddress}] Sensor 2 Distance: ${distanceValue} inches`
          );
        }

        // Automatically update sensor range in database
        if (
          result.data &&
          (result.data.distance !== undefined ||
            result.data.distance2 !== undefined)
        ) {
          const updateResult =
            await ESP8266Controller.updateSensorRangesFromDistances(ipAddress, {
              distance2: distanceValue,
            });

          if (updateResult.success) {
            console.log(
              `✅ Auto-updated sensor ranges: ${updateResult.message}`
            );
          }
        }

        res.status(200).json({
          success: true,
          message: `Distance sensor 2 data retrieved successfully from ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(
          `❌ [${ipAddress}] Failed to get distance from sensor 2: ${result.error}`
        );
        res.status(result.status).json({
          success: false,
          message: `Failed to get distance from sensor 2 on ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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

  // Enhanced get distances from both sensors with automatic database update
  static async getBothDistances(req, res) {
    try {
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/distance/both");

      if (result.success) {
        // Output distance measurements to console
        if (result.data) {
          if (
            result.data.distance1 !== undefined &&
            result.data.distance1 !== null
          ) {
            console.log(
              `📏 [${ipAddress}] Sensor 1 Distance: ${result.data.distance1} inches`
            );
          }
          if (
            result.data.distance2 !== undefined &&
            result.data.distance2 !== null
          ) {
            console.log(
              `📏 [${ipAddress}] Sensor 2 Distance: ${result.data.distance2} inches`
            );
          }

          // Also log the raw data for debugging
          console.log(
            `�� [${ipAddress}] Raw ESP8266 Response:`,
            JSON.stringify(result.data, null, 2)
          );
        }

        // Automatically update sensor ranges in database
        if (
          result.data &&
          (result.data.distance1 !== undefined ||
            result.data.distance2 !== undefined)
        ) {
          const updateResult =
            await ESP8266Controller.updateSensorRangesFromDistances(ipAddress, {
              distance1: result.data.distance1,
              distance2: result.data.distance2,
            });

          if (updateResult.success) {
            console.log(
              `✅ Auto-updated sensor ranges: ${updateResult.message}`
            );
          }
        }

        res.status(200).json({
          success: true,
          message: `Both sensor distances retrieved successfully from ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(
          `❌ [${ipAddress}] Failed to get distances from both sensors: ${result.error}`
        );
        res.status(result.status).json({
          success: false,
          message: `Failed to get distances from both sensors on ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const controller = new ESP8266Controller(ipAddress);
      const result = await controller.makeESP8266Request("/");

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `ESP8266 status retrieved successfully from ${ipAddress}`,
          data: result.data,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(result.status).json({
          success: false,
          message: `Failed to get ESP8266 status from ${ipAddress}`,
          error: result.error,
          ipAddress: ipAddress,
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

  // Manual sensor range update endpoint
  static async updateSensorRanges(req, res) {
    try {
      const ipAddress = ESP8266Controller.getIpFromRequest(req);
      const { distance1, distance2 } = req.body;

      if (distance1 === undefined && distance2 === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "At least one distance value (distance1 or distance2) is required",
          timestamp: new Date().toISOString(),
        });
      }

      const updateResult =
        await ESP8266Controller.updateSensorRangesFromDistances(ipAddress, {
          distance1,
          distance2,
        });

      if (updateResult.success) {
        res.status(200).json({
          success: true,
          message: `Sensor ranges updated successfully for ${ipAddress}`,
          data: updateResult,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to update sensor ranges for ${ipAddress}`,
          error: updateResult.error || updateResult.message,
          ipAddress: ipAddress,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in updateSensorRanges controller:", error.message);
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
