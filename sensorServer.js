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
let sensorMapping = new Map(); // IP -> { sensor1Id, sensor2Id, location }
let latestData = { sensor1In: null, sensor2In: null };

// Add this state near the other state variables
let expectNext = 1; // 1 => SENSOR_ID1, 2 => SENSOR_ID2
let lastPlainAt = 0;
const SEQ_RESET_MS = 2000; // reset alternation if gap > 2s

// Fetch sensor mapping from database
async function fetchSensorMapping() {
  try {
    const url = new URL(`${BACKEND_URL}/api/arduino`);
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      agent: httpAgent,
    };

    const transport = http;
    const started = Date.now();

    return new Promise((resolve, reject) => {
      const req = transport.request(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const dur = Date.now() - started;
          try {
            const response = JSON.parse(data);
            if (response.success && response.data) {
              // Process Arduino devices and their sensors
              const mapping = new Map();

              response.data.forEach(async (arduino) => {
                try {
                  // Get sensors for this Arduino
                  const sensorUrl = new URL(
                    `${BACKEND_URL}/api/arduino/${arduino.arduino_id}/sensors`
                  );
                  const sensorReq = transport.request(
                    sensorUrl,
                    options,
                    (sensorRes) => {
                      let sensorData = "";
                      sensorRes.on("data", (chunk) => (sensorData += chunk));
                      sensorRes.on("end", () => {
                        try {
                          const sensorResponse = JSON.parse(sensorData);
                          if (sensorResponse.success && sensorResponse.data) {
                            const sensors = sensorResponse.data;
                            const sensor1 = sensors.find(
                              (s) => s.sensor_type === "ultrasonic"
                            );
                            const sensor2 = sensors.find(
                              (s) =>
                                s.sensor_type === "ultrasonic" &&
                                s.sensor_id !== sensor1?.sensor_id
                            );

                            mapping.set(arduino.ip_address, {
                              arduinoId: arduino.arduino_id,
                              location: arduino.location,
                              sensor1Id: sensor1?.sensor_id || null,
                              sensor2Id: sensor2?.sensor_id || null,
                            });

                            console.log(
                              `📡 Mapped ${arduino.location} (${arduino.ip_address}): Sensor1=${sensor1?.sensor_id}, Sensor2=${sensor2?.sensor_id}`
                            );
                          }
                        } catch (e) {
                          console.error(
                            `Error parsing sensor data for ${arduino.ip_address}:`,
                            e.message
                          );
                        }
                      });
                    }
                  );

                  sensorReq.on("error", (e) => {
                    console.error(
                      `Error fetching sensors for ${arduino.ip_address}:`,
                      e.message
                    );
                  });

                  sensorReq.end();
                } catch (e) {
                  console.error(
                    `Error processing Arduino ${arduino.ip_address}:`,
                    e.message
                  );
                }
              });

              // Wait a bit for all sensor requests to complete
              setTimeout(() => {
                sensorMapping = mapping;
                console.log(
                  `✅ Sensor mapping updated: ${mapping.size} devices mapped`
                );
                resolve(mapping);
              }, 1000);
            } else {
              console.log(
                `[BACKEND ${res.statusCode} in ${dur}ms] Failed to fetch Arduino devices`
              );
              resolve(new Map());
            }
          } catch (e) {
            console.error("Error parsing Arduino data:", e.message);
            resolve(new Map());
          }
        });
      });

      req.setTimeout(5000, () => {
        req.destroy(new Error("timeout"));
        resolve(new Map());
      });

      req.on("error", (e) => {
        console.error("Error fetching Arduino devices:", e.message);
        resolve(new Map());
      });

      req.end();
    });
  } catch (e) {
    console.error("Failed to fetch sensor mapping:", e.message);
    return new Map();
  }
}

// List available ports (debug)
SerialPort.list()
  .then((ports) => {
    console.log("Available ports:");
    ports.forEach((p) => console.log(p.path));
  })
  .catch((err) => console.error("Error listing ports:", err));

// Configure serial port
const serialPort = new SerialPort(
  { path: COM_PORT, baudRate: BAUD_RATE },
  (err) => {
    if (err) {
      console.error("Failed to open serial port:", err.message);
      return;
    }
    console.log(`Serial port ${COM_PORT} opened @ ${BAUD_RATE} baud`);
    setTimeout(() => console.log("Ready to receive data"), 2000);
  }
);

const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

// Per-sensor rate limiting
const lastSentValue = {};
const lastSentAt = {};
const MIN_INTERVAL_MS = 300; // faster sending
const MIN_CHANGE = 1; // ignore +/-1 cm noise

function putSensorRange(sensorId, rangeIn) {
  try {
    const url = new URL(`${BACKEND_URL}/api/sensor/${sensorId}`);
    const body = JSON.stringify({ sensor_range: rangeIn, status: "working" });

    const isHttps = url.protocol === "https:";
    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Connection: "keep-alive",
      },
      agent: isHttps ? httpsAgent : httpAgent,
    };

    const transport = isHttps ? https : http;
    const started = Date.now();

    const req = transport.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const dur = Date.now() - started;
        let msg = data || res.statusCode;
        try {
          const j = JSON.parse(data || "{}");
          msg = j.message || data || res.statusCode;
        } catch {}
        console.log(
          `[BACKEND ${res.statusCode} in ${dur}ms] sensor_id=${sensorId} -> ${msg}`
        );
      });
    });

    req.setTimeout(1500, () => {
      req.destroy(new Error("timeout"));
    });

    req.on("error", (e) =>
      console.error(`Backend request error (sensor_id=${sensorId}):`, e.message)
    );
    req.write(body);
    req.end();
  } catch (e) {
    console.error("Failed to send update:", e.message);
  }
}

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

