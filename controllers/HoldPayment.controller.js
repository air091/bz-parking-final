const HoldPaymentModel = require("../models/HoldPayment.models.js");

class HoldPaymentController {
  // Get all hold payments
  static async getAllHoldPayments(req, res) {
    try {
      const result = await HoldPaymentModel.getAll();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error("Error in getAllHoldPayments controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payment by ID
  static async getHoldPaymentById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid hold payment ID is required",
        });
      }

      const result = await HoldPaymentModel.getById(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payment retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in getHoldPaymentById controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payments by user ID
  static async getHoldPaymentsByUserId(req, res) {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const result = await HoldPaymentModel.getByUserId(parseInt(userId));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getHoldPaymentsByUserId controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payments by payment method
  static async getHoldPaymentsByPaymentMethod(req, res) {
    try {
      const { method } = req.params;

      if (!method || !["gcash", "paymaya"].includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Valid payment method (gcash or paymaya) is required",
        });
      }

      const result = await HoldPaymentModel.getByPaymentMethod(method);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payments retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error(
        "Error in getHoldPaymentsByPaymentMethod controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payments by amount range
  static async getHoldPaymentsByAmountRange(req, res) {
    try {
      const { minAmount, maxAmount } = req.query;

      if (!minAmount || !maxAmount) {
        return res.status(400).json({
          success: false,
          message: "Minimum and maximum amount are required",
        });
      }

      const min = parseFloat(minAmount);
      const max = parseFloat(maxAmount);

      if (isNaN(min) || isNaN(max) || min < 0 || max < 0 || min > max) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid amount range. Min and max must be valid numbers and min <= max",
        });
      }

      const result = await HoldPaymentModel.getByAmountRange(min, max);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payments retrieved successfully",
        data: result.data,
        count: result.count,
        amountRange: { minAmount: min, maxAmount: max },
      });
    } catch (error) {
      console.error(
        "Error in getHoldPaymentsByAmountRange controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payments by date range
  static async getHoldPaymentsByDateRange(req, res) {
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

      const result = await HoldPaymentModel.getByDateRange(startDate, endDate);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payments",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payments retrieved successfully",
        data: result.data,
        count: result.count,
        dateRange: { startDate, endDate },
      });
    } catch (error) {
      console.error(
        "Error in getHoldPaymentsByDateRange controller:",
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Create new hold payment
  static async createHoldPayment(req, res) {
    try {
      const { user_id, amount, payment_method } = req.body;

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

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: "Amount is required",
        });
      }

      if (isNaN(amount) || amount <= 0 || amount > 999.99) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid number between 0.01 and 999.99",
        });
      }

      if (!payment_method) {
        return res.status(400).json({
          success: false,
          message: "Payment method is required",
        });
      }

      if (!["gcash", "paymaya"].includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: "Payment method must be either 'gcash' or 'paymaya'",
        });
      }

      const holdPaymentData = {
        user_id: parseInt(user_id),
        amount: parseFloat(amount),
        payment_method,
      };

      const result = await HoldPaymentModel.create(holdPaymentData);

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
      console.error("Error in createHoldPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Update hold payment
  static async updateHoldPayment(req, res) {
    try {
      const { id } = req.params;
      const { user_id, amount, payment_method } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid hold payment ID is required",
        });
      }

      // Validation
      if (user_id !== undefined && isNaN(user_id)) {
        return res.status(400).json({
          success: false,
          message: "User ID must be a valid number",
        });
      }

      if (
        amount !== undefined &&
        (isNaN(amount) || amount <= 0 || amount > 999.99)
      ) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid number between 0.01 and 999.99",
        });
      }

      if (
        payment_method !== undefined &&
        !["gcash", "paymaya"].includes(payment_method)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment method must be either 'gcash' or 'paymaya'",
        });
      }

      const updateData = {};
      if (user_id !== undefined) updateData.user_id = parseInt(user_id);
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (payment_method !== undefined)
        updateData.payment_method = payment_method;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided for update",
        });
      }

      const result = await HoldPaymentModel.update(parseInt(id), updateData);

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
      console.error("Error in updateHoldPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Delete hold payment
  static async deleteHoldPayment(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid hold payment ID is required",
        });
      }

      const result = await HoldPaymentModel.delete(parseInt(id));

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
      console.error("Error in deleteHoldPayment controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get hold payment statistics
  static async getHoldPaymentStatistics(req, res) {
    try {
      const result = await HoldPaymentModel.getStatistics();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve hold payment statistics",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Hold payment statistics retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error(
        "Error in getHoldPaymentStatistics controller:",
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

module.exports = HoldPaymentController;
