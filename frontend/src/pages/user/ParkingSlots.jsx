import React, { useEffect, useState } from "react";

const UserParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Filter states
  const [filterLocation, setFilterLocation] = useState("");
  const [filterVehicleType, setFilterVehicleType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Reserve Slot Modal states
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState({
    plateNumber: "",
    paymentMethod: "gcash",
    preferredLocation: "",
    vehicleType: "",
  });
  const [reserveLoading, setReserveLoading] = useState(false);

  // Hold payment availability state
  const [holdAvailability, setHoldAvailability] = useState(null);

  const loadSlots = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not on auto-refresh
      if (isInitialLoad) {
        setLoading(true);
      }
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
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const loadHoldAvailability = async () => {
    try {
      const res = await fetch("/api/hold-payment/availability");
      const data = await res.json();
      if (res.ok && data.success) {
        setHoldAvailability(data.data);
      }
    } catch (e) {
      console.error("Failed to load hold availability:", e.message);
    }
  };

  useEffect(() => {
    loadSlots(true); // Initial load with loading spinner
    loadHoldAvailability(); // Load hold payment availability
  }, []);

  // Auto-refresh effect - silent refresh without loading spinner
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadSlots(false); // Auto-refresh without loading spinner
        loadHoldAvailability(); // Refresh hold availability
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return { bg: "#e6ffed", color: "#0a6", text: "Available" };
      case "occupied":
        return { bg: "#ffe5e5", color: "#a00", text: "Occupied" };
      case "maintenance":
        return { bg: "#fff3cd", color: "#856404", text: "Maintenance" };
      default:
        return { bg: "#f0f0f0", color: "#666", text: "Maintenance" };
    }
  };

  const getVehicleTypeColor = (vehicleType) => {
    if (!vehicleType) return { bg: "#f8f9fa", color: "#6c757d" };

    const isMotorcycle =
      vehicleType.toLowerCase().includes("bike") ||
      vehicleType.toLowerCase().includes("motorcycle");

    return isMotorcycle
      ? { bg: "#fff3cd", color: "#856404" }
      : { bg: "#e3f2fd", color: "#1976d2" };
  };

  // Filter slots based on current filters
  const filteredSlots = slots.filter((slot) => {
    const locationMatch =
      !filterLocation ||
      slot.location.toLowerCase().includes(filterLocation.toLowerCase());
    const vehicleTypeMatch =
      !filterVehicleType ||
      (slot.vehicle_type &&
        slot.vehicle_type
          .toLowerCase()
          .includes(filterVehicleType.toLowerCase()));
    const statusMatch = !filterStatus || slot.status === filterStatus;

    return locationMatch && vehicleTypeMatch && statusMatch;
  });

  // Get unique locations and vehicle types for filter options
  const uniqueLocations = [...new Set(slots.map((slot) => slot.location))];
  const uniqueVehicleTypes = [
    ...new Set(slots.map((slot) => slot.vehicle_type).filter(Boolean)),
  ];

  const availableSlots = filteredSlots.filter(
    (slot) => slot.status === "available"
  ).length;
  const totalSlots = filteredSlots.length;
  const occupiedSlots = filteredSlots.filter(
    (slot) => slot.status === "occupied"
  ).length;
  const maintenanceSlots = filteredSlots.filter(
    (slot) => slot.status === "maintenance"
  ).length;

  // Calculate hold payment availability
  const pendingHolds = holdAvailability?.pendingHolds || 0;
  const availableForHolding = holdAvailability?.availableForHolding || 0;
  const canReserve = availableForHolding > 0;

  const clearFilters = () => {
    setFilterLocation("");
    setFilterVehicleType("");
    setFilterStatus("");
  };

  // Handle reserve slot request
  const handleReserveSlot = () => {
    // Check if slots are available for holding
    if (!canReserve) {
      setError(
        "No parking slots are currently available for reservation. Please try again later."
      );
      return;
    }

    setShowReserveModal(true);
    setReserveForm({
      plateNumber: "",
      paymentMethod: "gcash",
      preferredLocation: "",
      vehicleType: "",
    });
  };

  const handleReserveSubmit = async (e) => {
    e.preventDefault();

    if (!reserveForm.plateNumber.trim()) {
      setError("Please enter a valid plate number");
      return;
    }

    // Double-check availability before submitting
    if (!canReserve) {
      setError(
        "No parking slots are currently available for reservation. Please try again later."
      );
      return;
    }

    setReserveLoading(true);
    setError("");

    try {
      let serviceId = null;

      // If vehicle type is selected, get the corresponding service_id
      if (reserveForm.vehicleType) {
        const serviceResponse = await fetch(
          `/api/service/vehicle/${encodeURIComponent(reserveForm.vehicleType)}`
        );
        const serviceData = await serviceResponse.json();

        if (
          serviceResponse.ok &&
          serviceData.data &&
          serviceData.data.length > 0
        ) {
          // Get the first matching service (assuming one service per vehicle type)
          serviceId = serviceData.data[0].service_id;
        }
      }

      // Step 1: Create user account
      const userResponse = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plate_number: reserveForm.plateNumber.trim().toUpperCase(),
          service_id: serviceId, // Use the found service_id or null
        }),
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.message || "Failed to create user account");
      }

      // Step 2: Create hold payment
      const holdResponse = await fetch("/api/hold-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userData.data.user_id,
          amount: 30.0,
          payment_method: reserveForm.paymentMethod,
        }),
      });

      const holdData = await holdResponse.json();

      if (!holdResponse.ok) {
        throw new Error(holdData.message || "Failed to create hold payment");
      }

      // Success
      setShowReserveModal(false);
      setReserveForm({
        plateNumber: "",
        paymentMethod: "gcash",
        preferredLocation: "",
        vehicleType: "",
      });

      // Refresh availability data
      await loadHoldAvailability();

      // Show success message with availability info
      const availabilityMsg = holdData.availability
        ? `\n\nAvailability Update:\n- Available slots: ${holdData.availability.availableSlots}\n- Pending holds: ${holdData.availability.pendingHolds}\n- Remaining slots: ${holdData.availability.remainingSlots}`
        : "";

      alert(
        `Success! Your slot reservation request has been submitted. The admin will review and assign you an available slot.${availabilityMsg}`
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setReserveLoading(false);
    }
  };

  const renderReserveModal = () => {
    if (!showReserveModal) return null;

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
            padding: "24px",
            borderRadius: "8px",
            minWidth: "400px",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>
            Reserve Parking Slot
          </h3>

          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              background: "#e3f2fd",
              borderRadius: "4px",
              border: "1px solid #bbdefb",
            }}
          >
            <p
              style={{
                margin: "0 0 4px 0",
                fontWeight: "bold",
                color: "#1976d2",
              }}
            >
              Reservation Request
            </p>
            <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
              Submit your details to request a parking slot. The admin will
              review and assign you an available slot.
            </p>
          </div>

          {/* Availability Info in Modal */}
          {holdAvailability && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                background: canReserve ? "#d4edda" : "#f8d7da",
                borderRadius: "4px",
                border: canReserve ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontWeight: "bold",
                  color: canReserve ? "#155724" : "#721c24",
                  fontSize: "14px",
                }}
              >
                Current Availability
              </p>
              <p
                style={{
                  margin: "0",
                  color: canReserve ? "#155724" : "#721c24",
                  fontSize: "13px",
                }}
              >
                {holdAvailability.availableSlots} slots available •{" "}
                {holdAvailability.pendingHolds} pending requests
              </p>
            </div>
          )}

          <form onSubmit={handleReserveSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Plate Number: *
              </label>
              <input
                type="text"
                value={reserveForm.plateNumber}
                onChange={(e) =>
                  setReserveForm({
                    ...reserveForm,
                    plateNumber: e.target.value,
                  })
                }
                placeholder="e.g., ABC 1234"
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Preferred Location:
              </label>
              <select
                value={reserveForm.preferredLocation}
                onChange={(e) =>
                  setReserveForm({
                    ...reserveForm,
                    preferredLocation: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">No Preference</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Vehicle Type:
              </label>
              <select
                value={reserveForm.vehicleType}
                onChange={(e) =>
                  setReserveForm({
                    ...reserveForm,
                    vehicleType: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">Any Type</option>
                {uniqueVehicleTypes.map((vehicleType) => (
                  <option key={vehicleType} value={vehicleType}>
                    {vehicleType}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Payment Method: *
              </label>
              <select
                value={reserveForm.paymentMethod}
                onChange={(e) =>
                  setReserveForm({
                    ...reserveForm,
                    paymentMethod: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                required
              >
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Amount:
              </label>
              <input
                type="text"
                value="₱30.00"
                disabled
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#f8f9fa",
                  color: "#666",
                }}
              />
              <p
                style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}
              >
                Fixed amount for slot reservation request
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: "12px",
                  background: "#ffe5e5",
                  color: "#a00",
                  border: "1px solid #f5b5b5",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowReserveModal(false);
                  setError("");
                }}
                disabled={reserveLoading}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: reserveLoading ? "not-allowed" : "pointer",
                  opacity: reserveLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reserveLoading || !canReserve}
                style={{
                  padding: "8px 16px",
                  background:
                    reserveLoading || !canReserve ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    reserveLoading || !canReserve ? "not-allowed" : "pointer",
                  opacity: reserveLoading || !canReserve ? 0.6 : 1,
                }}
              >
                {reserveLoading ? "Processing..." : "Submit Reservation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header with stats */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 16px 0", color: "#333" }}>
          Parking Availability
        </h1>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #28a745",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#28a745",
                fontSize: "14px",
              }}
            >
              Available
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {availableSlots}
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #dc3545",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#dc3545",
                fontSize: "14px",
              }}
            >
              Occupied
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {occupiedSlots}
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #856404",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#856404",
                fontSize: "14px",
              }}
            >
              Maintenance
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {maintenanceSlots}
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #ffc107",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#ffc107",
                fontSize: "14px",
              }}
            >
              Pending Holds
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {pendingHolds}
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #007bff",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#007bff",
                fontSize: "14px",
              }}
            >
              Available for Holding
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {availableForHolding}
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderLeft: "3px solid #6c757d",
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                color: "#6c757d",
                fontSize: "14px",
              }}
            >
              Total Slots
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {totalSlots}
            </p>
          </div>
        </div>

        {/* Reserve Slot Button */}
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={handleReserveSlot}
            disabled={!canReserve}
            style={{
              padding: "12px 24px",
              background: canReserve ? "#ffc107" : "#6c757d",
              color: canReserve ? "#212529" : "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: canReserve ? "pointer" : "not-allowed",
              fontSize: "16px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: canReserve ? 1 : 0.6,
            }}
          >
            {canReserve
              ? "Reserve a Parking Slot"
              : "No Slots Available for Reservation"}
          </button>
        </div>

        {/* Availability Status */}
        {holdAvailability && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "8px",
              border: canReserve ? "1px solid #28a745" : "1px solid #dc3545",
              background: canReserve ? "#d4edda" : "#f8d7da",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <h4
                  style={{
                    margin: "0 0 4px 0",
                    color: canReserve ? "#155724" : "#721c24",
                    fontSize: "16px",
                  }}
                >
                  {canReserve
                    ? `✅ ${availableForHolding} slot${
                        availableForHolding === 1 ? "" : "s"
                      } available for reservation`
                    : "❌ No slots available for reservation"}
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: canReserve ? "#155724" : "#721c24",
                    fontSize: "14px",
                  }}
                >
                  {holdAvailability.availableSlots} total available •{" "}
                  {holdAvailability.pendingHolds} pending reservations
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#333" }}>Filters</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Location Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Location:
              </label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Type Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Vehicle Type:
              </label>
              <select
                value={filterVehicleType}
                onChange={(e) => setFilterVehicleType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All Vehicle Types</option>
                {uniqueVehicleTypes.map((vehicleType) => (
                  <option key={vehicleType} value={vehicleType}>
                    {vehicleType}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={clearFilters}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                border: "1px solid #6c757d",
                borderRadius: "4px",
                background: "#6c757d",
                color: "white",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
            <span
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                color: "#666",
                display: "flex",
                alignItems: "center",
              }}
            >
              Showing {totalSlots} of {slots.length} slots
            </span>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: autoRefresh ? "#28a745" : "#fff",
                  color: autoRefresh ? "#fff" : "#333",
                  cursor: "pointer",
                }}
              >
                {autoRefresh ? "Auto Refresh ON" : "Auto Refresh OFF"}
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value={2000}>Refresh every 2s</option>
                <option value={5000}>Refresh every 5s</option>
                <option value={10000}>Refresh every 10s</option>
                <option value={30000}>Refresh every 30s</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => loadSlots(true)}
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
            {loading ? "Loading..." : "Refresh Now"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "16px",
            background: "#ffe5e5",
            color: "#a00",
            border: "1px solid #f5b5b5",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Parking Slots Grid */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ fontSize: "18px", color: "#666" }}>
            Loading parking slots...
          </p>
        </div>
      ) : filteredSlots.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ fontSize: "18px", color: "#666" }}>
            {slots.length === 0
              ? "No parking slots found."
              : "No slots match your filters."}
          </p>
          {slots.length > 0 && (
            <button
              onClick={clearFilters}
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredSlots.map((slot) => {
            const statusStyle = getStatusColor(slot.status);
            const vehicleStyle = getVehicleTypeColor(slot.vehicle_type);

            return (
              <div
                key={slot.slot_id}
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  border:
                    slot.status === "available"
                      ? "2px solid #28a745"
                      : slot.status === "occupied"
                      ? "2px solid #dc3545"
                      : "2px solid #856404",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                    Slot #{slot.slot_id}
                  </h3>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background: statusStyle.bg,
                      color: statusStyle.color,
                    }}
                  >
                    {statusStyle.text}
                  </span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <p
                    style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}
                  >
                    <strong>Location:</strong> {slot.location}
                  </p>
                  <p
                    style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}
                  >
                    <strong>Vehicle Type:</strong>{" "}
                    {slot.vehicle_type ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          background: vehicleStyle.bg,
                          color: vehicleStyle.color,
                        }}
                      >
                        {slot.vehicle_type}
                      </span>
                    ) : (
                      "Any"
                    )}
                  </p>
                  <p
                    style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}
                  >
                    <strong>Sensor ID:</strong> {slot.sensor_id ?? "None"}
                  </p>
                </div>

                {slot.status === "available" && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#e6ffed",
                      borderRadius: "4px",
                      border: "1px solid #badbcc",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#0a6",
                        fontWeight: "bold",
                      }}
                    >
                      🅿️ Ready for Parking
                    </p>
                  </div>
                )}

                {slot.status === "occupied" && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#ffe5e5",
                      borderRadius: "4px",
                      border: "1px solid #f5b5b5",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#a00",
                        fontWeight: "bold",
                      }}
                    >
                      🚗 Currently Occupied
                    </p>
                  </div>
                )}

                {slot.status === "maintenance" && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#fff3cd",
                      borderRadius: "4px",
                      border: "1px solid #ffeaa7",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#856404",
                        fontWeight: "bold",
                      }}
                    >
                      Under Maintenance
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reserve Slot Modal */}
      {renderReserveModal()}
    </div>
  );
};

export default UserParkingSlots;
