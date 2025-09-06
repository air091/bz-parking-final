const parkingDB = require("../bz_database/db.js");

class ParkingSlotModel {
  // Get all parking slots
  static async getAll() {
    try {
      const { results } = await parkingDB.query(`
        SELECT ps.*, s.sensor_type, s.status as sensor_status, a.ip_address, a.location as arduino_location
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        ORDER BY ps.created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all parking slots:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking slot by ID
  static async getById(slotId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT ps.*, s.sensor_type, s.status as sensor_status, a.ip_address, a.location as arduino_location
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE ps.slot_id = ?
      `,
        [slotId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Parking slot not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting parking slot by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking slots by location
  static async getByLocation(location) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT ps.*, s.sensor_type, s.status as sensor_status, a.ip_address, a.location as arduino_location
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE ps.location = ? 
        ORDER BY ps.created_at DESC
      `,
        [location]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting parking slots by location:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking slots by status
  static async getByStatus(status) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT ps.*, s.sensor_type, s.status as sensor_status, a.ip_address, a.location as arduino_location
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE ps.status = ? 
        ORDER BY ps.created_at DESC
      `,
        [status]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting parking slots by status:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking slots by sensor ID
  static async getBySensorId(sensorId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT ps.*, s.sensor_type, s.status as sensor_status, a.ip_address, a.location as arduino_location
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        WHERE ps.sensor_id = ? 
        ORDER BY ps.created_at DESC
      `,
        [sensorId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting parking slots by sensor ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new parking slot
  static async create(slotData) {
    try {
      // Validate required fields
      const validation = this.validateSlotData(slotData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const { location, status, sensor_id } = slotData;

      // Check if sensor exists (if provided)
      if (sensor_id) {
        const sensorExists = await parkingDB.query(
          "SELECT sensor_id FROM sensor WHERE sensor_id = ?",
          [sensor_id]
        );
        if (sensorExists.results.length === 0) {
          return {
            success: false,
            error: "Sensor not found",
          };
        }
      }

      const { results } = await parkingDB.query(
        "INSERT INTO parking_slot (location, status, sensor_id) VALUES (?, ?, ?)",
        [location, status || "maintenance", sensor_id]
      );

      // Get the created parking slot
      const createdSlot = await this.getById(results.insertId);

      return {
        success: true,
        data: createdSlot.data,
        message: "Parking slot created successfully",
      };
    } catch (error) {
      console.error("Error creating parking slot:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update parking slot based on sensor data
  static async updateSlotBasedOnSensor(slotId, sensorData) {
    try {
      // Check if parking slot exists
      const existingSlot = await this.getById(slotId);
      if (!existingSlot.success) {
        return {
          success: false,
          error: "Parking slot not found",
        };
      }

      let newStatus = existingSlot.data.status;

      // If sensor is in maintenance, parking slot should be maintenance
      if (sensorData.status === "maintenance") {
        newStatus = "maintenance";
      } else if (sensorData.status === "working") {
        // Use 3 cm as threshold (no conversion needed since we're working in cm)
        if (sensorData.sensor_range < 3) {
          newStatus = "occupied"; // Object detected within 3 cm
        } else if (sensorData.sensor_range > 3) {
          newStatus = "available"; // No object detected beyond 3 cm
        } else {
          // sensor_range = 3 cm exactly, keep current status or default to maintenance
          newStatus = existingSlot.data.status || "maintenance";
        }
      }

      // Only update if status changed
      if (newStatus !== existingSlot.data.status) {
        const { results } = await parkingDB.query(
          "UPDATE parking_slot SET status = ? WHERE slot_id = ?",
          [newStatus, slotId]
        );

        if (results.affectedRows === 0) {
          return {
            success: false,
            error: "Failed to update parking slot status",
          };
        }

        // Get updated parking slot
        const updatedSlot = await this.getById(slotId);

        return {
          success: true,
          data: updatedSlot.data,
          message: `Parking slot status updated to '${newStatus}' based on sensor data`,
          statusChanged: true,
          previousStatus: existingSlot.data.status,
          newStatus: newStatus,
        };
      } else {
        return {
          success: true,
          data: existingSlot.data,
          message: "Parking slot status unchanged",
          statusChanged: false,
        };
      }
    } catch (error) {
      console.error(
        "Error updating parking slot based on sensor:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update all parking slots connected to a specific sensor
  static async updateSlotsBySensorId(sensorId, sensorData) {
    try {
      // Get all parking slots connected to this sensor
      const { results } = await parkingDB.query(
        "SELECT slot_id FROM parking_slot WHERE sensor_id = ?",
        [sensorId]
      );

      if (results.length === 0) {
        return {
          success: true,
          message: "No parking slots connected to this sensor",
          updatedSlots: [],
        };
      }

      const updateResults = [];

      // Update each connected parking slot
      for (const slot of results) {
        const result = await this.updateSlotBasedOnSensor(
          slot.slot_id,
          sensorData
        );
        updateResults.push({
          slot_id: slot.slot_id,
          result: result,
        });
      }

      return {
        success: true,
        message: `Updated ${results.length} parking slot(s) based on sensor data`,
        updatedSlots: updateResults,
      };
    } catch (error) {
      console.error(
        "Error updating parking slots by sensor ID:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update parking slot
  static async update(slotId, updateData) {
    try {
      // Check if parking slot exists
      const existingSlot = await this.getById(slotId);
      if (!existingSlot.success) {
        return {
          success: false,
          error: "Parking slot not found",
        };
      }

      // Validate update data
      const validation = this.validateSlotData(updateData, true);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Check if sensor exists (if provided)
      if (updateData.sensor_id !== undefined && updateData.sensor_id !== null) {
        const sensorExists = await parkingDB.query(
          "SELECT sensor_id FROM sensor WHERE sensor_id = ?",
          [updateData.sensor_id]
        );
        if (sensorExists.results.length === 0) {
          return {
            success: false,
            error: "Sensor not found",
          };
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      if (updateData.location) {
        updateFields.push("location = ?");
        updateValues.push(updateData.location);
      }

      if (updateData.status) {
        updateFields.push("status = ?");
        updateValues.push(updateData.status);
      }

      if (updateData.sensor_id !== undefined) {
        updateFields.push("sensor_id = ?");
        updateValues.push(updateData.sensor_id);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(slotId);

      const { results } = await parkingDB.query(
        `UPDATE parking_slot SET ${updateFields.join(", ")} WHERE slot_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "No changes made to parking slot",
        };
      }

      // Get updated parking slot
      const updatedSlot = await this.getById(slotId);

      return {
        success: true,
        data: updatedSlot.data,
        message: "Parking slot updated successfully",
      };
    } catch (error) {
      console.error("Error updating parking slot:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete parking slot
  static async delete(slotId) {
    try {
      // Check if parking slot exists
      const existingSlot = await this.getById(slotId);
      if (!existingSlot.success) {
        return {
          success: false,
          error: "Parking slot not found",
        };
      }

      const { results } = await parkingDB.query(
        "DELETE FROM parking_slot WHERE slot_id = ?",
        [slotId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Failed to delete parking slot",
        };
      }

      return {
        success: true,
        message: "Parking slot deleted successfully",
        deletedSlot: existingSlot.data,
      };
    } catch (error) {
      console.error("Error deleting parking slot:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate parking slot data
  static validateSlotData(data, isUpdate = false) {
    const errors = [];

    // For create operation, required fields
    if (!isUpdate) {
      if (!data.location || data.location.trim() === "") {
        errors.push("Location is required");
      }
      // Status is not required for create - defaults to 'maintenance'
    }

    // Validate location if provided
    if (data.location && data.location.length > 20) {
      errors.push("Location must be 20 characters or less");
    }

    // Validate status if provided
    if (
      data.status &&
      !["available", "occupied", "maintenance"].includes(data.status)
    ) {
      errors.push(
        "Status must be either 'available', 'occupied', or 'maintenance'"
      );
    }

    // Validate sensor_id if provided
    if (data.sensor_id !== undefined && data.sensor_id !== null) {
      if (isNaN(parseInt(data.sensor_id))) {
        errors.push("Sensor ID must be a valid number");
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.join(", "),
    };
  }

  // Get parking slot statistics
  static async getStats() {
    try {
      const { results } = await parkingDB.query(`
        SELECT 
          COUNT(*) as total_slots,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_slots,
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_slots,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_slots,
          COUNT(DISTINCT location) as unique_locations,
          COUNT(DISTINCT sensor_id) as slots_with_sensors,
          MIN(created_at) as first_slot_created,
          MAX(created_at) as last_slot_created
        FROM parking_slot
      `);

      const locationStats = await parkingDB.query(`
        SELECT 
          location,
          COUNT(*) as total_slots,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_slots,
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_slots,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_slots
        FROM parking_slot 
        GROUP BY location 
        ORDER BY total_slots DESC
      `);

      return {
        success: true,
        data: {
          overview: results[0],
          locationBreakdown: locationStats.results,
        },
      };
    } catch (error) {
      console.error("Error getting parking slot statistics:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ParkingSlotModel;
