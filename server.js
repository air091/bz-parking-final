const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ROUTES
const arduinoRouter = require("./routes/Arduino.routes.js");
const sensorRouter = require("./routes/Sensor.routes.js");
const parkingSlotRouter = require("./routes/ParkingSlot.routes.js");
const userRouter = require("./routes/User.routes.js");

// Import database connection
const database = require("./bz_database/db.js");

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use("/api/arduino", arduinoRouter);
app.use("/api/sensor", sensorRouter);
app.use("/api/parking-slot", parkingSlotRouter);
app.use("/api/user", userRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BZpark API Server is running!",
    version: "1.0.0",
    endpoints: {
      arduino: "/api/arduino",
      sensor: "/api/sensor",
      parkingSlot: "/api/parking-slot",
      user: "/api/user",
    },
    timestamp: new Date().toISOString(),
  });
});

// Test database connection on startup
const testDatabaseConnection = async () => {
  try {
    const isConnected = await database.testConnection();
    if (isConnected) {
      console.log("✅ Database connection established successfully");
    } else {
      console.log("❌ Database connection failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    // Test database connection first
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Database: ${process.env.DB_NAME || "bzpark_db_fix"}`);
      console.log(` API Base URL: http://localhost:${PORT}/api`);
      console.log("\n📋 Available Endpoints:");
      console.log("  Arduino:     http://localhost:" + PORT + "/api/arduino");
      console.log("  Sensor:      http://localhost:" + PORT + "/api/sensor");
      console.log(
        "  Parking:     http://localhost:" + PORT + "/api/parking-slot"
      );
      console.log("  User:        http://localhost:" + PORT + "/api/user");
    });
  } catch (error) {
    console.log("Failed to start server:", error.message);
    process.exit(1);
  }
};

// handle shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  try {
    await database.close();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("❌ Error closing database:", error.message);
  }
  process.exit(0);
});

startServer();
