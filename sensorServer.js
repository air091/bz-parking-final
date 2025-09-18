// sensorServer.js
// .env variables (create a .env file next to this file):
// SENSOR_ID=7
// SENSOR_ID2=8        # optional
// BACKEND_URL=http://localhost:8888
// COM_PORT=COM5
// BAUD_RATE=9600

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

const SENSOR_ID1 = parseInt(process.env.SENSOR_ID1 || "0", 10);
const SENSOR_ID2 = parseInt(process.env.SENSOR_ID2 || "0", 10); // optional
const BACKEND_URL = (
  process.env.BACKEND_URL || "http://localhost:8888"
).replace(/\/+$/, "");
const COM_PORT = process.env.COM_PORT || "COM5";
const BAUD_RATE = parseInt(process.env.BAUD_RATE || "9600", 10);

if (!SENSOR_ID1 || Number.isNaN(SENSOR_ID1)) {
  console.error("SENSOR_ID1 is required (set it in .env). Exiting.");
  process.exit(1);
}

let latestData = { sensor1In: null, sensor2In: null };

// Add this state near the other state variables
let expectNext = 1; // 1 => SENSOR_ID1, 2 => SENSOR_ID2
let lastPlainAt = 0;
const SEQ_RESET_MS = 2000; // reset alternation if gap > 2s

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
const MIN_INTERVAL_MS = 800;

function putSensorRange(sensorId, rangeIn) {
  try {
    const url = new URL(`${BACKEND_URL}/api/sensor/${sensorId}`);
    const body = JSON.stringify({ sensor_range: rangeIn, status: "working" });

    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const transport = url.protocol === "https:" ? https : http;

    const req = transport.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let msg = data || res.statusCode;
        try {
          const j = JSON.parse(data || "{}");
          msg = j.message || data || res.statusCode;
        } catch {}
        console.log(
          `[BACKEND ${res.statusCode}] sensor_id=${sensorId} -> ${msg}`
        );
      });
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
  const changed = rangeIn !== lastSentValue[sensorId];
  const intervalOk = now - (lastSentAt[sensorId] || 0) >= MIN_INTERVAL_MS;
  if (changed || intervalOk) {
    lastSentValue[sensorId] = rangeIn;
    lastSentAt[sensorId] = now;
    putSensorRange(sensorId, rangeIn);
  }
}

// Helpers to route JSON keys to sensor IDs
function targetSensorIdForKey(key) {
  const k = String(key || "").toLowerCase();
  if (
    /\b2\b|2$/.test(k) ||
    k.includes("2in") ||
    /sensor2|value2|range2|distance2/.test(k)
  ) {
    return SENSOR_ID2 || null;
  }
  if (
    /\b1\b|1$/.test(k) ||
    k.includes("1in") ||
    /sensor1|value1|range1|distance1/.test(k)
  ) {
    return SENSOR_ID1;
  }
  // generic keys go to SENSOR_ID1
  if (/(sensorvalue|distance|range|value)/.test(k)) return SENSOR_ID1;
  return null;
}

// Parse incoming serial lines (alternate plain numbers between sensors)
parser.on("data", (data) => {
  try {
    const raw = String(data || "");
    const cleaned = raw.trim();

    // Optional S1:/S2: override (still supported)
    let targetOverride = null;
    const m = cleaned.match(/^\s*S([12])\s*:\s*(.+)$/i);
    const payload = m ? m[2].trim() : cleaned;
    if (m) targetOverride = m[1] === "1" ? SENSOR_ID1 : SENSOR_ID2 || null;

    // Case 1: plain number → route to override or alternate SENSOR_ID1/SENSOR_ID2
    if (/^\d+(\.\d+)?$/.test(payload)) {
      const valueIn = Math.round(Number(payload));

      // reset alternation if long gap between plain numbers
      const now = Date.now();
      if (now - lastPlainAt > SEQ_RESET_MS) expectNext = 1;
      lastPlainAt = now;

      let targetId = targetOverride;
      if (!targetId) {
        if (expectNext === 1 || !SENSOR_ID2) {
          targetId = SENSOR_ID1;
          expectNext = SENSOR_ID2 ? 2 : 1;
        } else {
          targetId = SENSOR_ID2;
          expectNext = 1;
        }
      }

      if (targetId === SENSOR_ID1) {
        latestData.sensor1In = valueIn;
      } else if (targetId === SENSOR_ID2) {
        latestData.sensor2In = valueIn;
      }

      console.log(`Ultrasonic(in) sensor_id=${targetId}:`, valueIn);
      maybeSend(targetId, valueIn);
      return;
    }

    // Case 2: JSON → existing key-based routing (1→SENSOR_ID1, 2→SENSOR_ID2)
    const parsed = JSON.parse(payload);
    for (const [key, val] of Object.entries(parsed)) {
      if (val == null || !isFinite(val)) continue;
      const valueIn = Math.round(Number(val));
      const targetId =
        targetOverride || targetSensorIdForKey(key) || SENSOR_ID1;

      if (targetId === SENSOR_ID1) {
        latestData.sensor1In = valueIn;
      } else if (targetId === SENSOR_ID2) {
        latestData.sensor2In = valueIn;
      }

      console.log(`Ultrasonic(in) sensor_id=${targetId}:`, valueIn);
      maybeSend(targetId, valueIn);
    }
  } catch (error) {
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

app.listen(localApiPort, () => {
  console.log(`Local sensor server on http://localhost:${localApiPort}`);
  console.log(`Pushing to ${BACKEND_URL}/api/sensor/${SENSOR_ID1}`);
  //   if (SENSOR_ID2) {
  console.log(`Also pushing to ${BACKEND_URL}/api/sensor/${SENSOR_ID2}`);
  //   }
});
