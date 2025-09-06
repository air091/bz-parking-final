const userDB = require("../bz_database/db.js");

class UserModel {
  // Get all users
  static async getAll() {
    try {
      const { results } = await userDB.query(`
        SELECT * FROM user 
        ORDER BY created_at DESC
      `);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error getting all users:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get user by ID
  static async getById(userId) {
    try {
      const { results } = await userDB.query(
        `SELECT * FROM user WHERE user_id = ?`,
        [userId]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting user by ID:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get user by plate number
  static async getByPlateNumber(plateNumber) {
    try {
      const { results } = await userDB.query(
        `SELECT * FROM user WHERE plate_number = ?`,
        [plateNumber]
      );

      if (results.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      console.error("Error getting user by plate number:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { plate_number } = userData;

      // Check if plate number already exists
      const existingUser = await this.getByPlateNumber(plate_number);
      if (existingUser.success) {
        return {
          success: false,
          error: "User with this plate number already exists",
        };
      }

      const { results } = await userDB.query(
        `INSERT INTO user (plate_number) VALUES (?)`,
        [plate_number]
      );

      const newUser = await this.getById(results.insertId);

      return {
        success: true,
        data: newUser.data,
        message: "User created successfully",
      };
    } catch (error) {
      console.error("Error creating user:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update user
  static async update(userId, userData) {
    try {
      const { plate_number } = userData;

      // Check if user exists
      const existingUser = await this.getById(userId);
      if (!existingUser.success) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Check if plate number already exists for another user
      if (plate_number) {
        const userWithPlate = await this.getByPlateNumber(plate_number);
        if (userWithPlate.success && userWithPlate.data.user_id !== userId) {
          return {
            success: false,
            error: "Plate number already exists for another user",
          };
        }
      }

      const updateFields = [];
      const updateValues = [];

      if (plate_number !== undefined) {
        updateFields.push("plate_number = ?");
        updateValues.push(plate_number);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      updateValues.push(userId);

      const { results } = await userDB.query(
        `UPDATE user SET ${updateFields.join(", ")} WHERE user_id = ?`,
        updateValues
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "User not found or no changes made",
        };
      }

      const updatedUser = await this.getById(userId);

      return {
        success: true,
        data: updatedUser.data,
        message: "User updated successfully",
      };
    } catch (error) {
      console.error("Error updating user:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete user
  static async delete(userId) {
    try {
      // Check if user exists
      const existingUser = await this.getById(userId);
      if (!existingUser.success) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const { results } = await userDB.query(
        `DELETE FROM user WHERE user_id = ?`,
        [userId]
      );

      if (results.affectedRows === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting user:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search users by plate number (partial match)
  static async searchByPlateNumber(searchTerm) {
    try {
      const { results } = await userDB.query(
        `SELECT * FROM user WHERE plate_number LIKE ? ORDER BY created_at DESC`,
        [`%${searchTerm}%`]
      );

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error searching users by plate number:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = UserModel;
