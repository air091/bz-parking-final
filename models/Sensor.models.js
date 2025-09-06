const parkingDB = require("../bz_database/db.js");

class SensorModel {
  // Get all sensors
  static async getAll() {
    try {
      const { results } = await parkingDB.query(`
        SELECT s.*, a.ip_address, a.location as arduino_location 
        FROM sensor s 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        ORDER BY s.created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all sensors:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sensor by ID
  static async getById(sensorId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT s.*, a.ip_address, a.location as arduino_location 
        FROM sensor s 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE s.sensor_id = ?
      `,
        [sensorId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Sensor not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting sensor by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sensors by Arduino ID
  static async getByArduinoId(arduinoId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT s.*, a.ip_address, a.location as arduino_location 
        FROM sensor s 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE s.arduino_id = ? 
        ORDER BY s.created_at DESC
      `,
        [arduinoId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting sensors by Arduino ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sensors by status
  static async getByStatus(status) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT s.*, a.ip_address, a.location as arduino_location 
        FROM sensor s 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE s.status = ? 
        ORDER BY s.created_at DESC
      `,
        [status]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting sensors by status:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new sensor
  static async create(sensorData) {
    try {
      // Validate required fields
      const validation = this.validateSensorData(sensorData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const { sensor_type, arduino_id, status, sensor_range } = sensorData;

      // Check if Arduino exists (if provided)
      if (arduino_id) {
        const arduinoExists = await parkingDB.query(
          "SELECT arduino_id FROM arduino WHERE arduino_id = ?",
          [arduino_id]
        );
        if (arduinoExists.results.length === 0) {
          return {
            success: false,
            error: "Arduino device not found",
          };
        }
      }

      const { results } = await parkingDB.query(
        "INSERT INTO sensor (sensor_type, arduino_id, status, sensor_range) VALUES (?, ?, ?, ?)",
        [sensor_type, arduino_id, status || "maintenance", sensor_range || 0]
      );

      // Get the created sensor
      const createdSensor = await this.getById(results.insertId);

      return {
        success: true,
        data: createdSensor.data,
        message: "Sensor created successfully",
      };
    } catch (error) {
      console.error("Error creating sensor:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update sensor
  static async update(sensorId, updateData) {
    try {
      // Check if sensor exists
      const existingSensor = await this.getById(sensorId);
      if (!existingSensor.success) {
        return {
          success: false,
          error: "Sensor not found",
        };
      }

      // Validate update data
      const validation = this.validateSensorData(updateData, true);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Check if Arduino exists (if provided)
      if (updateData.arduino_id) {
        const arduinoExists = await parkingDB.query(
          "SELECT arduino_id FROM arduino WHERE arduino_id = ?",
          [updateData.arduino_id]
        );
        if (arduinoExists.results.length === 0) {
          return {
            success: false,
            error: "Arduino device not found",
          };
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      if (updateData.sensor_type) {
        updateFields.push("sensor_type = ?");
        updateValues.push(updateData.sensor_type);
      }

      if (updateData.status) {
        updateFields.push("status = ?");
        updateValues.push(updateData.status);
      }

      if (updateData.arduino_id !== undefined) {
        updateFields.push("arduino_id = ?");
        updateValues.push(updateData.arduino_id);
      }

      if (updateData.sensor_range !== undefined) {
        updateFields.push("sensor_range = ?");
        updateValues.push(updateData.sensor_range);

        // Auto-update status based on sensor_range
        if (parseInt(updateData.sensor_range) > 0) {
          updateFields.push("status = ?");
          updateValues.push("working");
        } else if (parseInt(updateData.sensor_range) === 0) {
          updateFields.push("status = ?");
          updateValues.push("maintenance");
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(sensorId);

      const { results } = await parkingDB.query(
        `UPDATE sensor SET ${updateFields.join(", ")} WHERE sensor_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "No changes made to sensor",
        };
      }

      // Get updated sensor
      const updatedSensor = await this.getById(sensorId);

      // Auto-update connected parking slots based on new sensor data
      if (updateData.sensor_range !== undefined || updateData.status) {
        try {
          const ParkingSlotModel = require("./ParkingSlot.models.js");
          const sensorData = {
            status: updateData.status || updatedSensor.data.status,
            sensor_range:
              updateData.sensor_range !== undefined
                ? updateData.sensor_range
                : updatedSensor.data.sensor_range,
          };

          const slotUpdateResult = await ParkingSlotModel.updateSlotsBySensorId(
            sensorId,
            sensorData
          );
          console.log(
            `Auto-updated parking slots for sensor ${sensorId}:`,
            slotUpdateResult.message
          );
        } catch (slotError) {
          console.error(
            "Error auto-updating parking slots:",
            slotError.message
          );
          // Don't fail the sensor update if parking slot update fails
        }
      }

      return {
        success: true,
        data: updatedSensor.data,
        message: "Sensor updated successfully",
      };
    } catch (error) {
      console.error("Error updating sensor:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete sensor
  static async delete(sensorId) {
    try {
      // Check if sensor exists
      const existingSensor = await this.getById(sensorId);
      if (!existingSensor.success) {
        return {
          success: false,
          error: "Sensor not found",
        };
      }

      // Check if sensor is used by any parking slots
      const parkingSlots = await parkingDB.query(
        "SELECT slot_id FROM parking_slot WHERE sensor_id = ?",
        [sensorId]
      );

      if (parkingSlots.results.length > 0) {
        return {
          success: false,
          error:
            "Cannot delete sensor. It is currently assigned to parking slots",
        };
      }

      const { results } = await parkingDB.query(
        "DELETE FROM sensor WHERE sensor_id = ?",
        [sensorId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Failed to delete sensor",
        };
      }

      return {
        success: true,
        message: "Sensor deleted successfully",
        deletedSensor: existingSensor.data,
      };
    } catch (error) {
      console.error("Error deleting sensor:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate sensor data
  static validateSensorData(data, isUpdate = false) {
    const errors = [];

    // For create operation, required fields
    if (!isUpdate) {
      if (!data.sensor_type || data.sensor_type.trim() === "") {
        errors.push("Sensor type is required");
      }
    }

    // Validate sensor type if provided
    if (data.sensor_type && data.sensor_type.length > 50) {
      errors.push("Sensor type must be 50 characters or less");
    }

    // Validate status if provided
    if (data.status && !["working", "maintenance"].includes(data.status)) {
      errors.push("Status must be either 'working' or 'maintenance'");
    }

    // Validate arduino_id if provided
    if (data.arduino_id !== undefined && data.arduino_id !== null) {
      if (isNaN(parseInt(data.arduino_id))) {
        errors.push("Arduino ID must be a valid number");
      }
    }

    // Validate sensor_range if provided
    if (data.sensor_range !== undefined && data.sensor_range !== null) {
      if (
        isNaN(parseInt(data.sensor_range)) ||
        parseInt(data.sensor_range) < 0
      ) {
        errors.push("Sensor range must be a valid non-negative number");
      }
      if (parseInt(data.sensor_range) > 1000) {
        errors.push("Sensor range must be 1000 or less (in cm)");
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.join(", "),
    };
  }

  // Get sensor statistics
  static async getStats() {
    try {
      const { results } = await parkingDB.query(`
        SELECT 
          COUNT(*) as total_sensors,
          COUNT(CASE WHEN status = 'working' THEN 1 END) as working_sensors,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_sensors,
          COUNT(DISTINCT arduino_id) as sensors_with_arduino,
          AVG(sensor_range) as average_sensor_range,
          MIN(sensor_range) as min_sensor_range,
          MAX(sensor_range) as max_sensor_range,
          MIN(created_at) as first_sensor_created,
          MAX(created_at) as last_sensor_created
        FROM sensor
      `);

      const typeStats = await parkingDB.query(`
        SELECT 
          sensor_type,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'working' THEN 1 END) as working_count,
          AVG(sensor_range) as average_range,
          MIN(sensor_range) as min_range,
          MAX(sensor_range) as max_range
        FROM sensor 
        GROUP BY sensor_type 
        ORDER BY count DESC
      `);

      return {
        success: true,
        data: {
          overview: results[0],
          typeBreakdown: typeStats.results,
        },
      };
    } catch (error) {
      console.error("Error getting sensor statistics:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = SensorModel;
