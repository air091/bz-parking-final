// sensorServer.js
// Enhanced version with database integration for auto-detection
// .env variables (create a .env file next to this file):
// BACKEND_URL=http://localhost:8888
// COM_PORT=COM5
// BAUD_RATE=9600
// AUTO_DETECT_SENSORS=true  // New: Enable auto-detection from database

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const http = require("http");
const https = require("https");

const app = express();
app.use(cors());
const localApiPort = 8000;

const BACKEND_URL = (
  process.env.BACKEND_URL || "http://localhost:8888"
).replace(/\/+$/, "");
const COM_PORT = process.env.COM_PORT || "COM5";
const BAUD_RATE = parseInt(process.env.BAUD_RATE || "9600", 10);
const AUTO_DETECT_SENSORS = process.env.AUTO_DETECT_SENSORS === "true";

// Reuse HTTP connections for speed
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 10000,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 10000,
});

// Dynamic sensor mapping
let sensorMapping = new Map(); // IP -> { arduinoId, sensor1Id, sensor2Id, location }
let latestData = { sensor1In: null, sensor2In: null };

// Enhanced state tracking for multiple devices
let deviceStates = new Map(); // arduinoId -> { expectNext, lastPlainAt, sensor1Id, sensor2Id }
let lastPlainAt = 0;
const SEQ_RESET_MS = 2000; // reset alternation if gap > 2s

// Utility function to make HTTP requests
function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      agent,
      ...options,
    };

    const started = Date.now();
    const req = transport.request(url, requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const duration = Date.now() - started;
        try {
          const response = JSON.parse(data);
          resolve({ response, statusCode: res.statusCode, duration });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Request timeout"));
      reject(new Error("Request timeout"));
    });

    req.on("error", (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });

    req.end();
  });
}

// Fetch sensor mapping from database with improved error handling
async function fetchSensorMapping() {
  try {
    console.log("🔄 Fetching sensor mapping from database...");

    // Get all Arduino devices
    const arduinoUrl = new URL(`${BACKEND_URL}/api/arduino`);
    const {
      response: arduinoResponse,
      statusCode,
      duration,
    } = await makeHttpRequest(arduinoUrl);

    console.log(
      `[BACKEND ${statusCode} in ${duration}ms] Fetched Arduino devices`
    );

    if (!arduinoResponse.success || !arduinoResponse.data) {
      console.log("❌ Failed to fetch Arduino devices from backend");
      return new Map();
    }

    const mapping = new Map();
    const sensorPromises = [];

    // Process each Arduino device
    for (const arduino of arduinoResponse.data) {
      const sensorPromise = (async () => {
        try {
          // Get sensors for this Arduino
          const sensorUrl = new URL(
            `${BACKEND_URL}/api/arduino/${arduino.arduino_id}/sensors`
          );
          const { response: sensorResponse } = await makeHttpRequest(sensorUrl);

          if (sensorResponse.success && sensorResponse.data) {
            const sensors = sensorResponse.data;
            const ultrasonicSensors = sensors.filter(
              (s) => s.sensor_type === "ultrasonic"
            );

            if (ultrasonicSensors.length >= 2) {
              const sensor1 = ultrasonicSensors[0];
              const sensor2 = ultrasonicSensors[1];

              mapping.set(arduino.ip_address, {
                arduinoId: arduino.arduino_id,
                location: arduino.location,
                sensor1Id: sensor1.sensor_id,
                sensor2Id: sensor2.sensor_id,
              });

              // Initialize device state
              deviceStates.set(arduino.arduino_id, {
                expectNext: 1,
                lastPlainAt: 0,
                sensor1Id: sensor1.sensor_id,
                sensor2Id: sensor2.sensor_id,
              });

              console.log(
                `📡 Mapped ${arduino.location} (${arduino.ip_address}): Sensor1=${sensor1.sensor_id}, Sensor2=${sensor2.sensor_id}`
              );
            } else if (ultrasonicSensors.length === 1) {
              const sensor1 = ultrasonicSensors[0];

              mapping.set(arduino.ip_address, {
                arduinoId: arduino.arduino_id,
                location: arduino.location,
                sensor1Id: sensor1.sensor_id,
                sensor2Id: null,
              });

              deviceStates.set(arduino.arduino_id, {
                expectNext: 1,
                lastPlainAt: 0,
                sensor1Id: sensor1.sensor_id,
                sensor2Id: null,
              });

              console.log(
                `📡 Mapped ${arduino.location} (${arduino.ip_address}): Sensor1=${sensor1.sensor_id} (single sensor)`
              );
            }
          }
        } catch (error) {
          console.error(
            `❌ Error fetching sensors for Arduino ${arduino.arduino_id}:`,
            error.message
          );
        }
      })();

      sensorPromises.push(sensorPromise);
    }

    // Wait for all sensor requests to complete
    await Promise.all(sensorPromises);

    sensorMapping = mapping;
    console.log(`✅ Sensor mapping updated: ${mapping.size} devices mapped`);

    return mapping;
  } catch (error) {
    console.error("❌ Failed to fetch sensor mapping:", error.message);
    return new Map();
  }
}