// Enhanced sensor ID detection with database mapping
function getSensorIdForValue(value, sourceIp = null) {
  // If we have database mapping, use it
  if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
    // Try to find the Arduino device that might be sending this data
    // For now, we'll use a simple round-robin approach
    const devices = Array.from(sensorMapping.values());
    if (devices.length > 0) {
      // Use expectNext to alternate between sensors
      const device = devices[0]; // Use first device for now
      if (expectNext === 1 && device.sensor1Id) {
        return device.sensor1Id;
      } else if (expectNext === 2 && device.sensor2Id) {
        return device.sensor2Id;
      } else if (device.sensor1Id) {
        return device.sensor1Id; // Fallback to sensor1
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

// Parse incoming serial lines (enhanced with database integration)
parser.on("data", (data) => {
  try {
    const raw = String(data || "");
    const cleaned = raw.trim();

    // Optional S1:/S2: override (still supported)
    let targetOverride = null;
    const m = cleaned.match(/^\s*S([12])\s*:\s*(.+)$/i);
    const payload = m ? m[2].trim() : cleaned;
    if (m) {
      // Use database mapping for S1/S2 override
      if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
        const devices = Array.from(sensorMapping.values());
        if (devices.length > 0) {
          const device = devices[0];
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

      // reset alternation if long gap between plain numbers
      const now = Date.now();
      if (now - lastPlainAt > SEQ_RESET_MS) expectNext = 1;
      lastPlainAt = now;

      let targetId = targetOverride;
      if (!targetId) {
        targetId = getSensorIdForValue(valueIn);
        // Toggle expectNext for next reading
        if (AUTO_DETECT_SENSORS && sensorMapping.size > 0) {
          const devices = Array.from(sensorMapping.values());
          if (devices.length > 0) {
            const device = devices[0];
            expectNext = expectNext === 1 && device.sensor2Id ? 2 : 1;
          }
        } else {
          expectNext = expectNext === 1 ? 2 : 1;
        }
      }

      // Update latest data
      if (targetId) {
        if (expectNext === 1) {
          latestData.sensor1In = valueIn;
        } else {
          latestData.sensor2In = valueIn;
        }
      }

      console.log(`Ultrasonic(in) sensor_id=${targetId}:`, valueIn);
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
          targetId = which === 1 ? device.sensor1Id : device.sensor2Id;
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
        console.log(`Ultrasonic(in) sensor_id=${targetId}:`, num);
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
          if (device.sensor1Id) {
            latestData.sensor1In = n1;
            console.log(`Ultrasonic(in) sensor_id=${device.sensor1Id}:`, n1);
            maybeSend(device.sensor1Id, n1);
          }
          if (device.sensor2Id) {
            latestData.sensor2In = n2;
            console.log(`Ultrasonic(in) sensor_id=${device.sensor2Id}:`, n2);
            maybeSend(device.sensor2Id, n2);
          }
        }
      } else {
        // Legacy mode
        const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
        const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10);

        if (SENSOR_ID1) {
          latestData.sensor1In = n1;
          console.log(`Ultrasonic(in) sensor_id=${SENSOR_ID1}:`, n1);
          maybeSend(SENSOR_ID1, n1);
        }
        if (SENSOR_ID2) {
          latestData.sensor2In = n2;
          console.log(`Ultrasonic(in) sensor_id=${SENSOR_ID2}:`, n2);
          maybeSend(SENSOR_ID2, n2);
        }
      }
      return;
    }

    // Case 2: JSON → existing key-based routing (only if looks like JSON)
    if (/^[\[{]/.test(payload)) {
      const parsed = JSON.parse(payload);
      for (const [key, val] of Object.entries(parsed)) {
        if (val == null || !isFinite(val)) continue;
        const valueIn = Math.round(Number(val));
        const targetId = getSensorIdForValue(valueIn);

        if (targetId) {
          if (expectNext === 1) {
            latestData.sensor1In = valueIn;
          } else {
            latestData.sensor2In = valueIn;
          }

          console.log(`Ultrasonic(in) sensor_id=${targetId}:`, valueIn);
          maybeSend(targetId, valueIn);
        }
      }
      return;
    }

    // Unknown/unhandled line → ignore quietly to avoid noise
  } catch (error) {
    // Only log true parsing errors we expected (e.g., malformed JSON we tried to parse)
    console.error("Parse error:", error.message);
  }
});

serialPort.on("error", (error) => {
  console.error("Serial port error:", error.message);
});

// Local endpoint to view last readings
app.get("/api/sensor", (_req, res) => {
  res.json(latestData);
});

// Local endpoint to refresh sensor mapping
app.get("/api/refresh-mapping", async (_req, res) => {
  try {
    await fetchSensorMapping();
    res.json({
      success: true,
      message: "Sensor mapping refreshed",
      mapping: Object.fromEntries(sensorMapping),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
  console.log(" Legacy mode - using environment variables for sensor IDs");
}

app.listen(localApiPort, () => {
  console.log(`Local sensor server on http://localhost:${localApiPort}`);
  if (AUTO_DETECT_SENSORS) {
    console.log(`Auto-detection enabled - will map sensors from database`);
  } else {
    console.log(`Legacy mode - using SENSOR_ID1 and SENSOR_ID2 from .env`);
  }
  console.log(`Pushing to ${BACKEND_URL}/api/sensor/`);
});
