const holdPaymentDB = require("../bz_database/db.js");

class HoldPaymentModel {
  // Get all hold payments
  static async getAll() {
    try {
      const { results } = await holdPaymentDB.query(`
        SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        ORDER BY hp.created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all hold payments:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payment by ID
  static async getById(holdPaymentId) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.hold_payment_id = ?`,
        [holdPaymentId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting hold payment by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payments by user ID
  static async getByUserId(userId) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.user_id = ?
        ORDER BY hp.created_at DESC`,
        [userId]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting hold payments by user ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payments by payment method
  static async getByPaymentMethod(paymentMethod) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.payment_method = ?
        ORDER BY hp.created_at DESC`,
        [paymentMethod]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting hold payments by payment method:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payments by amount range
  static async getByAmountRange(minAmount, maxAmount) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.amount BETWEEN ? AND ?
        ORDER BY hp.created_at DESC`,
        [minAmount, maxAmount]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting hold payments by amount range:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payments by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE DATE(hp.created_at) BETWEEN ? AND ?
        ORDER BY hp.created_at DESC`,
        [startDate, endDate]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting hold payments by date range:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new hold payment
  static async create(holdPaymentData) {
    try {
      const { user_id, amount, payment_method } = holdPaymentData;

      // Validate payment method
      if (!["gcash", "paymaya"].includes(payment_method)) {
        return {
          success: false,
          error: "Payment method must be either 'gcash' or 'paymaya'",
        };
      }

      // Validate amount
      if (amount <= 0 || amount > 999.99) {
        return {
          success: false,
          error: "Amount must be between 0.01 and 999.99",
        };
      }

      const { results } = await holdPaymentDB.query(
        `INSERT INTO hold_payment (user_id, amount, payment_method) VALUES (?, ?, ?)`,
        [user_id, amount, payment_method]
      );

      const newHoldPayment = await this.getById(results.insertId);

      return {
        success: true,
        data: newHoldPayment.data,
        message: "Hold payment created successfully",
      };
    } catch (error) {
      console.error("Error creating hold payment:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update hold payment
  static async update(holdPaymentId, holdPaymentData) {
    try {
      const { user_id, amount, payment_method } = holdPaymentData;

      // Check if hold payment exists
      const existingHoldPayment = await this.getById(holdPaymentId);
      if (!existingHoldPayment.success) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      // Validate payment method if provided
      if (payment_method && !["gcash", "paymaya"].includes(payment_method)) {
        return {
          success: false,
          error: "Payment method must be either 'gcash' or 'paymaya'",
        };
      }

      // Validate amount if provided
      if (amount !== undefined && (amount <= 0 || amount > 999.99)) {
        return {
          success: false,
          error: "Amount must be between 0.01 and 999.99",
        };
      }

      const updateFields = [];
      const updateValues = [];

      if (user_id !== undefined) {
        updateFields.push("user_id = ?");
        updateValues.push(user_id);
      }

      if (amount !== undefined) {
        updateFields.push("amount = ?");
        updateValues.push(amount);
      }

      if (payment_method !== undefined) {
        updateFields.push("payment_method = ?");
        updateValues.push(payment_method);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(holdPaymentId);

      const { results } = await holdPaymentDB.query(
        `UPDATE hold_payment SET ${updateFields.join(
          ", "
        )} WHERE hold_payment_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Hold payment not found or no changes made",
        };
      }

      const updatedHoldPayment = await this.getById(holdPaymentId);

      return {
        success: true,
        data: updatedHoldPayment.data,
        message: "Hold payment updated successfully",
      };
    } catch (error) {
      console.error("Error updating hold payment:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete hold payment
  static async delete(holdPaymentId) {
    try {
      // Check if hold payment exists
      const existingHoldPayment = await this.getById(holdPaymentId);
      if (!existingHoldPayment.success) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      const { results } = await holdPaymentDB.query(
        `DELETE FROM hold_payment WHERE hold_payment_id = ?`,
        [holdPaymentId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      return {
        success: true,
        message: "Hold payment deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting hold payment:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hold payment statistics
  static async getStatistics() {
    try {
      const { results } = await holdPaymentDB.query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          COUNT(CASE WHEN payment_method = 'gcash' THEN 1 END) as gcash_count,
          COUNT(CASE WHEN payment_method = 'paymaya' THEN 1 END) as paymaya_count,
          SUM(CASE WHEN payment_method = 'gcash' THEN amount ELSE 0 END) as gcash_total,
          SUM(CASE WHEN payment_method = 'paymaya' THEN amount ELSE 0 END) as paymaya_total
        FROM hold_payment
      `);

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting hold payment statistics:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = HoldPaymentModel;