// List available ports (debug)
SerialPort.list()
  .then((ports) => {
    console.log("🔌 Available ports:");
    ports.forEach((p) =>
      console.log(`  - ${p.path} (${p.manufacturer || "Unknown"})`)
    );
  })
  .catch((err) => console.error("❌ Error listing ports:", err));

// Configure serial port with better error handling
let serialPort;
let parser;

try {
  serialPort = new SerialPort(
    { path: COM_PORT, baudRate: BAUD_RATE },
    (err) => {
      if (err) {
        console.error(
          `❌ Failed to open serial port ${COM_PORT}:`,
          err.message
        );
        console.log(
          "💡 Make sure the device is connected and the port is correct"
        );
        return;
      }
      console.log(`✅ Serial port ${COM_PORT} opened @ ${BAUD_RATE} baud`);
      setTimeout(() => console.log("🚀 Ready to receive data"), 2000);
    }
  );

  parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));
} catch (error) {
  console.error("❌ Error initializing serial port:", error.message);
  process.exit(1);
}

// Per-sensor rate limiting
const lastSentValue = {};
const lastSentAt = {};
const MIN_INTERVAL_MS = 300; // faster sending
const MIN_CHANGE = 1; // ignore +/-1 cm noise

// Enhanced sensor range update function
async function putSensorRange(sensorId, rangeIn) {
  try {
    // Validate sensor range
    if (typeof rangeIn !== "number" || rangeIn < 0 || rangeIn > 1000) {
      console.warn(
        `⚠️ Invalid sensor range for sensor ${sensorId}: ${rangeIn}`
      );
      return;
    }

    const url = new URL(`${BACKEND_URL}/api/sensor/${sensorId}`);
    const body = JSON.stringify({
      sensor_range: Math.round(rangeIn),
      status: rangeIn > 0 ? "working" : "maintenance",
    });

    const { response, statusCode, duration } = await makeHttpRequest(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    });

    let message = response?.message || `Status: ${statusCode}`;
    console.log(
      `[BACKEND ${statusCode} in ${duration}ms] sensor_id=${sensorId} -> ${message}`
    );
  } catch (error) {
    console.error(
      `❌ Backend request error (sensor_id=${sensorId}):`,
      error.message
    );
  }
}

// Rate limiting function
function maybeSend(sensorId, rangeIn) {
  if (!sensorId) return;

  const now = Date.now();
  const prev = lastSentValue[sensorId];
  const changedEnough =
    prev === undefined || Math.abs(rangeIn - prev) >= MIN_CHANGE;
  const intervalOk = now - (lastSentAt[sensorId] || 0) >= MIN_INTERVAL_MS;

  if (changedEnough && intervalOk) {
    lastSentValue[sensorId] = rangeIn;
    lastSentAt[sensorId] = now;
    putSensorRange(sensorId, rangeIn);
  }
}

// Enhanced sensor ID detection with proper device handling
function getSensorIdForValue(value, arduinoId = null) {
  // If we have database mapping, use it
  if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
    // If arduinoId is provided, use that device's state
    if (arduinoId && deviceStates.has(arduinoId)) {
      const deviceState = deviceStates.get(arduinoId);
      if (deviceState.expectNext === 1 && deviceState.sensor1Id) {
        return deviceState.sensor1Id;
      } else if (deviceState.expectNext === 2 && deviceState.sensor2Id) {
        return deviceState.sensor2Id;
      } else if (deviceState.sensor1Id) {
        return deviceState.sensor1Id; // Fallback to sensor1
      }
    }

    // Fallback to first available device
    const devices = Array.from(sensorMapping.values());
    if (devices.length > 0) {
      const device = devices[0];
      const deviceState = deviceStates.get(device.arduinoId);
      if (deviceState) {
        if (deviceState.expectNext === 1 && deviceState.sensor1Id) {
          return deviceState.sensor1Id;
        } else if (deviceState.expectNext === 2 && deviceState.sensor2Id) {
          return deviceState.sensor2Id;
        } else if (deviceState.sensor1Id) {
          return deviceState.sensor1Id;
        }
      }
    }
  }

  // Fallback to environment variables (legacy mode)
  const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
  const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);

  if (expectNext === 1 || !SENSOR_ID2) {
    return SENSOR_ID1;
  } else {
    return SENSOR_ID2;
  }
}

