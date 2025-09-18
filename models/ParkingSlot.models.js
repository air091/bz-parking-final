const parkingDB = require("../bz_database/db.js");

class ParkingSlotModel {
  // Get all parking slots
  static async getAll() {
    try {
      const { results } = await parkingDB.query(`
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
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
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
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
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
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
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
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
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
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

  // Get parking slots by service ID
  static async getByServiceId(serviceId) {
    try {
      const { results } = await parkingDB.query(
        `
        SELECT ps.*, 
               s.sensor_type, s.status as sensor_status, 
               a.ip_address, a.location as arduino_location,
               svc.vehicle_type, svc.first_2_hrs, svc.per_succ_hr
        FROM parking_slot ps 
        LEFT JOIN sensor s ON ps.sensor_id = s.sensor_id 
        LEFT JOIN arduino a ON s.arduino_id = a.arduino_id 
        LEFT JOIN service svc ON ps.service_id = svc.service_id
        WHERE ps.service_id = ? 
        ORDER BY ps.created_at DESC
      `,
        [serviceId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting parking slots by service ID:",
        error.message
      );
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

      const { location, status, sensor_id, service_id } = slotData;

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

      // Check if service exists (if provided)
      if (service_id) {
        const serviceExists = await parkingDB.query(
          "SELECT service_id FROM service WHERE service_id = ?",
          [service_id]
        );
        if (serviceExists.results.length === 0) {
          return {
            success: false,
            error: "Service not found",
          };
        }
      }

      const { results } = await parkingDB.query(
        "INSERT INTO parking_slot (location, status, sensor_id, service_id) VALUES (?, ?, ?, ?)",
        [location, status || "maintenance", sensor_id, service_id]
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
  // Update parking slot based on sensor data (sensor_range in inches)
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

      // Use inches for thresholding: <5 => occupied, >5 => available, =5 => maintenance
      if (sensorData.status === "maintenance") {
        newStatus = "maintenance";
      } else if (sensorData.status === "working") {
        if (sensorData.sensor_range < 4) {
          newStatus = "occupied";
        } else if (sensorData.sensor_range > 4) {
          newStatus = "available";
        } else {
          newStatus = "maintenance";
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
          message: `Parking slot status updated to '${newStatus}' based on sensor data (inches)`,
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

      // Check if service exists (if provided)
      if (
        updateData.service_id !== undefined &&
        updateData.service_id !== null
      ) {
        const serviceExists = await parkingDB.query(
          "SELECT service_id FROM service WHERE service_id = ?",
          [updateData.service_id]
        );
        if (serviceExists.results.length === 0) {
          return {
            success: false,
            error: "Service not found",
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

      if (updateData.service_id !== undefined) {
        updateFields.push("service_id = ?");
        updateValues.push(updateData.service_id);
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

    // Validate service_id if provided
    if (data.service_id !== undefined && data.service_id !== null) {
      if (isNaN(parseInt(data.service_id))) {
        errors.push("Service ID must be a valid number");
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
          COUNT(DISTINCT service_id) as slots_with_services,
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

      const serviceStats = await parkingDB.query(`
        SELECT 
          svc.vehicle_type,
          COUNT(ps.slot_id) as total_slots,
          COUNT(CASE WHEN ps.status = 'available' THEN 1 END) as available_slots,
          COUNT(CASE WHEN ps.status = 'occupied' THEN 1 END) as occupied_slots,
          COUNT(CASE WHEN ps.status = 'maintenance' THEN 1 END) as maintenance_slots
        FROM service svc
        LEFT JOIN parking_slot ps ON svc.service_id = ps.service_id
        GROUP BY svc.service_id, svc.vehicle_type
        ORDER BY total_slots DESC
      `);

      return {
        success: true,
        data: {
          overview: results[0],
          locationBreakdown: locationStats.results,
          serviceBreakdown: serviceStats.results,
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
