import React, { useEffect, useState } from "react";

const AdminSensors = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [espBaseUrl, setEspBaseUrl] = useState("");
  const [esp8266Data, setEsp8266Data] = useState(null);
  const [esp8266Loading, setEsp8266Loading] = useState(false);

  // New state for automatic distance detection
  const [autoDistanceDetection, setAutoDistanceDetection] = useState(false);
  const [distanceDetectionInterval, setDistanceDetectionInterval] =
    useState(3000);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/sensor");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load sensors"
        );
      setSensors(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Automatic distance detection function
  const fetchDistancesAutomatically = async () => {
    if (!espBaseUrl) return;

    try {
      const headers = {};
      // Extract IP from espBaseUrl
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      const res = await fetch(`/api/esp8266/distance/both`, {
        method: "GET",
        headers,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEsp8266Data(data.data);
        // Auto-hide success message after 2 seconds
        setTimeout(() => {
          setMessage("");
        }, 2000);

        // Reload sensors to show updated ranges
        setTimeout(load, 500);
      }
    } catch (e) {
      // Silent error handling for automatic detection
      console.log("Auto distance detection error:", e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh effect for sensors
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        load();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh effect for automatic distance detection
  useEffect(() => {
    let interval;
    if (autoDistanceDetection && espBaseUrl) {
      // Initial fetch
      fetchDistancesAutomatically();

      interval = setInterval(() => {
        fetchDistancesAutomatically();
      }, distanceDetectionInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoDistanceDetection, distanceDetectionInterval, espBaseUrl]);

  // Load ESP base URL from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem("espBaseUrl") || "";
      setEspBaseUrl(v);
    } catch {}
  }, []);

  // Save ESP base URL to localStorage
  const saveEspBaseUrl = (url) => {
    try {
      localStorage.setItem("espBaseUrl", url);
      setEspBaseUrl(url);
    } catch {}
  };

  // Direct ESP8266 communication (legacy method)
  const hitEsp = async (path) => {
    setError("");
    setMessage("");
    try {
      const base = (espBaseUrl || "").trim().replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(base)) {
        throw new Error("Set a valid ESP Base URL (http://x.x.x.x)");
      }
      const res = await fetch(`${base}${path}`, { method: "GET" });

      if (!res.ok) throw new Error(`ESP error ${res.status}`);

      if (path === "/sensor/on") {
        setMessage("ESP: Sensor ON sent");
      } else if (path === "/sensor/off") {
        setMessage("ESP: Sensor OFF sent");
      } else {
        setMessage("ESP: OK");
      }
      setTimeout(load, 500);
    } catch (e) {
      setError(e.message);
    }
  };

  // New ESP8266 API communication through backend
  const hitESP8266API = async (endpoint) => {
    setEsp8266Loading(true);
    setError("");
    setMessage("");
    try {
      const headers = {};
      // Extract IP from espBaseUrl for manual mode
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      const res = await fetch(`/api/esp8266${endpoint}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `ESP8266 API error ${res.status}`
        );
      }

      setEsp8266Data(data.data);
      setMessage(`ESP8266: ${data.message}`);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      setTimeout(load, 500);
    } catch (e) {
      setError(e.message);
    } finally {
      setEsp8266Loading(false);
    }
  };

  const sensorOn = () => hitEsp("/sensor/on");
  const sensorOff = () => hitEsp("/sensor/off");

  // ESP8266 API methods - only Sensor ON/OFF
  const esp8266SensorOn = () => hitESP8266API("/sensor/on");
  const esp8266SensorOff = () => hitESP8266API("/sensor/off");

  const updateSensor = async (sensorId, updates) => {
    try {
      setError("");
      setMessage("");

      // If setting to maintenance, also set sensor_range to 0
      const payload = { ...updates };
      if (updates.status === "maintenance") {
        payload.sensor_range = 0;
      }

      const res = await fetch(`/api/sensor/${sensorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("Sensor updated successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Sensors</h1>
          {autoRefresh && (
            <span
              style={{
                fontSize: 12,
                color: "#28a745",
                background: "#e6ffed",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #badbcc",
              }}
            >
              Auto-refresh ON
            </span>
          )}
          {autoDistanceDetection && (
            <span
              style={{
                fontSize: 12,
                color: "#17a2b8",
                background: "#e6f7ff",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #91d5ff",
              }}
            >
              Auto Distance Detection ON
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Auto-refresh controls */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ccc",
                borderRadius: 4,
                background: autoRefresh ? "#28a745" : "#fff",
                color: autoRefresh ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {autoRefresh ? "Stop Auto" : "Auto Refresh"}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 16px",
              border: "1px solid #007bff",
              borderRadius: 4,
              background: "#007bff",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ESP8266 Configuration Section */}
      <div
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#495057" }}>
          ESP8266 Configuration
        </h3>

        {/* Manual Mode ESP Base URL Input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>
              ESP Base URL:
            </label>
            <input
              type="text"
              value={espBaseUrl}
              onChange={(e) => saveEspBaseUrl(e.target.value)}
              placeholder="http://192.168.1.100"
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                fontSize: 14,
                minWidth: 200,
              }}
            />
          </div>
        </div>

        {/* Automatic Distance Detection Controls */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setAutoDistanceDetection(!autoDistanceDetection)}
              disabled={!espBaseUrl}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #17a2b8",
                borderRadius: 4,
                background:
                  autoDistanceDetection && espBaseUrl ? "#17a2b8" : "#fff",
                color: autoDistanceDetection && espBaseUrl ? "#fff" : "#17a2b8",
                cursor: !espBaseUrl ? "not-allowed" : "pointer",
                opacity: !espBaseUrl ? 0.6 : 1,
              }}
            >
              {autoDistanceDetection
                ? "Stop Auto Detection"
                : "Start Auto Detection"}
            </button>
            <select
              value={distanceDetectionInterval}
              onChange={(e) =>
                setDistanceDetectionInterval(Number(e.target.value))
              }
              disabled={!espBaseUrl}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #ced4da",
                borderRadius: 4,
                opacity: !espBaseUrl ? 0.6 : 1,
              }}
            >
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
            <span style={{ fontSize: 12, color: "#6c757d" }}>
              Auto-detects distances and updates database
            </span>
          </div>
        </div>

        {/* ESP8266 Control Buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", width: "100%", color: "#495057" }}>
            ESP8266 Sensor Control
          </h4>

          <button
            onClick={esp8266SensorOn}
            disabled={esp8266Loading || !espBaseUrl}
            style={{
              padding: "6px 12px",
              border: "1px solid #28a745",
              borderRadius: 4,
              background: esp8266Loading || !espBaseUrl ? "#6c757d" : "#28a745",
              color: "white",
              cursor: esp8266Loading || !espBaseUrl ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor ON"}
          </button>
          <button
            onClick={esp8266SensorOff}
            disabled={esp8266Loading || !espBaseUrl}
            style={{
              padding: "6px 12px",
              border: "1px solid #dc3545",
              borderRadius: 4,
              background: esp8266Loading || !espBaseUrl ? "#6c757d" : "#dc3545",
              color: "white",
              cursor: esp8266Loading || !espBaseUrl ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor OFF"}
          </button>
        </div>

        {/* ESP8266 Response Display */}
        {esp8266Data && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#e9ecef",
              border: "1px solid #ced4da",
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            <strong>ESP8266 Response:</strong>
            <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(esp8266Data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: 12,
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: 4,
            color: "#721c24",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            padding: 12,
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: 4,
            color: "#155724",
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      {/* Sensors Table */}
      <div
        style={{
          background: "white",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                ID
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Type
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Arduino ID
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Range (inches)
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((sensor) => (
              <tr key={sensor.sensor_id}>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.sensor_id}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.sensor_type}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.arduino_id}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        sensor.sensor_range > 0
                          ? sensor.sensor_range < 10
                            ? "#dc3545"
                            : sensor.sensor_range < 20
                            ? "#ffc107"
                            : "#28a745"
                          : "#6c757d",
                      color: "white",
                    }}
                  >
                    {sensor.sensor_range || 0}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <select
                    value={sensor.status}
                    onChange={(e) =>
                      updateSensor(sensor.sensor_id, { status: e.target.value })
                    }
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #ced4da",
                      borderRadius: 4,
                      fontSize: 12,
                      background: "white",
                    }}
                  >
                    <option value="working">Working</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <button
                    onClick={() =>
                      updateSensor(sensor.sensor_id, {
                        status:
                          sensor.status === "working"
                            ? "maintenance"
                            : "working",
                      })
                    }
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #007bff",
                      borderRadius: 4,
                      background: "#007bff",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Toggle Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sensors.length === 0 && !loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            No sensors found
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            Loading sensors...
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSensors;
