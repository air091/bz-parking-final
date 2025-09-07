const serviceDB = require("../bz_database/db.js");

class ServiceModel {
  static async getAll() {
    try {
      const { results } = await serviceDB.query(`
        SELECT * FROM service
        ORDER BY created_at DESC
      `);
      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Error getting all services:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async getById(serviceId) {
    try {
      const { results } = await serviceDB.query(
        `SELECT * FROM service WHERE service_id = ?`,
        [serviceId]
      );
      if (results.length === 0) {
        return { success: false, error: "Service not found" };
      }
      return { success: true, data: results[0] };
    } catch (error) {
      console.error("Error getting service by ID:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async getByVehicleType(vehicleType) {
    try {
      const { results } = await serviceDB.query(
        `SELECT * FROM service WHERE vehicle_type = ?`,
        [vehicleType]
      );
      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Error getting services by vehicle type:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async create(data) {
    try {
      const validation = this.validate(data);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // check duplicate vehicle_type
      const { results: dup } = await serviceDB.query(
        `SELECT service_id FROM service WHERE vehicle_type = ?`,
        [data.vehicle_type.trim()]
      );
      if (dup.length > 0) {
        return {
          success: false,
          error: "Service for this vehicle type already exists",
        };
      }

      const { results } = await serviceDB.query(
        `INSERT INTO service (vehicle_type, first_2_hrs, per_succ_hr)
         VALUES (?, ?, ?)`,
        [
          data.vehicle_type.trim(),
          parseInt(data.first_2_hrs || 0, 10),
          parseInt(data.per_succ_hr || 0, 10),
        ]
      );

      const created = await this.getById(results.insertId);
      return {
        success: true,
        data: created.data,
        message: "Service created successfully",
      };
    } catch (error) {
      console.error("Error creating service:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async update(serviceId, data) {
    try {
      const exists = await this.getById(serviceId);
      if (!exists.success) {
        return { success: false, error: "Service not found" };
      }

      const validation = this.validate(data, true);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const fields = [];
      const values = [];

      if (data.vehicle_type !== undefined) {
        fields.push("vehicle_type = ?");
        values.push(data.vehicle_type.trim());
      }
      if (data.first_2_hrs !== undefined) {
        fields.push("first_2_hrs = ?");
        values.push(parseInt(data.first_2_hrs, 10));
      }
      if (data.per_succ_hr !== undefined) {
        fields.push("per_succ_hr = ?");
        values.push(parseInt(data.per_succ_hr, 10));
      }

      if (fields.length === 0) {
        return { success: false, error: "No valid fields to update" };
      }

      // if vehicle_type changes, ensure uniqueness
      if (data.vehicle_type !== undefined) {
        const { results: dup } = await serviceDB.query(
          `SELECT service_id FROM service WHERE vehicle_type = ? AND service_id <> ?`,
          [data.vehicle_type.trim(), serviceId]
        );
        if (dup.length > 0) {
          return {
            success: false,
            error: "Service for this vehicle type already exists",
          };
        }
      }

      values.push(serviceId);
      const { results } = await serviceDB.query(
        `UPDATE service SET ${fields.join(", ")} WHERE service_id = ?`,
        values
      );
      if (results.affectedRows === 0) {
        return { success: false, error: "No changes made to service" };
      }

      const updated = await this.getById(serviceId);
      return {
        success: true,
        data: updated.data,
        message: "Service updated successfully",
      };
    } catch (error) {
      console.error("Error updating service:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async delete(serviceId) {
    try {
      const exists = await this.getById(serviceId);
      if (!exists.success) {
        return { success: false, error: "Service not found" };
      }

      const { results } = await serviceDB.query(
        `DELETE FROM service WHERE service_id = ?`,
        [serviceId]
      );
      if (results.affectedRows === 0) {
        return { success: false, error: "Failed to delete service" };
      }

      return {
        success: true,
        message: "Service deleted successfully",
        deletedService: exists.data,
      };
    } catch (error) {
      console.error("Error deleting service:", error.message);
      return { success: false, error: error.message };
    }
  }

  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!data.vehicle_type || data.vehicle_type.trim() === "") {
        errors.push("Vehicle type is required");
      }
    }

    if (data.vehicle_type !== undefined) {
      if (
        typeof data.vehicle_type !== "string" ||
        data.vehicle_type.trim() === ""
      ) {
        errors.push("Vehicle type must be a non-empty string");
      } else if (data.vehicle_type.trim().length > 20) {
        errors.push("Vehicle type must be 20 characters or less");
      }
    }

    const intFields = ["first_2_hrs", "per_succ_hr"];
    intFields.forEach((f) => {
      if (data[f] !== undefined && data[f] !== null) {
        const v = parseInt(data[f], 10);
        if (Number.isNaN(v) || v < 0) {
          errors.push(`${f} must be a valid non-negative integer`);
        }
      }
    });

    return { isValid: errors.length === 0, error: errors.join(", ") };
  }

  static async getStats() {
    try {
      const { results } = await serviceDB.query(`
        SELECT 
          COUNT(*) AS total_services,
          MIN(first_2_hrs) AS min_first_2_hrs,
          MAX(first_2_hrs) AS max_first_2_hrs,
          AVG(first_2_hrs) AS avg_first_2_hrs,
          MIN(per_succ_hr) AS min_per_succ_hr,
          MAX(per_succ_hr) AS max_per_succ_hr,
          AVG(per_succ_hr) AS avg_per_succ_hr
        FROM service
      `);
      const byType = await serviceDB.query(`
        SELECT vehicle_type, COUNT(*) AS count
        FROM service
        GROUP BY vehicle_type
        ORDER BY count DESC
      `);
      return {
        success: true,
        data: {
          overview: results[0],
          typeBreakdown: byType.results,
        },
      };
    } catch (error) {
      console.error("Error getting service stats:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ServiceModel;
