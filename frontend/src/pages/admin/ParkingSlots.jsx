import React, { useEffect, useState } from "react";

const AdminParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("table");
  const [editingSlot, setEditingSlot] = useState(null);
  const [editMode, setEditMode] = useState("service"); // "service" or "sensor"

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/parking-slot");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load parking slots"
        );
      setSlots(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch("/api/service");
      const data = await res.json();
      if (res.ok && Array.isArray(data?.data)) {
        setServices(data.data);
      }
    } catch (e) {
      console.error("Failed to load services:", e.message);
    }
  };

  const loadSensors = async () => {
    try {
      const res = await fetch("/api/sensor");
      const data = await res.json();
      if (res.ok && Array.isArray(data?.data)) {
        setSensors(data.data);
      }
    } catch (e) {
      console.error("Failed to load sensors:", e.message);
    }
  };

  useEffect(() => {
    load();
    loadServices();
    loadSensors();
  }, []);

  const updateSlot = async (slotId, updates) => {
    try {
      setError("");
      setMessage("");
      const res = await fetch(`/api/parking-slot/${slotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("Parking slot updated successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
      setEditingSlot(null);
    } catch (e) {
      setError(e.message);
    }
  };

  function capitalizeFirstLetter(str) {
    if (!str) return ""; // handle empty string
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const renderTable = () => (
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
              Location
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
              Sensor ID
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #ddd",
                padding: "8px 4px",
              }}
            >
              Service
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #ddd",
                padding: "8px 4px",
              }}
            >
              Created
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
          {slots.map((s) => (
            <tr key={s.slot_id}>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {s.slot_id}
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {s.location}
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
                      s.status === "available"
                        ? "#e6ffed"
                        : s.status === "occupied"
                        ? "#ffe5e5"
                        : "#f0f0f0",
                    color:
                      s.status === "available"
                        ? "#0a6"
                        : s.status === "occupied"
                        ? "#a00"
                        : "#666",
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
                {s.sensor_id ?? "-"}
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {s.vehicle_type ? (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      background:
                        s.vehicle_type.toLowerCase().includes("bike") ||
                        s.vehicle_type.toLowerCase().includes("motorcycle")
                          ? "#fff3cd"
                          : "#e3f2fd",
                      color:
                        s.vehicle_type.toLowerCase().includes("bike") ||
                        s.vehicle_type.toLowerCase().includes("motorcycle")
                          ? "#856404"
                          : "#1976d2",
                    }}
                  >
                    {s.vehicle_type}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {s.created_at ? new Date(s.created_at).toLocaleString() : "-"}
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => {
                      setEditingSlot(s);
                      setEditMode("service");
                    }}
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Edit Service
                  </button>
                  <button
                    onClick={() => {
                      setEditingSlot(s);
                      setEditMode("sensor");
                    }}
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Edit Sensor
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderList = () => (
    <div style={{ display: "grid", gap: 8 }}>
      {slots.map((s) => (
        <div
          key={s.slot_id}
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: "6px",
            background: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>
                Slot #{s.slot_id}
              </h4>
              <p style={{ margin: "2px 0", color: "#666", fontSize: "14px" }}>
                Location: {s.location}
              </p>
              <p style={{ margin: "2px 0", color: "#666", fontSize: "14px" }}>
                Sensor ID: {s.sensor_id ?? "None"}
              </p>
              <p style={{ margin: "2px 0", color: "#666", fontSize: "14px" }}>
                Service:{" "}
                {s.vehicle_type ? (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      background:
                        s.vehicle_type.toLowerCase().includes("bike") ||
                        s.vehicle_type.toLowerCase().includes("motorcycle")
                          ? "#fff3cd"
                          : "#e3f2fd",
                      color:
                        s.vehicle_type.toLowerCase().includes("bike") ||
                        s.vehicle_type.toLowerCase().includes("motorcycle")
                          ? "#856404"
                          : "#1976d2",
                    }}
                  >
                    {s.vehicle_type}
                  </span>
                ) : (
                  "None"
                )}
              </p>
              <p style={{ margin: "2px 0", color: "#666", fontSize: "14px" }}>
                Created:{" "}
                {s.created_at ? new Date(s.created_at).toLocaleString() : "-"}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  background:
                    s.status === "available"
                      ? "#e6ffed"
                      : s.status === "occupied"
                      ? "#ffe5e5"
                      : "#f0f0f0",
                  color:
                    s.status === "available"
                      ? "#0a6"
                      : s.status === "occupied"
                      ? "#a00"
                      : "#666",
                }}
              >
                {s.status.toUpperCase()}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => {
                    setEditingSlot(s);
                    setEditMode("service");
                  }}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Edit Service
                </button>
                <button
                  onClick={() => {
                    setEditingSlot(s);
                    setEditMode("sensor");
                  }}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Edit Sensor
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMap = () => (
    <div
      style={{
        height: "500px",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px dashed #ccc",
        borderRadius: "8px",
      }}
    >
      <div style={{ textAlign: "center", color: "#666" }}>
        <h3>Map View</h3>
        <p>Interactive parking lot map coming soon...</p>
        <p style={{ fontSize: "14px" }}>
          {slots.length} parking slots will be displayed here
        </p>
      </div>
    </div>
  );

  const renderEditModal = () => {
    if (!editingSlot) return null;

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
            {editMode === "service"
              ? `Edit Service for Slot #${editingSlot.slot_id}`
              : `Edit Sensor for Slot #${editingSlot.slot_id}`}
          </h3>

          {editMode === "service" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Current Service:
                </label>
                <p style={{ margin: 0, color: "#666" }}>
                  {editingSlot.vehicle_type || "No service assigned"}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Select Service:
                </label>
                <select
                  value={editingSlot.service_id || ""}
                  onChange={(e) => {
                    const serviceId =
                      e.target.value === "" ? null : parseInt(e.target.value);
                    setEditingSlot({ ...editingSlot, service_id: serviceId });
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">No Service</option>
                  {services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.vehicle_type} - ₱{service.first_2_hrs}/2hrs, ₱
                      {service.per_succ_hr}/hr
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Current Sensor:
                </label>
                <p style={{ margin: 0, color: "#666" }}>
                  {editingSlot.sensor_id
                    ? `Sensor #${editingSlot.sensor_id}`
                    : "No sensor assigned"}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Select Sensor:
                </label>
                <select
                  value={editingSlot.sensor_id || ""}
                  onChange={(e) => {
                    const sensorId =
                      e.target.value === "" ? null : parseInt(e.target.value);
                    setEditingSlot({ ...editingSlot, sensor_id: sensorId });
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">No Sensor</option>
                  {sensors.map((sensor) => (
                    <option key={sensor.sensor_id} value={sensor.sensor_id}>
                      {capitalizeFirstLetter(sensor.sensor_type)} Sensor #
                      {sensor.sensor_id} - Arduino #{sensor.arduino_id} - (
                      {sensor.arduino_location})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditingSlot(null)}
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
              onClick={() => {
                const updates =
                  editMode === "service"
                    ? { service_id: editingSlot.service_id }
                    : { sensor_id: editingSlot.sensor_id };
                updateSlot(editingSlot.slot_id, updates);
              }}
              style={{
                padding: "8px 16px",
                background: editMode === "service" ? "#007bff" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>
          </div>
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
        <h1 style={{ margin: 0 }}>Parking Slots</h1>
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

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{ display: "flex", gap: 0, borderBottom: "1px solid #ddd" }}
        >
          {[
            { key: "table", label: "Table" },
            { key: "list", label: "List" },
            { key: "map", label: "Map" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "12px 24px",
                border: "none",
                background: activeTab === tab.key ? "#007bff" : "transparent",
                color: activeTab === tab.key ? "white" : "#666",
                cursor: "pointer",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #007bff"
                    : "2px solid transparent",
                borderRadius: "4px 4px 0 0",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p>Loading...</p>
      ) : slots.length === 0 ? (
        <p>No parking slots found.</p>
      ) : (
        <>
          {activeTab === "table" && renderTable()}
          {activeTab === "list" && renderList()}
          {activeTab === "map" && renderMap()}
        </>
      )}

      {/* Edit Modal */}
      {renderEditModal()}
    </div>
  );
};

export default AdminParkingSlots;
