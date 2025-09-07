const ParkingActivityModel = require("../models/ParkingActivity.models.js");

class ParkingActivityController {
  // Get all parking activities
  static async getAllParkingActivities(req, res) {
    try {
      const result = await ParkingActivityModel.getAll();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking activities",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking activities retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getAllParkingActivities controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking activity by ID
  static async getParkingActivityById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid activity ID is required",
        });
      }

      const result = await ParkingActivityModel.getById(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking activity retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error(
        "Error in getParkingActivityById controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking activities by user ID
  static async getParkingActivitiesByUserId(req, res) {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const result = await ParkingActivityModel.getByUserId(parseInt(userId));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking activities",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking activities retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getParkingActivitiesByUserId controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get active parking activities
  static async getActiveParkingActivities(req, res) {
    try {
      const result = await ParkingActivityModel.getActive();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve active parking activities",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Active parking activities retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getActiveParkingActivities controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get completed parking activities
  static async getCompletedParkingActivities(req, res) {
    try {
      const result = await ParkingActivityModel.getCompleted();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve completed parking activities",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Completed parking activities retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getCompletedParkingActivities controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking activities by date range
  static async getParkingActivitiesByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      // Validate date format
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD or ISO format",
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "Start date must be before end date",
        });
      }

      const result = await ParkingActivityModel.getByDateRange(
        startDate,
        endDate
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking activities",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking activities retrieved successfully",
        data: result.data,
        count: result.count,
        dateRange: { startDate, endDate },
      });
    } catch (error) {
      console.error(
        "Error in getParkingActivitiesByDateRange controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Start parking activity
  static async startParkingActivity(req, res) {
    try {
      const { user_id, start_time } = req.body;

      // Validation
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (isNaN(user_id)) {
        return res.status(400).json({
          success: false,
          message: "User ID must be a valid number",
        });
      }

      if (start_time && isNaN(new Date(start_time).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start time format",
        });
      }

      // Only include start_time in the data if it's provided
      const activityData = {
        user_id: parseInt(user_id),
      };

      if (start_time) {
        activityData.start_time = new Date(start_time);
      }

      const result = await ParkingActivityModel.create(activityData);

      if (!result.success) {
        const statusCode = result.error.includes("not found")
          ? 404
          : result.error.includes("already has")
          ? 409
          : 500;
        return res.status(statusCode).json({
          success: false,
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in startParkingActivity controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // End parking activity
  static async endParkingActivity(req, res) {
    try {
      const { id } = req.params;
      const { end_time } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid activity ID is required",
        });
      }

      if (end_time && isNaN(new Date(end_time).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end time format",
        });
      }

      const result = await ParkingActivityModel.endActivity(
        parseInt(id),
        end_time ? new Date(end_time) : null
      );

      if (!result.success) {
        const statusCode = result.error.includes("not found")
          ? 404
          : result.error.includes("already ended")
          ? 409
          : 500;
        return res.status(statusCode).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in endParkingActivity controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Update parking activity
  static async updateParkingActivity(req, res) {
    try {
      const { id } = req.params;
      const { user_id, start_time, end_time } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid activity ID is required",
        });
      }

      // Validation
      if (user_id !== undefined && isNaN(user_id)) {
        return res.status(400).json({
          success: false,
          message: "User ID must be a valid number",
        });
      }

      if (start_time && isNaN(new Date(start_time).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start time format",
        });
      }

      if (end_time && isNaN(new Date(end_time).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end time format",
        });
      }

      const updateData = {};
      if (user_id !== undefined) updateData.user_id = parseInt(user_id);
      if (start_time !== undefined)
        updateData.start_time = new Date(start_time);
      if (end_time !== undefined) updateData.end_time = new Date(end_time);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided for update",
        });
      }

      const result = await ParkingActivityModel.update(
        parseInt(id),
        updateData
      );

      if (!result.success) {
        const statusCode = result.error.includes("not found")
          ? 404
          : result.error.includes("User not found")
          ? 404
          : 500;
        return res.status(statusCode).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error(
        "Error in updateParkingActivity controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Delete parking activity
  static async deleteParkingActivity(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid activity ID is required",
        });
      }

      const result = await ParkingActivityModel.delete(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error(
        "Error in deleteParkingActivity controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking statistics
  static async getParkingStatistics(req, res) {
    try {
      const result = await ParkingActivityModel.getStatistics();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking statistics",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking statistics retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in getParkingStatistics controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = ParkingActivityController;