// Update device state after sensor reading
function updateDeviceState(arduinoId, sensorId) {
  if (!AUTO_DETECT_SENSORS || !deviceStates.has(arduinoId)) return;

  const deviceState = deviceStates.get(arduinoId);
  if (deviceState.sensor1Id === sensorId) {
    deviceState.expectNext = deviceState.sensor2Id ? 2 : 1;
  } else if (deviceState.sensor2Id === sensorId) {
    deviceState.expectNext = 1;
  }
}

// Enhanced data parser with better error handling
parser.on("data", (data) => {
  try {
    const raw = String(data || "").trim();
    if (!raw) return;

    // Optional S1:/S2: override (still supported)
    let targetOverride = null;
    let arduinoId = null;
    const m = raw.match(/^\s*S([12])\s*:\s*(.+)$/i);
    const payload = m ? m[2].trim() : raw;

    if (m) {
      // Use database mapping for S1/S2 override
      if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
        const devices = Array.from(sensorMapping.values());
        if (devices.length > 0) {
          const device = devices[0]; // Use first device for override
          arduinoId = device.arduinoId;
          targetOverride = m[1] === "1" ? device.sensor1Id : device.sensor2Id;
        }
      } else {
        // Legacy mode
        const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
        const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);
        targetOverride = m[1] === "1" ? SENSOR_ID1 : SENSOR_ID2;
      }
    }

    // Case 0: known status/noise lines → ignore silently
    if (
      /^arduino ready|^waiting for|^received command|^error:/i.test(payload)
    ) {
      return;
    }

    // Case 1: plain number → route to appropriate sensor
    if (/^\d+(\.\d+)?$/.test(payload)) {
      const valueIn = Math.round(Number(payload));
      const now = Date.now();

      // Reset alternation if long gap between plain numbers
      if (now - lastPlainAt > SEQ_RESET_MS) {
        if (AUTO_DETECT_SENSORS) {
          // Reset all device states
          deviceStates.forEach((state) => {
            state.expectNext = 1;
          });
        } else {
          expectNext = 1;
        }
      }
      lastPlainAt = now;

      let targetId = targetOverride;
      if (!targetId) {
        targetId = getSensorIdForValue(valueIn, arduinoId);

        // Update device state for next reading
        if (targetId && arduinoId) {
          updateDeviceState(arduinoId, targetId);
        } else if (targetId && !AUTO_DETECT_SENSORS) {
          expectNext = expectNext === 1 ? 2 : 1;
        }
      }

      // Update latest data
      if (targetId) {
        const deviceState = arduinoId ? deviceStates.get(arduinoId) : null;
        if (deviceState) {
          if (targetId === deviceState.sensor1Id) {
            latestData.sensor1In = valueIn;
          } else if (targetId === deviceState.sensor2Id) {
            latestData.sensor2In = valueIn;
          }
        } else {
          // Legacy mode
          if (expectNext === 1) {
            latestData.sensor1In = valueIn;
          } else {
            latestData.sensor2In = valueIn;
          }
        }
      }

      console.log(`📡 Ultrasonic sensor_id=${targetId}: ${valueIn}cm`);
      maybeSend(targetId, valueIn);
      return;
    }

    // Case 1b: ESP/Arduino formats: "DISTANCE1: xx IN", "DISTANCE2: yy IN"
    let dm = payload.match(/^DISTANCE([12])\s*:\s*([-\d.]+)/i);
    if (dm) {
      const which = dm[1] === "1" ? 1 : 2;
      const num = Math.round(Number(dm[2]));

      let targetId = null;
      if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
        const devices = Array.from(sensorMapping.values());
        if (devices.length > 0) {
          const device = devices[0];
          const deviceState = deviceStates.get(device.arduinoId);
          if (deviceState) {
            targetId =
              which === 1 ? deviceState.sensor1Id : deviceState.sensor2Id;
          }
        }
      } else {
        // Legacy mode
        const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
        const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);
        targetId = which === 1 ? SENSOR_ID1 : SENSOR_ID2;
      }

      if (targetId) {
        if (which === 1) latestData.sensor1In = num;
        if (which === 2) latestData.sensor2In = num;
        console.log(`📡 Ultrasonic sensor_id=${targetId}: ${num}cm`);
        maybeSend(targetId, num);
      }
      return;
    }

    // Case 1c: "DISTANCES: S1=xx IN, S2=yy IN"
    dm = payload.match(
      /^DISTANCES\s*:\s*S1\s*=\s*([-\d.]+).*S2\s*=\s*([-\d.]+)/i
    );
    if (dm) {
      const n1 = Math.round(Number(dm[1]));
      const n2 = Math.round(Number(dm[2]));

      if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
        const devices = Array.from(sensorMapping.values());
        if (devices.length > 0) {
          const device = devices[0];
          const deviceState = deviceStates.get(device.arduinoId);
          if (deviceState) {
            if (deviceState.sensor1Id) {
              latestData.sensor1In = n1;
              console.log(
                `📡 Ultrasonic sensor_id=${deviceState.sensor1Id}: ${n1}cm`
              );
              maybeSend(deviceState.sensor1Id, n1);
            }
            if (deviceState.sensor2Id) {
              latestData.sensor2In = n2;
              console.log(
                `📡 Ultrasonic sensor_id=${deviceState.sensor2Id}: ${n2}cm`
              );
              maybeSend(deviceState.sensor2Id, n2);
            }
          }
        }
      } else {
        // Legacy mode
        const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
        const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);

        if (SENSOR_ID1) {
          latestData.sensor1In = n1;
          console.log(`📡 Ultrasonic sensor_id=${SENSOR_ID1}: ${n1}cm`);
          maybeSend(SENSOR_ID1, n1);
        }
        if (SENSOR_ID2) {
          latestData.sensor2In = n2;
          console.log(`📡 Ultrasonic sensor_id=${SENSOR_ID2}: ${n2}cm`);
          maybeSend(SENSOR_ID2, n2);
        }
      }
      return;
    }

    // Case 2: JSON → existing key-based routing (only if looks like JSON)
    if (/^[\[{]/.test(payload)) {
      try {
        const parsed = JSON.parse(payload);
        for (const [key, val] of Object.entries(parsed)) {
          if (val == null || !isFinite(val)) continue;
          const valueIn = Math.round(Number(val));
          const targetId = getSensorIdForValue(valueIn, arduinoId);

          if (targetId) {
            const deviceState = arduinoId ? deviceStates.get(arduinoId) : null;
            if (deviceState) {
              if (targetId === deviceState.sensor1Id) {
                latestData.sensor1In = valueIn;
              } else if (targetId === deviceState.sensor2Id) {
                latestData.sensor2In = valueIn;
              }
            } else {
              if (expectNext === 1) {
                latestData.sensor1In = valueIn;
              } else {
                latestData.sensor2In = valueIn;
              }
            }

            console.log(`📡 Ultrasonic sensor_id=${targetId}: ${valueIn}cm`);
            maybeSend(targetId, valueIn);
          }
        }
      } catch (jsonError) {
        console.warn(`⚠️ JSON parse error: ${jsonError.message}`);
      }
      return;
    }

    // Unknown/unhandled line → log for debugging but don't spam
    if (payload.length > 0 && !/^\s*$/.test(payload)) {
      console.log(`📝 Unhandled data: ${payload}`);
    }
  } catch (error) {
    console.error("❌ Parse error:", error.message);
  }
});

