const ServiceModel = require("../models/Service.models.js");

class ServiceController {
  static async getAllServices(req, res) {
    try {
      const result = await ServiceModel.getAll();
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Services retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve services",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getAllServices:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async getServiceById(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }
      const result = await ServiceModel.getById(parseInt(id));
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Service retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(404).json({
        success: false,
        message: "Service not found",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getServiceById:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async getServicesByVehicleType(req, res) {
    try {
      const { vehicleType } = req.params;
      if (!vehicleType || vehicleType.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Vehicle type is required" });
      }
      const result = await ServiceModel.getByVehicleType(vehicleType.trim());
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Services retrieved successfully",
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve services",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getServicesByVehicleType:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async createService(req, res) {
    try {
      const { vehicle_type, first_2_hrs, per_succ_hr } = req.body;
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No data provided",
          timestamp: new Date().toISOString(),
        });
      }
      const result = await ServiceModel.create({
        vehicle_type,
        first_2_hrs,
        per_succ_hr,
      });
      if (result.success) {
        return res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      }
      const statusCode = result.error.includes("exists") ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        message: "Failed to create service",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in createService:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async updateService(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
          error: "No update data provided",
          timestamp: new Date().toISOString(),
        });
      }
      const result = await ServiceModel.update(parseInt(id), req.body);
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      }
      const statusCode = result.error.includes("not found")
        ? 404
        : result.error.includes("exists")
        ? 409
        : 400;
      return res.status(statusCode).json({
        success: false,
        message: "Failed to update service",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateService:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async deleteService(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }
      const result = await ServiceModel.delete(parseInt(id));
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          deletedService: result.deletedService,
          timestamp: new Date().toISOString(),
        });
      }
      const statusCode = result.error.includes("not found") ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: "Failed to delete service",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in deleteService:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }

  static async getServiceStatistics(req, res) {
    try {
      const result = await ServiceModel.getStats();
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Service statistics retrieved successfully",
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve statistics",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getServiceStatistics:", error.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }
}

module.exports = ServiceController;
