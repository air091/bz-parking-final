import React, { useEffect, useState } from "react";

const AdminSensors = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
        <h1 style={{ margin: 0 }}>Sensors</h1>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 8,
            background: "#ffe5e5",
            color: "#a00",
            border: "1px solid #f5b5b5",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            padding: 8,
            background: "#e6ffed",
            color: "#0a6",
            border: "1px solid #b5f5c5",
            marginBottom: 12,
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : sensors.length === 0 ? (
        <p>No sensors found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Arduino ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Range (cm)
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.sensor_id}>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.sensor_id}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.sensor_type}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        background:
                          s.status === "working" ? "#e6ffed" : "#ffe5e5",
                        color: s.status === "working" ? "#0a6" : "#a00",
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.arduino_id ?? "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.sensor_range}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() =>
                          updateSensor(s.sensor_id, { status: "working" })
                        }
                        style={{ fontSize: "12px", padding: "4px 8px" }}
                      >
                        Set Working
                      </button>
                      <button
                        onClick={() =>
                          updateSensor(s.sensor_id, { status: "maintenance" })
                        }
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          color: "#a00",
                        }}
                      >
                        Set Maintenance
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSensors;