serialPort.on("error", (error) => {
  console.error("❌ Serial port error:", error.message);
});

// Local endpoint to view last readings
app.get("/api/sensor", (_req, res) => {
  res.json({
    success: true,
    data: latestData,
    mapping: Object.fromEntries(sensorMapping),
    timestamp: new Date().toISOString(),
  });
});

// Local endpoint to refresh sensor mapping
app.get("/api/refresh-mapping", async (_req, res) => {
  try {
    const mapping = await fetchSensorMapping();
    res.json({
      success: true,
      message: "Sensor mapping refreshed",
      mapping: Object.fromEntries(mapping),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
    port: COM_PORT,
    baudRate: BAUD_RATE,
    autoDetect: AUTO_DETECT_SENSORS,
    backendUrl: BACKEND_URL,
    timestamp: new Date().toISOString(),
  });
});

// Initialize sensor mapping on startup
if (AUTO_DETECT_SENSORS) {
  console.log(
    "🔄 Auto-detection mode enabled - fetching sensor mapping from database..."
  );
  fetchSensorMapping().then(() => {
    console.log("✅ Sensor mapping initialized");
  });

  // Refresh mapping every 5 minutes
  setInterval(() => {
    console.log("🔄 Refreshing sensor mapping...");
    fetchSensorMapping();
  }, 5 * 60 * 1000);
} else {
  console.log("⚠️ Legacy mode - using environment variables for sensor IDs");
  const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
  const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);
  console.log(`⚙️ Using SENSOR_ID1=${SENSOR_ID1}, SENSOR_ID2=${SENSOR_ID2}`);
}

app.listen(localApiPort, () => {
  console.log(
    `🚀 Local sensor server running on http://localhost:${localApiPort}`
  );
  if (AUTO_DETECT_SENSORS) {
    console.log(`🔄 Auto-detection enabled - will map sensors from database`);
  } else {
    console.log(`⚙️ Legacy mode - using SENSOR_ID1 and SENSOR_ID2 from .env`);
  }
  console.log(`📡 Pushing to ${BACKEND_URL}/api/sensor/`);
  console.log(`🔌 Serial port: ${COM_PORT} @ ${BAUD_RATE} baud`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down sensor server...");
  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {
      console.log("✅ Serial port closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {
      console.log("✅ Serial port closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
