const holdPaymentDB = require("../bz_database/db.js");
const parkingDB = require("../bz_database/db.js"); // Added parkingDB import

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

  // Get hold payments by is_done status
  static async getByDoneStatus(isDone) {
    try {
      const { results } = await holdPaymentDB.query(
        `SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.is_done = ?
        ORDER BY hp.created_at DESC`,
        [isDone ? 1 : 0]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error(
        "Error getting hold payments by done status:",
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get pending hold payments (is_done is NULL or 0)
  static async getPending() {
    try {
      const { results } = await holdPaymentDB.query(`
        SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.is_done IS NULL OR hp.is_done = 0
        ORDER BY hp.created_at DESC
      `);

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting pending hold payments:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get completed hold payments (is_done = 1)
  static async getCompleted() {
    try {
      const { results } = await holdPaymentDB.query(`
        SELECT 
          hp.*,
          u.plate_number
        FROM hold_payment hp
        LEFT JOIN user u ON hp.user_id = u.user_id
        WHERE hp.is_done = 1
        ORDER BY hp.created_at DESC
      `);

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting completed hold payments:", error.message);
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

  // Create new hold payment with slot availability check
  static async create(holdPaymentData) {
    try {
      const { user_id, amount, payment_method, is_done } = holdPaymentData;

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

      // Validate is_done if provided
      if (is_done !== undefined && typeof is_done !== "boolean") {
        return {
          success: false,
          error: "is_done must be a boolean value",
        };
      }

      // Check available parking slots
      const { results: availableSlots } = await parkingDB.query(`
        SELECT COUNT(*) as available_count 
        FROM parking_slot 
        WHERE status = 'available'
      `);

      // Count pending hold payments
      const { results: pendingHolds } = await parkingDB.query(`
        SELECT COUNT(*) as pending_count 
        FROM hold_payment 
        WHERE is_done IS NULL OR is_done = 0
      `);

      const availableCount = availableSlots[0]?.available_count || 0;
      const pendingCount = pendingHolds[0]?.pending_count || 0;

      // Check if we can create a new hold payment
      if (pendingCount >= availableCount) {
        return {
          success: false,
          error: `No available parking slots. ${availableCount} slots available, ${pendingCount} holds pending.`,
        };
      }

      const { results } = await parkingDB.query(
        `INSERT INTO hold_payment (user_id, amount, payment_method, is_done) VALUES (?, ?, ?, ?)`,
        [user_id, amount, payment_method, is_done || null]
      );

      const newHoldPayment = await this.getById(results.insertId);

      return {
        success: true,
        data: newHoldPayment.data,
        message: "Hold payment created successfully",
        availability: {
          availableSlots: availableCount,
          pendingHolds: pendingCount + 1,
          remainingSlots: availableCount - (pendingCount + 1),
        },
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
      const { user_id, amount, payment_method, is_done } = holdPaymentData;

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

      // Validate is_done if provided
      if (is_done !== undefined && typeof is_done !== "boolean") {
        return {
          success: false,
          error: "is_done must be a boolean value",
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

      if (is_done !== undefined) {
        updateFields.push("is_done = ?");
        updateValues.push(is_done ? 1 : 0);
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

  // Mark hold payment as done
  static async markAsDone(holdPaymentId) {
    try {
      const existingHoldPayment = await this.getById(holdPaymentId);
      if (!existingHoldPayment.success) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      const { results } = await holdPaymentDB.query(
        `UPDATE hold_payment SET is_done = 1 WHERE hold_payment_id = ?`,
        [holdPaymentId]
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
        message: "Hold payment marked as done successfully",
      };
    } catch (error) {
      console.error("Error marking hold payment as done:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Mark hold payment as pending
  static async markAsPending(holdPaymentId) {
    try {
      const existingHoldPayment = await this.getById(holdPaymentId);
      if (!existingHoldPayment.success) {
        return {
          success: false,
          error: "Hold payment not found",
        };
      }

      const { results } = await holdPaymentDB.query(
        `UPDATE hold_payment SET is_done = 0 WHERE hold_payment_id = ?`,
        [holdPaymentId]
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
        message: "Hold payment marked as pending successfully",
      };
    } catch (error) {
      console.error("Error marking hold payment as pending:", error.message);
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
          SUM(CASE WHEN payment_method = 'paymaya' THEN amount ELSE 0 END) as paymaya_total,
          COUNT(CASE WHEN is_done = 1 THEN 1 END) as completed_count,
          COUNT(CASE WHEN is_done = 0 OR is_done IS NULL THEN 1 END) as pending_count,
          SUM(CASE WHEN is_done = 1 THEN amount ELSE 0 END) as completed_total,
          SUM(CASE WHEN is_done = 0 OR is_done IS NULL THEN amount ELSE 0 END) as pending_total
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

  // Get parking slot availability information
  static async getSlotAvailability() {
    try {
      const { results: slotStats } = await parkingDB.query(`
        SELECT 
          COUNT(*) as total_slots,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_slots,
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_slots,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_slots
        FROM parking_slot
      `);

      const { results: holdStats } = await parkingDB.query(`
        SELECT 
          COUNT(CASE WHEN is_done IS NULL OR is_done = 0 THEN 1 END) as pending_holds,
          COUNT(CASE WHEN is_done = 1 THEN 1 END) as completed_holds
        FROM hold_payment
      `);

      const slots = slotStats[0] || {};
      const holds = holdStats[0] || {};

      return {
        success: true,
        data: {
          totalSlots: slots.total_slots || 0,
          availableSlots: slots.available_slots || 0,
          occupiedSlots: slots.occupied_slots || 0,
          maintenanceSlots: slots.maintenance_slots || 0,
          pendingHolds: holds.pending_holds || 0,
          completedHolds: holds.completed_holds || 0,
          availableForHolding: Math.max(
            0,
            (slots.available_slots || 0) - (holds.pending_holds || 0)
          ),
        },
      };
    } catch (error) {
      console.error("Error getting slot availability:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = HoldPaymentModel;
