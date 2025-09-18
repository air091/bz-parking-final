import React, { useEffect, useState } from "react";

const AdminArduino = () => {
  const [arduinos, setArduinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [editingArduino, setEditingArduino] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedArduino, setSelectedArduino] = useState(null);
  const [arduinoSensors, setArduinoSensors] = useState([]);
  const [loadingSensors, setLoadingSensors] = useState(false);
  // Add sensor auto-refresh state
  const [sensorAutoRefresh, setSensorAutoRefresh] = useState(false);
  const [sensorRefreshInterval, setSensorRefreshInterval] = useState(3000);

  // Form state for creating/editing Arduino
  const [formData, setFormData] = useState({
    ip_address: "",
    location: "",
    status: "active",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/arduino");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load Arduino devices"
        );
      setArduinos(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to load sensors for a specific Arduino
  const loadArduinoSensors = async (arduinoId, showLoading = true) => {
    if (showLoading) setLoadingSensors(true);
    setError("");
    try {
      const res = await fetch(`/api/arduino/${arduinoId}/sensors`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load Arduino sensors"
        );
      setArduinoSensors(Array.isArray(data?.data) ? data.data : []);
      setSelectedArduino(arduinos.find((a) => a.arduino_id === arduinoId));
      // Automatically enable sensor auto-refresh when modal opens
      setSensorAutoRefresh(true);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoading) setLoadingSensors(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh effect for Arduino devices
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

  // Auto-refresh effect for sensors when modal is open
  useEffect(() => {
    let interval;
    if (sensorAutoRefresh && selectedArduino) {
      interval = setInterval(() => {
        loadArduinoSensors(selectedArduino.arduino_id, false); // Don't show loading spinner for auto-refresh
      }, sensorRefreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sensorAutoRefresh, sensorRefreshInterval, selectedArduino]);

  const updateArduino = async (arduinoId, updates) => {
    try {
      setError("");
      setMessage("");
      const res = await fetch(`/api/arduino/${arduinoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("Arduino device updated successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
      setEditingArduino(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const createArduino = async () => {
    try {
      setError("");
      setMessage("");
      const res = await fetch("/api/arduino", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Creation failed");
      setMessage("Arduino device created successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
      setShowCreateForm(false);
      setFormData({ ip_address: "", location: "", status: "active" });
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteArduino = async (arduinoId) => {
    if (
      !window.confirm("Are you sure you want to delete this Arduino device?")
    ) {
      return;
    }

    try {
      setError("");
      setMessage("");
      const res = await fetch(`/api/arduino/${arduinoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Deletion failed");
      setMessage("Arduino device deleted successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEdit = (arduino) => {
    setEditingArduino(arduino);
    setFormData({
      ip_address: arduino.ip_address || "",
      location: arduino.location || "",
      status: arduino.status || "active",
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingArduino) {
      updateArduino(editingArduino.arduino_id, formData);
    } else {
      createArduino();
    }
  };

  const renderEditModal = () => {
    if (!editingArduino && !showCreateForm) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 24,
            borderRadius: "8px",
            minWidth: 400,
            maxWidth: 500,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>
            {editingArduino
              ? `Edit Arduino Device #${editingArduino.arduino_id}`
              : "Create New Arduino Device"}
          </h3>

          <form onSubmit={handleFormSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: "bold",
                }}
              >
                IP Address:
              </label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) =>
                  setFormData({ ...formData, ip_address: e.target.value })
                }
                placeholder="192.168.1.100"
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: "bold",
                }}
              >
                Location:
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Parking Lot A"
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: "bold",
                }}
              >
                Status:
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingArduino(null);
                  setShowCreateForm(false);
                  setFormData({
                    ip_address: "",
                    location: "",
                    status: "active",
                  });
                }}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  background: editingArduino ? "#007bff" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {editingArduino ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSensorsModal = () => {
    if (!selectedArduino) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 24,
            borderRadius: "8px",
            minWidth: 600,
            maxWidth: 800,
            maxHeight: "80vh",
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: 0 }}>
              Sensors Connected to Arduino #{selectedArduino.arduino_id}
            </h3>
            <button
              onClick={() => {
                setSelectedArduino(null);
                setArduinoSensors([]);
                setSensorAutoRefresh(false); // Stop sensor auto-refresh when closing modal
              }}
              style={{
                padding: "4px 8px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Sensor Auto-refresh Controls */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#f8f9fa",
              borderRadius: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                Sensor Auto-refresh:
              </span>
              {sensorAutoRefresh && (
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
                  ON
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                onClick={() => setSensorAutoRefresh(!sensorAutoRefresh)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: sensorAutoRefresh ? "#28a745" : "#fff",
                  color: sensorAutoRefresh ? "#fff" : "#333",
                  cursor: "pointer",
                }}
              >
                {sensorAutoRefresh ? "Stop Auto" : "Auto Refresh"}
              </button>
              <select
                value={sensorRefreshInterval}
                onChange={(e) =>
                  setSensorRefreshInterval(Number(e.target.value))
                }
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
              >
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
              <button
                onClick={() => loadArduinoSensors(selectedArduino.arduino_id)}
                disabled={loadingSensors}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #007bff",
                  borderRadius: 4,
                  background: "#007bff",
                  color: "white",
                  cursor: loadingSensors ? "not-allowed" : "pointer",
                  opacity: loadingSensors ? 0.6 : 1,
                }}
              >
                {loadingSensors ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#f8f9fa",
              borderRadius: 4,
            }}
          >
            <strong>Arduino Details:</strong>
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  background: "#e9ecef",
                  padding: "2px 6px",
                  borderRadius: 3,
                }}
              >
                {selectedArduino.ip_address}
              </span>
              <span style={{ marginLeft: 12, color: "#6c757d" }}>
                {selectedArduino.location}
              </span>
            </div>
          </div>

          {loadingSensors ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6c757d" }}>
              Loading sensors...
            </div>
          ) : arduinoSensors.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {arduinoSensors.map((sensor) => (
                <div
                  key={sensor.sensor_id}
                  style={{
                    padding: 12,
                    background: "white",
                    border: "1px solid #dee2e6",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Sensor #{sensor.sensor_id} - {sensor.sensor_type}
                    </div>
                    <div style={{ fontSize: 12, color: "#6c757d" }}>
                      Range: {sensor.sensor_range || 0} inches
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        background:
                          sensor.status === "working"
                            ? "#d4edda"
                            : sensor.status === "maintenance"
                            ? "#fff3cd"
                            : "#f8d7da",
                        color:
                          sensor.status === "working"
                            ? "#155724"
                            : sensor.status === "maintenance"
                            ? "#856404"
                            : "#721c24",
                      }}
                    >
                      {sensor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#6c757d" }}>
              No sensors connected to this Arduino device.
            </div>
          )}
        </div>
      </div>
    );
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
          <h1 style={{ margin: 0 }}>Arduino Devices</h1>
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
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "8px 16px",
              border: "1px solid #28a745",
              borderRadius: 4,
              background: "#28a745",
              color: "white",
              cursor: "pointer",
            }}
          >
            Add Arduino
          </button>

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

      {/* Arduino Devices Table */}
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
                IP Address
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Location
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
                Sensors Count
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Created
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
            {arduinos.map((arduino) => (
              <tr key={arduino.arduino_id}>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {arduino.arduino_id}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      background: "#f8f9fa",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {arduino.ip_address}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {arduino.location}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        arduino.status === "active"
                          ? "#d4edda"
                          : arduino.status === "inactive"
                          ? "#f8d7da"
                          : "#fff3cd",
                      color:
                        arduino.status === "active"
                          ? "#155724"
                          : arduino.status === "inactive"
                          ? "#721c24"
                          : "#856404",
                    }}
                  >
                    {arduino.status}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <button
                    onClick={() => loadArduinoSensors(arduino.arduino_id)}
                    disabled={arduino.sensor_count === 0}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        arduino.sensor_count > 0 ? "#e3f2fd" : "#f8f9fa",
                      color: arduino.sensor_count > 0 ? "#1976d2" : "#6c757d",
                      border: "1px solid",
                      borderColor:
                        arduino.sensor_count > 0 ? "#1976d2" : "#dee2e6",
                      cursor:
                        arduino.sensor_count > 0 ? "pointer" : "not-allowed",
                      opacity: arduino.sensor_count > 0 ? 1 : 0.6,
                    }}
                  >
                    {arduino.sensor_count || 0} sensors
                  </button>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {arduino.created_at
                    ? new Date(arduino.created_at).toLocaleString()
                    : "-"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleEdit(arduino)}
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
                      Edit
                    </button>
                    <button
                      onClick={() => deleteArduino(arduino.arduino_id)}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #dc3545",
                        borderRadius: 4,
                        background: "#dc3545",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {arduinos.length === 0 && !loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            No Arduino devices found
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
            Loading Arduino devices...
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {renderEditModal()}

      {/* Sensors Modal */}
      {renderSensorsModal()}
    </div>
  );
};

export default AdminArduino;
