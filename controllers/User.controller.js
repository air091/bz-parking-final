const UserModel = require("../models/User.models.js");

class UserController {
  // Get all users
  static async getAllUsers(req, res) {
    try {
      const result = await UserModel.getAll();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve users",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Users retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      console.error("Error in getAllUsers controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const result = await UserModel.getById(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in getUserById controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get user by plate number
  static async getUserByPlateNumber(req, res) {
    try {
      const { plateNumber } = req.params;

      if (!plateNumber) {
        return res.status(400).json({
          success: false,
          message: "Plate number is required",
        });
      }

      const result = await UserModel.getByPlateNumber(plateNumber);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in getUserByPlateNumber controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Create new user
  static async createUser(req, res) {
    try {
      const { plate_number } = req.body;

      // Validation
      if (!plate_number) {
        return res.status(400).json({
          success: false,
          message: "Plate number is required",
        });
      }

      if (
        typeof plate_number !== "string" ||
        plate_number.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Plate number must be a non-empty string",
        });
      }

      if (plate_number.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Plate number must not exceed 20 characters",
        });
      }

      const result = await UserModel.create({
        plate_number: plate_number.trim(),
      });

      if (!result.success) {
        const statusCode = result.error.includes("already exists") ? 409 : 500;
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
      console.error("Error in createUser controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { plate_number } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      // Validation
      if (plate_number !== undefined) {
        if (
          typeof plate_number !== "string" ||
          plate_number.trim().length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Plate number must be a non-empty string",
          });
        }

        if (plate_number.length > 20) {
          return res.status(400).json({
            success: false,
            message: "Plate number must not exceed 20 characters",
          });
        }
      }

      const updateData = {};
      if (plate_number !== undefined) {
        updateData.plate_number = plate_number.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided for update",
        });
      }

      const result = await UserModel.update(parseInt(id), updateData);

      if (!result.success) {
        const statusCode = result.error.includes("not found")
          ? 404
          : result.error.includes("already exists")
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
      console.error("Error in updateUser controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const result = await UserModel.delete(parseInt(id));

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
      console.error("Error in deleteUser controller:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Search users by plate number
  static async searchUsersByPlateNumber(req, res) {
    try {
      const { search } = req.query;

      if (!search || search.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const result = await UserModel.searchByPlateNumber(search.trim());

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to search users",
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Search completed successfully",
        data: result.data,
        count: result.count,
        searchTerm: search.trim(),
      });
    } catch (error) {
      console.error(
        "Error in searchUsersByPlateNumber controller:",
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

module.exports = UserController;
