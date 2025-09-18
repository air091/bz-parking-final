const parkingDB = require("../bz_database/db.js");

class ArduinoModel {
  // Get all Arduino devices
  static async getAll() {
    try {
      const { results } = await parkingDB.query(`
        SELECT a.*, 
               COUNT(s.sensor_id) as sensor_count
        FROM arduino a 
        LEFT JOIN sensor s ON a.arduino_id = s.arduino_id 
        GROUP BY a.arduino_id
        ORDER BY a.created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all Arduino devices:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get all Arduino devices with their sensors
  static async getAllWithSensors() {
    try {
      const { results } = await parkingDB.query(`
        SELECT a.*, 
               COUNT(s.sensor_id) as sensor_count,
               GROUP_CONCAT(
                 CONCAT(s.sensor_id, ':', s.sensor_type, ':', s.status) 
                 SEPARATOR '|'
               ) as sensors_info
        FROM arduino a 
        LEFT JOIN sensor s ON a.arduino_id = s.arduino_id 
        GROUP BY a.arduino_id
        ORDER BY a.created_at DESC
      `);

      // Parse sensors info
      const processedResults = results.map((arduino) => {
        const sensors = arduino.sensors_info
          ? arduino.sensors_info.split("|").map((sensorInfo) => {
              const [id, type, status] = sensorInfo.split(":");
              return { id, type, status };
            })
          : [];

        return {
          ...arduino,
          sensors: sensors,
        };
      });

      return {
        success: true,
        data: processedResults,
        count: processedResults.length,
      };
    } catch (error) {
      console.error(
        "Error getting Arduino devices with sensors:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Arduino device by ID
  static async getById(arduinoId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT a.*, 
               COUNT(s.sensor_id) as sensor_count
        FROM arduino a 
        LEFT JOIN sensor s ON a.arduino_id = s.arduino_id 
        WHERE a.arduino_id = ?
        GROUP BY a.arduino_id
      `,
        [arduinoId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Arduino device not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting Arduino device by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Arduino device by IP address
  static async getByIpAddress(ipAddress) {
    try {
      const { results } = await parkingDB.query(
        "SELECT * FROM arduino WHERE ip_address = ?",
        [ipAddress]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Arduino device not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting Arduino device by IP:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Arduino devices by location
  static async getByLocation(location) {
    try {
      const { results } = await parkingDB.query(
        "SELECT * FROM arduino WHERE location = ? ORDER BY created_at DESC",
        [location]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting Arduino devices by location:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new Arduino device
  static async create(arduinoData) {
    try {
      // Validate required fields
      const validation = this.validateArduinoData(arduinoData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const { ip_address, location, status } = arduinoData;

      // Check if IP address already exists
      const existingDevice = await this.getByIpAddress(ip_address);
      if (existingDevice.success) {
        return {
          success: false,
          error: "Arduino device with this IP address already exists",
        };
      }

      const { results } = await parkingDB.query(
        "INSERT INTO arduino (ip_address, location, status) VALUES (?, ?, ?)",
        [ip_address, location, status || "working"]
      );

      // Get the created device
      const createdDevice = await this.getById(results.insertId);

      return {
        success: true,
        data: createdDevice.data,
        message: "Arduino device created successfully",
      };
    } catch (error) {
      console.error("Error creating Arduino device:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update Arduino device
  static async update(arduinoId, updateData) {
    try {
      // Check if device exists
      const existingDevice = await this.getById(arduinoId);
      if (!existingDevice.success) {
        return {
          success: false,
          error: "Arduino device not found",
        };
      }

      // Validate update data
      const validation = this.validateArduinoData(updateData, true);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Check if new IP address conflicts with existing devices
      if (
        updateData.ip_address &&
        updateData.ip_address !== existingDevice.data.ip_address
      ) {
        const ipConflict = await this.getByIpAddress(updateData.ip_address);
        if (ipConflict.success) {
          return {
            success: false,
            error: "Arduino device with this IP address already exists",
          };
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      if (updateData.ip_address) {
        updateFields.push("ip_address = ?");
        updateValues.push(updateData.ip_address);
      }

      if (updateData.location) {
        updateFields.push("location = ?");
        updateValues.push(updateData.location);
      }

      if (updateData.status) {
        updateFields.push("status = ?");
        updateValues.push(updateData.status);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(arduinoId);

      const { results } = await parkingDB.query(
        `UPDATE arduino SET ${updateFields.join(", ")} WHERE arduino_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "No changes made to Arduino device",
        };
      }

      // If Arduino status is being changed to 'maintenance', update all connected sensors
      if (updateData.status === "maintenance") {
        try {
          const sensorUpdateResult = await parkingDB.query(
            "UPDATE sensor SET status = 'maintenance' WHERE arduino_id = ?",
            [arduinoId]
          );

          console.log(
            `Updated ${sensorUpdateResult.results.affectedRows} sensors to maintenance status for Arduino ${arduinoId}`
          );
        } catch (sensorError) {
          console.error(
            "Error updating connected sensors:",
            sensorError.message
          );
          // Don't fail the Arduino update if sensor update fails
        }
      }

      // Get updated device
      const updatedDevice = await this.getById(arduinoId);

      return {
        success: true,
        data: updatedDevice.data,
        message: "Arduino device updated successfully",
      };
    } catch (error) {
      console.error("Error updating Arduino device:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete Arduino device
  static async delete(arduinoId) {
    try {
      // Check if device exists
      const existingDevice = await this.getById(arduinoId);
      if (!existingDevice.success) {
        return {
          success: false,
          error: "Arduino device not found",
        };
      }

      const { results } = await parkingDB.query(
        "DELETE FROM arduino WHERE arduino_id = ?",
        [arduinoId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Failed to delete Arduino device",
        };
      }

      return {
        success: true,
        message: "Arduino device deleted successfully",
        deletedDevice: existingDevice.data,
      };
    } catch (error) {
      console.error("Error deleting Arduino device:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate Arduino data
  static validateArduinoData(data, isUpdate = false) {
    const errors = [];

    // For create operation, all fields are required
    if (!isUpdate) {
      if (!data.ip_address || data.ip_address.trim() === "") {
        errors.push("IP address is required");
      }
      if (!data.location || data.location.trim() === "") {
        errors.push("Location is required");
      }
    }

    // Validate IP address format if provided
    if (data.ip_address) {
      const ipRegex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(data.ip_address.trim())) {
        errors.push("Invalid IP address format");
      }
    }

    // Validate location length if provided
    if (data.location && data.location.length > 20) {
      errors.push("Location must be 20 characters or less");
    }

    // Validate IP address length if provided
    if (data.ip_address && data.ip_address.length > 50) {
      errors.push("IP address must be 50 characters or less");
    }

    // Validate status if provided
    if (data.status && !["maintenance", "working"].includes(data.status)) {
      errors.push("Status must be either 'maintenance' or 'working'");
    }

    return {
      isValid: errors.length === 0,
      error: errors.join(", "),
    };
  }

  // Get Arduino devices by status
  static async getByStatus(status) {
    try {
      const { results } = await parkingDB.query(
        "SELECT * FROM arduino WHERE status = ? ORDER BY created_at DESC",
        [status]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting Arduino devices by status:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Arduino device statistics
  static async getStats() {
    try {
      const { results } = await parkingDB.query(`
        SELECT 
          COUNT(*) as total_devices,
          COUNT(DISTINCT location) as unique_locations,
          COUNT(CASE WHEN status = 'working' THEN 1 END) as working_devices,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_devices,
          COUNT(CASE WHEN status IS NULL THEN 1 END) as devices_without_status,
          MIN(created_at) as first_device_created,
          MAX(created_at) as last_device_created
        FROM arduino
      `);

      const locationStats = await parkingDB.query(`
        SELECT 
          location,
          COUNT(*) as device_count,
          COUNT(CASE WHEN status = 'working' THEN 1 END) as working_count,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_count
        FROM arduino 
        GROUP BY location 
        ORDER BY device_count DESC
      `);

      return {
        success: true,
        data: {
          overview: results[0],
          locationBreakdown: locationStats.results,
        },
      };
    } catch (error) {
      console.error("Error getting Arduino statistics:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sensors connected to Arduino
  static async getConnectedSensors(arduinoId) {
    try {
      const { results } = await parkingDB.query(
        "SELECT sensor_id, sensor_type, status, sensor_range FROM sensor WHERE arduino_id = ?",
        [arduinoId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting connected sensors:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ArduinoModel;
