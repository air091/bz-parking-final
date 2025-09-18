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

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh effect
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
      const text = await res.text();

      if (!res.ok) throw new Error(text || `ESP error ${res.status}`);

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
      const res = await fetch(`/api/esp8266${endpoint}`, { method: "GET" });
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

  // New ESP8266 API methods
  const esp8266SensorOn = () => hitESP8266API("/sensor/on");
  const esp8266SensorOff = () => hitESP8266API("/sensor/off");
  const esp8266GetDistance1 = () => hitESP8266API("/distance/1");
  const esp8266GetDistance2 = () => hitESP8266API("/distance/2");
  const esp8266GetBothDistances = () => hitESP8266API("/distance/both");
  const esp8266GetStatus = () => hitESP8266API("/status");

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
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <label style={{ fontSize: 14, fontWeight: 500 }}>ESP Base URL:</label>
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
            Direct ESP8266 Control (Legacy)
          </h4>
          <button
            onClick={sensorOn}
            style={{
              padding: "6px 12px",
              border: "1px solid #28a745",
              borderRadius: 4,
              background: "#28a745",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Sensor ON
          </button>
          <button
            onClick={sensorOff}
            style={{
              padding: "6px 12px",
              border: "1px solid #dc3545",
              borderRadius: 4,
              background: "#dc3545",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Sensor OFF
          </button>
        </div>

        {/* New ESP8266 API Control Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <h4 style={{ margin: "0 0 8px 0", width: "100%", color: "#495057" }}>
            ESP8266 API Control (New)
          </h4>
          <button
            onClick={esp8266SensorOn}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #28a745",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#28a745",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor ON"}
          </button>
          <button
            onClick={esp8266SensorOff}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #dc3545",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#dc3545",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor OFF"}
          </button>
          <button
            onClick={esp8266GetDistance1}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #007bff",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#007bff",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Get Distance 1"}
          </button>
          <button
            onClick={esp8266GetDistance2}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #007bff",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#007bff",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Get Distance 2"}
          </button>
          <button
            onClick={esp8266GetBothDistances}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #17a2b8",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#17a2b8",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Get Both Distances"}
          </button>
          <button
            onClick={esp8266GetStatus}
            disabled={esp8266Loading}
            style={{
              padding: "6px 12px",
              border: "1px solid #6f42c1",
              borderRadius: 4,
              background: esp8266Loading ? "#6c757d" : "#6f42c1",
              color: "white",
              cursor: esp8266Loading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Get Status"}
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
