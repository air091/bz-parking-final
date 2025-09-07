const parkingPaymentDB = require("../bz_database/db.js");

class ParkingPaymentModel {
  // Get all parking payments
  static async getAll() {
    try {
      const { results } = await parkingPaymentDB.query(`
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        ORDER BY pp.created_at DESC
      `);
      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Error getting all parking payments:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Get by ID
  static async getById(parkingPaymentId) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE pp.parking_payment_id = ?
      `,
        [parkingPaymentId]
      );

      if (results.length === 0) {
        return { success: false, error: "Parking payment not found" };
      }

      return { success: true, data: results[0] };
    } catch (error) {
      console.error("Error getting parking payment by ID:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Get by user
  static async getByUserId(userId) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE pp.user_id = ?
        ORDER BY pp.created_at DESC
      `,
        [userId]
      );

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error(
        "Error getting parking payments by user ID:",
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  // Get by activity
  static async getByActId(actId) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE pp.act_id = ?
        ORDER BY pp.created_at DESC
      `,
        [actId]
      );

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Error getting parking payments by act ID:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Get by payment method
  static async getByPaymentMethod(paymentMethod) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE pp.payment_method = ?
        ORDER BY pp.created_at DESC
      `,
        [paymentMethod]
      );

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error("Error getting parking payments by method:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Get by amount range
  static async getByAmountRange(minAmount, maxAmount) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE pp.amount BETWEEN ? AND ?
        ORDER BY pp.created_at DESC
      `,
        [minAmount, maxAmount]
      );

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error(
        "Error getting parking payments by amount range:",
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  // Get by date range (by created_at)
  static async getByDateRange(startDate, endDate) {
    try {
      const { results } = await parkingPaymentDB.query(
        `
        SELECT 
          pp.*,
          u.plate_number
        FROM parking_payment pp
        LEFT JOIN user u ON pp.user_id = u.user_id
        WHERE DATE(pp.created_at) BETWEEN ? AND ?
        ORDER BY pp.created_at DESC
      `,
        [startDate, endDate]
      );

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error(
        "Error getting parking payments by date range:",
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  // Create
  static async create(data) {
    try {
      const { user_id, act_id, amount, payment_method } = data;

      // Validate payment method
      if (!["gcash", "paymaya", "cash"].includes(payment_method)) {
        return {
          success: false,
          error: "Payment method must be 'gcash', 'paymaya', or 'cash'",
        };
      }

      // Validate amount - decimal(6,2) -> up to 9999.99
      if (amount <= 0 || amount > 9999.99) {
        return {
          success: false,
          error: "Amount must be between 0.01 and 9999.99",
        };
      }

      // Check user exists
      const userCheck = await parkingPaymentDB.query(
        `SELECT user_id FROM user WHERE user_id = ?`,
        [user_id]
      );
      if (userCheck.results.length === 0) {
        return { success: false, error: "User not found" };
      }

      // Check activity exists
      const actCheck = await parkingPaymentDB.query(
        `SELECT act_id FROM parking_activity WHERE act_id = ?`,
        [act_id]
      );
      if (actCheck.results.length === 0) {
        return { success: false, error: "Parking activity not found" };
      }

      const { results } = await parkingPaymentDB.query(
        `INSERT INTO parking_payment (user_id, act_id, amount, payment_method) VALUES (?, ?, ?, ?)`,
        [user_id, act_id, amount, payment_method]
      );

      const created = await this.getById(results.insertId);
      return {
        success: true,
        data: created.data,
        message: "Parking payment created successfully",
      };
    } catch (error) {
      console.error("Error creating parking payment:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Update
  static async update(parkingPaymentId, data) {
    try {
      const { user_id, act_id, amount, payment_method } = data;

      // Ensure exists
      const existing = await this.getById(parkingPaymentId);
      if (!existing.success) {
        return { success: false, error: "Parking payment not found" };
      }

      // Validate references if provided
      if (user_id !== undefined) {
        const userCheck = await parkingPaymentDB.query(
          `SELECT user_id FROM user WHERE user_id = ?`,
          [user_id]
        );
        if (userCheck.results.length === 0) {
          return { success: false, error: "User not found" };
        }
      }

      if (act_id !== undefined) {
        const actCheck = await parkingPaymentDB.query(
          `SELECT act_id FROM parking_activity WHERE act_id = ?`,
          [act_id]
        );
        if (actCheck.results.length === 0) {
          return { success: false, error: "Parking activity not found" };
        }
      }

      if (
        payment_method !== undefined &&
        !["gcash", "paymaya", "cash"].includes(payment_method)
      ) {
        return {
          success: false,
          error: "Payment method must be 'gcash', 'paymaya', or 'cash'",
        };
      }

      if (amount !== undefined && (amount <= 0 || amount > 9999.99)) {
        return {
          success: false,
          error: "Amount must be between 0.01 and 9999.99",
        };
      }

      const updateFields = [];
      const updateValues = [];

      if (user_id !== undefined) {
        updateFields.push("user_id = ?");
        updateValues.push(user_id);
      }
      if (act_id !== undefined) {
        updateFields.push("act_id = ?");
        updateValues.push(act_id);
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
        return { success: false, error: "No valid fields to update" };
      }

      updateValues.push(parkingPaymentId);

      const { results } = await parkingPaymentDB.query(
        `UPDATE parking_payment SET ${updateFields.join(
          ", "
        )} WHERE parking_payment_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "Parking payment not found or no changes made",
        };
      }

      const updated = await this.getById(parkingPaymentId);
      return {
        success: true,
        data: updated.data,
        message: "Parking payment updated successfully",
      };
    } catch (error) {
      console.error("Error updating parking payment:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Delete
  static async delete(parkingPaymentId) {
    try {
      const existing = await this.getById(parkingPaymentId);
      if (!existing.success) {
        return { success: false, error: "Parking payment not found" };
      }

      const { results } = await parkingPaymentDB.query(
        `DELETE FROM parking_payment WHERE parking_payment_id = ?`,
        [parkingPaymentId]
      );

      if (results.affectedRows === 0) {
        return { success: false, error: "Parking payment not found" };
      }

      return { success: true, message: "Parking payment deleted successfully" };
    } catch (error) {
      console.error("Error deleting parking payment:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Statistics
  static async getStatistics() {
    try {
      const { results } = await parkingPaymentDB.query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          COUNT(CASE WHEN payment_method = 'gcash' THEN 1 END) as gcash_count,
          COUNT(CASE WHEN payment_method = 'paymaya' THEN 1 END) as paymaya_count,
          COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count,
          SUM(CASE WHEN payment_method = 'gcash' THEN amount ELSE 0 END) as gcash_total,
          SUM(CASE WHEN payment_method = 'paymaya' THEN amount ELSE 0 END) as paymaya_total,
          SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_total
        FROM parking_payment
      `);

      return { success: true, data: results[0] };
    } catch (error) {
      console.error("Error getting parking payment statistics:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ParkingPaymentModel;
