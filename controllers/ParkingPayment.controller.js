const ParkingPaymentModel = require("../models/ParkingPayment.models.js");

class ParkingPaymentController {
  // Get all parking payments
  static async getAllParkingPayments(req, res) {
    try {
      const result = await ParkingPaymentModel.getAll();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getAllParkingPayments controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payment by ID
  static async getParkingPaymentById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid parking payment ID is required",
        });
      }

      const result = await ParkingPaymentModel.getById(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payment retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentById controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payments by user ID
  static async getParkingPaymentsByUserId(req, res) {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const result = await ParkingPaymentModel.getByUserId(parseInt(userId));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentsByUserId controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payments by activity ID
  static async getParkingPaymentsByActId(req, res) {
    try {
      const { actId } = req.params;

      if (!actId || isNaN(actId)) {
        return res.status(400).json({
          success: false,
          message: "Valid activity ID is required",
        });
      }

      const result = await ParkingPaymentModel.getByActId(parseInt(actId));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentsByActId controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payments by payment method
  static async getParkingPaymentsByPaymentMethod(req, res) {
    try {
      const { method } = req.params;

      if (!method || !["gcash", "paymaya", "cash"].includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Valid payment method (gcash, paymaya, cash) is required",
        });
      }

      const result = await ParkingPaymentModel.getByPaymentMethod(method);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentsByPaymentMethod controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payments by date range
  static async getParkingPaymentsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

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

      const result = await ParkingPaymentModel.getByDateRange(
        startDate,
        endDate
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payments retrieved successfully",
        data: result.data,
        count: result.count,
        dateRange: { startDate, endDate },
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentsByDateRange controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Create parking payment
  static async createParkingPayment(req, res) {
    try {
      const { user_id, act_id, payment_method } = req.body;

      if (!user_id || isNaN(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid user_id is required",
        });
      }
      if (!act_id || isNaN(act_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid act_id is required",
        });
      }
      if (
        !payment_method ||
        !["gcash", "paymaya", "cash"].includes(payment_method)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment method must be 'gcash', 'paymaya', or 'cash'",
        });
      }

      const payload = {
        user_id: parseInt(user_id),
        act_id: parseInt(act_id),
        payment_method,
      };

      const result = await ParkingPaymentModel.create(payload);

      if (!result.success) {
        return res.status(400).json({
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
      console.error("Error in createParkingPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Update parking payment
  static async updateParkingPayment(req, res) {
    try {
      const { id } = req.params;
      const { user_id, act_id, payment_method } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid parking payment ID is required",
        });
      }

      if (user_id !== undefined && isNaN(user_id)) {
        return res.status(400).json({
          success: false,
          message: "user_id must be a valid number",
        });
      }
      if (act_id !== undefined && isNaN(act_id)) {
        return res.status(400).json({
          success: false,
          message: "act_id must be a valid number",
        });
      }
      if (
        payment_method !== undefined &&
        !["gcash", "paymaya", "cash"].includes(payment_method)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment method must be 'gcash', 'paymaya', or 'cash'",
        });
      }

      const updateData = {};
      if (user_id !== undefined) updateData.user_id = parseInt(user_id);
      if (act_id !== undefined) updateData.act_id = parseInt(act_id);
      if (payment_method !== undefined)
        updateData.payment_method = payment_method;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided for update",
        });
      }

      const result = await ParkingPaymentModel.update(parseInt(id), updateData);

      if (!result.success) {
        const statusCode = result.error.includes("not found") ? 404 : 400;
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
      console.error("Error in updateParkingPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Delete parking payment
  static async deleteParkingPayment(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid parking payment ID is required",
        });
      }

      const result = await ParkingPaymentModel.delete(parseInt(id));

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
      console.error("Error in deleteParkingPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get parking payment statistics
  static async getParkingPaymentStatistics(req, res) {
    try {
      const result = await ParkingPaymentModel.getStatistics();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve parking payment statistics",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Parking payment statistics retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error(
        "Error in getParkingPaymentStatistics controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = ParkingPaymentController;
