const parkingActivityDB = require("../bz_database/db.js");

class ParkingActivityModel {
  // Get all parking activities
  static async getAll() {
    try {
      const { results } = await parkingActivityDB.query(`
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        ORDER BY pa.created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all parking activities:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking activity by ID
  static async getById(activityId) {
    try {
      const { results } = await parkingActivityDB.query(
        `
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        WHERE pa.act_id = ?
      `,
        [activityId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Parking activity not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting parking activity by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking activities by user ID
  static async getByUserId(userId) {
    try {
      const { results } = await parkingActivityDB.query(
        `
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        WHERE pa.user_id = ? 
        ORDER BY pa.created_at DESC
      `,
        [userId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting parking activities by user ID:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get active parking activities (where end_time is NULL)
  static async getActive() {
    try {
      const { results } = await parkingActivityDB.query(`
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        WHERE pa.end_time IS NULL 
        ORDER BY pa.start_time DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting active parking activities:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get completed parking activities (where end_time is NOT NULL)
  static async getCompleted() {
    try {
      const { results } = await parkingActivityDB.query(`
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        WHERE pa.end_time IS NOT NULL 
        ORDER BY pa.end_time DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting completed parking activities:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking activities by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const { results } = await parkingActivityDB.query(
        `
        SELECT pa.*, u.plate_number
        FROM parking_activity pa 
        LEFT JOIN user u ON pa.user_id = u.user_id 
        WHERE pa.start_time >= ? AND pa.start_time <= ?
        ORDER BY pa.start_time DESC
      `,
        [startDate, endDate]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting parking activities by date range:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new parking activity (start parking)
  static async create(activityData) {
    try {
      const { user_id, start_time } = activityData;

      // Check if user exists
      const userCheck = await parkingActivityDB.query(
        `SELECT user_id FROM user WHERE user_id = ?`,
        [user_id]
      );

      if (userCheck.results.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Check if user has an active parking session
      const activeSession = await parkingActivityDB.query(
        `SELECT act_id FROM parking_activity WHERE user_id = ? AND end_time IS NULL`,
        [user_id]
      );

      if (activeSession.results.length > 0) {
        return {
          success: false,
          error: "User already has an active parking session",
        };
      }

      // Insert with optional custom start_time
      const { results } = await parkingActivityDB.query(
        start_time
          ? `INSERT INTO parking_activity (user_id, start_time) VALUES (?, ?)`
          : `INSERT INTO parking_activity (user_id) VALUES (?)`,
        start_time ? [user_id, start_time] : [user_id]
      );

      const newActivity = await this.getById(results.insertId);

      return {
        success: true,
        data: newActivity.data,
        message: "Parking activity started successfully",
      };
    } catch (error) {
      console.error("Error creating parking activity:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Internal: recalculate and update amount based on service and duration
  static async recalcAmount(activityId) {
    try {
      // Compute amount using service rates:
      // - <= 2 hours: amount = first_2_hrs
      // - > 2 hours: amount = first_2_hrs + ceil((seconds-7200)/3600) * per_succ_hr
      // If user has no service, keep 0.
      const { results } = await parkingActivityDB.query(
        `
        UPDATE parking_activity pa
        JOIN user u ON u.user_id = pa.user_id
        LEFT JOIN service s ON s.service_id = u.service_id
        SET pa.amount = CASE
          WHEN pa.end_time IS NULL OR s.service_id IS NULL THEN 0
          WHEN TIMESTAMPDIFF(SECOND, pa.start_time, pa.end_time) <= 7200
            THEN s.first_2_hrs
          ELSE
            s.first_2_hrs
            + CEIL( (TIMESTAMPDIFF(SECOND, pa.start_time, pa.end_time) - 7200) / 3600 )
              * s.per_succ_hr
        END
        WHERE pa.act_id = ?
      `,
        [activityId]
      );
      return { success: true, affectedRows: results.affectedRows };
    } catch (error) {
      console.error("Error recalculating amount:", error.message);
      return { success: false, error: error.message };
    }
  }

  // End parking activity
  static async endActivity(activityId, endTime = null) {
    try {
      // Check if activity exists and is active
      const existingActivity = await this.getById(activityId);
      if (!existingActivity.success) {
        return {
          success: false,
          error: "Parking activity not found",
        };
      }

      if (existingActivity.data.end_time !== null) {
        return {
          success: false,
          error: "Parking activity is already ended",
        };
      }

      const { results } = await parkingActivityDB.query(
        `UPDATE parking_activity SET end_time = ? WHERE act_id = ?`,
        [endTime || new Date(), activityId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Failed to end parking activity",
        };
      }

      // Recalculate amount now that end_time is set
      await this.recalcAmount(activityId);

      const updatedActivity = await this.getById(activityId);

      return {
        success: true,
        data: updatedActivity.data,
        message: "Parking activity ended successfully",
      };
    } catch (error) {
      console.error("Error ending parking activity:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update parking activity
  static async update(activityId, activityData) {
    try {
      const { user_id, start_time, end_time, is_paid } = activityData;

      // Check if activity exists
      const existingActivity = await this.getById(activityId);
      if (!existingActivity.success) {
        return {
          success: false,
          error: "Parking activity not found",
        };
      }

      // Check if user exists (if user_id is being updated)
      if (user_id) {
        const userCheck = await parkingActivityDB.query(
          `SELECT user_id FROM user WHERE user_id = ?`,
          [user_id]
        );

        if (userCheck.results.length === 0) {
          return {
            success: false,
            error: "User not found",
          };
        }
      }

      const updateFields = [];
      const updateValues = [];

      if (user_id !== undefined) {
        updateFields.push("user_id = ?");
        updateValues.push(user_id);
      }

      if (start_time !== undefined) {
        updateFields.push("start_time = ?");
        updateValues.push(start_time);
      }

      if (end_time !== undefined) {
        updateFields.push("end_time = ?");
        updateValues.push(end_time);
      }

      if (is_paid !== undefined) {
        updateFields.push("is_paid = ?");
        updateValues.push(is_paid); // expect 0 or 1 already normalized by controller
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(activityId);

      const { results } = await parkingActivityDB.query(
        `UPDATE parking_activity SET ${updateFields.join(
          ", "
        )} WHERE act_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Parking activity not found or no changes made",
        };
      }

      // If is_paid was explicitly set to 0, remove any payment records for this activity
      if (is_paid === 0) {
        await parkingActivityDB.query(
          `DELETE FROM parking_payment WHERE act_id = ?`,
          [activityId]
        );
      }

      // If after the update both start_time and end_time are present, recalc amount
      const updatedActivityBefore = await this.getById(activityId);
      if (
        updatedActivityBefore.success &&
        updatedActivityBefore.data.start_time &&
        updatedActivityBefore.data.end_time
      ) {
        await this.recalcAmount(activityId);
      }

      const updatedActivity = await this.getById(activityId);

      return {
        success: true,
        data: updatedActivity.data,
        message: "Parking activity updated successfully",
      };
    } catch (error) {
      console.error("Error updating parking activity:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete parking activity
  static async delete(activityId) {
    try {
      // Check if activity exists
      const existingActivity = await this.getById(activityId);
      if (!existingActivity.success) {
        return {
          success: false,
          error: "Parking activity not found",
        };
      }

      const { results } = await parkingActivityDB.query(
        `DELETE FROM parking_activity WHERE act_id = ?`,
        [activityId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Parking activity not found",
        };
      }

      return {
        success: true,
        message: "Parking activity deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting parking activity:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get parking statistics
  static async getStatistics() {
    try {
      const { results } = await parkingActivityDB.query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN end_time IS NULL THEN 1 END) as active_activities,
          COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_activities,
          AVG(CASE WHEN end_time IS NOT NULL THEN duration END) as avg_duration_seconds,
          MAX(CASE WHEN end_time IS NOT NULL THEN duration END) as max_duration_seconds,
          MIN(CASE WHEN end_time IS NOT NULL THEN duration END) as min_duration_seconds
        FROM parking_activity
      `);

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting parking statistics:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ParkingActivityModel;
