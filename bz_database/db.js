const mysql2 = require("mysql2");
require("dotenv").config();

class bzParkingDatabase {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    try {
      this.pool = mysql2.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "root",
        database: process.env.DB_NAME || "bzpark_db_fix",
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
      });

      console.log("Database connection pool created successfully");
    } catch (error) {
      console.error(
        "Failed to create database connection pool:",
        error.message
      );
      throw error;
    }
  }

  // Get a connection from the pool
  getConnection() {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error getting database connection:", err.message);
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });
  }

  // Execute a query with automatic connection management
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.pool.execute(sql, params, (err, results, fields) => {
        if (err) {
          console.error("Database query error:", err.message);
          reject(err);
        } else {
          resolve({ results, fields });
        }
      });
    });
  }

  // Test database connection
  async testConnection() {
    try {
      const { results } = await this.query("SELECT 1 as test");
      console.log("Database connection test successful");
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error.message);
      return false;
    }
  }

  // Close all connections in the pool
  close() {
    return new Promise((resolve) => {
      if (this.pool) {
        this.pool.end((err) => {
          if (err) {
            console.error("Error closing database pool:", err.message);
          } else {
            console.log("Database connection pool closed");
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Create and export a singleton instance
const database = new bzParkingDatabase();
module.exports = database;
