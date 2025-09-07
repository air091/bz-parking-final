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

      // Simple approach: let MySQL handle everything
      const { results } = await parkingActivityDB.query(
        `INSERT INTO parking_activity (user_id) VALUES (?)`,
        [user_id]
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
      const { user_id, start_time, end_time } = activityData;

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
