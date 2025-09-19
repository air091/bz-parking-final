import React, { useEffect, useState } from "react";

const AdminParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("table");
  const [editingSlot, setEditingSlot] = useState(null);
  const [editMode, setEditMode] = useState("service"); // "service" or "sensor"

  // Add auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

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

  const loadSlotAvailability = async () => {
    try {
      const res = await fetch("/api/hold-payment/availability");
      const data = await res.json();
      if (res.ok && data.success) {
        setSlotAvailability(data.data);
      }
    } catch (e) {
      console.error("Failed to load slot availability:", e.message);
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
    loadSlotAvailability();
  }, []);

  // Add auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        load();
        loadSlotAvailability();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

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

  const AvailabilityStats = () => {
    if (!slotAvailability) return null;

    const {
      totalSlots,
      availableSlots,
      occupiedSlots,
      maintenanceSlots,
      pendingHolds,
      completedHolds,
      availableForHolding,
    } = slotAvailability;

    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
          padding: 16,
          background: "#f8f9fa",
          borderRadius: 8,
          border: "1px solid #e9ecef",
        }}
      >
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total Slots</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{totalSlots}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Available</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#28a745" }}>
            {availableSlots}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Occupied</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#dc3545" }}>
            {occupiedSlots}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Maintenance</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#ffc107" }}>
            {maintenanceSlots}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Pending Holds</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#ff9800" }}>
            {pendingHolds}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            Available for Holding
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: availableForHolding > 0 ? "#28a745" : "#dc3545",
            }}
          >
            {availableForHolding}
          </div>
        </div>
      </div>
    );
  };

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
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      s.status === "available"
                        ? "#e6ffed"
                        : s.status === "occupied"
                        ? "#ffe5e5"
                        : "#fff3cd",
                    color:
                      s.status === "available"
                        ? "#0a6"
                        : s.status === "occupied"
                        ? "#a00"
                        : "#856404",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {capitalizeFirstLetter(s.status)}
                </span>
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {s.sensor_id ? (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#e3f2fd",
                      color: "#1976d2",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    #{s.sensor_id}
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
                {s.vehicle_type ? (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#f0f0f0",
                      color: "#666",
                      fontSize: 12,
                      fontWeight: 600,
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
                {s.created_at
                  ? new Date(s.created_at).toLocaleDateString()
                  : "-"}
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
                      fontSize: 12,
                      padding: "4px 8px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Edit
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
    <div style={{ padding: 12 }}>
      {/* Header with tabs and controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Parking Slots</h2>
          <span style={{ color: "#666", fontSize: 14 }}>
            {loading
              ? "Loading..."
              : `${slots.length} slot${slots.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setActiveTab("table")}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border:
                  activeTab === "table"
                    ? "1px solid #007bff"
                    : "1px solid #ddd",
                background: activeTab === "table" ? "#e9f2ff" : "white",
                cursor: "pointer",
              }}
            >
              Table
            </button>
            <button
              onClick={() => setActiveTab("grid")}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border:
                  activeTab === "grid" ? "1px solid #007bff" : "1px solid #ddd",
                background: activeTab === "grid" ? "#e9f2ff" : "white",
                cursor: "pointer",
              }}
            >
              Grid
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span style={{ fontSize: 14 }}>Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Availability Stats */}
      <AvailabilityStats />

      {/* Error/Message Display */}
      {(error || message) && (
        <div style={{ marginBottom: 12 }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#ffe5e5",
                color: "#a00",
                border: "1px solid #f5c2c7",
                borderRadius: 6,
                marginBottom: 6,
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              style={{
                padding: "8px 12px",
                background: "#e6ffed",
                color: "#0a6",
                border: "1px solid #badbcc",
                borderRadius: 6,
              }}
            >
              {message}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : activeTab === "table" ? (
        renderTable()
      ) : (
        renderGrid()
      )}

      {/* Edit Modal */}
      {editingSlot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
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
              borderRadius: 8,
              minWidth: 400,
              maxWidth: 600,
            }}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>
              Edit Parking Slot #{editingSlot.slot_id}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#666" }}>
              {editingSlot.location}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: "bold",
                }}
              >
                Edit Mode
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => setEditMode("service")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border:
                      editMode === "service"
                        ? "1px solid #007bff"
                        : "1px solid #ddd",
                    background: editMode === "service" ? "#e9f2ff" : "white",
                    cursor: "pointer",
                  }}
                >
                  Service
                </button>
                <button
                  onClick={() => setEditMode("sensor")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border:
                      editMode === "sensor"
                        ? "1px solid #007bff"
                        : "1px solid #ddd",
                    background: editMode === "sensor" ? "#e9f2ff" : "white",
                    cursor: "pointer",
                  }}
                >
                  Sensor
                </button>
              </div>
            </div>

            {editMode === "service" && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Service
                </label>
                <select
                  value={editingSlot.service_id || ""}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      service_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                  }}
                >
                  <option value="">No Service</option>
                  {services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.vehicle_type} - ₱{service.first_2_hrs} (first
                      2hrs)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editMode === "sensor" && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: "bold",
                  }}
                >
                  Sensor
                </label>
                <select
                  value={editingSlot.sensor_id || ""}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      sensor_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                  }}
                >
                  <option value="">No Sensor</option>
                  {sensors.map((sensor) => (
                    <option key={sensor.sensor_id} value={sensor.sensor_id}>
                      #{sensor.sensor_id} - {sensor.sensor_type} (
                      {sensor.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setEditingSlot(null)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updates = {};
                  if (editMode === "service") {
                    updates.service_id = editingSlot.service_id;
                  } else {
                    updates.sensor_id = editingSlot.sensor_id;
                  }
                  updateSlot(editingSlot.slot_id, updates);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: "#007bff",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParkingSlots;
