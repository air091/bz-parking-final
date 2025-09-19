import React, { useEffect, useMemo, useRef, useState } from "react";

const AdminParkingActivities = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds

  const [tab, setTab] = useState("all"); // all | active | completed
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showStart, setShowStart] = useState(false);
  const [startUserId, setStartUserId] = useState("");
  const [startTime, setStartTime] = useState("");

  const [endingId, setEndingId] = useState(null);
  const [endTime, setEndTime] = useState("");

  // Add edit state variables
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editUserId, setEditUserId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editIsPaid, setEditIsPaid] = useState(false);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]); // add this
  const [services, setServices] = useState([]);

  // Payment flow state
  const [showPay, setShowPay] = useState(false);
  const [payingActId, setPayingActId] = useState(null);
  const [payingUserId, setPayingUserId] = useState(null);
  const [payMethod, setPayMethod] = useState("gcash");
  const searchUserRef = useRef(null);

  const apiBase = "/api/parking-activity";

  const autoHide = () => setTimeout(() => setMsg(""), 2500);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "-");
  const statusOf = (a) => {
    if (!a?.end_time) return "Incomplete";
    return a.is_paid ? "Completed" : "Unpaid";
  };
  const money = (n) =>
    n === null || n === undefined
      ? "-"
      : Number(n).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const toLocalInputValue = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mi = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiBase}/statistics`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Failed to load stats");
      setStats(data.data || null);
    } catch (e) {
      // non-fatal
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Failed to load users");
      const items = Array.isArray(data?.data) ? data.data : [];
      setUsers(
        items.map((u) => ({
          user_id: u.user_id,
          plate_number: u.plate_number,
          service_id: u.service_id,
        }))
      );
    } catch (e) {
      // silent
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/service");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load services"
        );
      const items = Array.isArray(data?.data) ? data.data : [];
      setServices(items);
    } catch (e) {
      // silent
    }
  };

  const load = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not on auto-refresh
      if (isInitialLoad) {
        setLoading(true);
      }
      setErr("");

      let url = `${apiBase}`;
      if (tab === "active") url = `${apiBase}/active`;
      if (tab === "completed") url = `${apiBase}/completed`;

      // precise filters override tab
      if (userId.trim()) {
        url = `${apiBase}/user/${encodeURIComponent(userId.trim())}`;
      } else if (dateFrom && dateTo) {
        const q = new URLSearchParams({
          startDate: dateFrom,
          endDate: dateTo,
        }).toString();
        url = `${apiBase}/date-range?${q}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load activities"
        );
      const items = Array.isArray(data?.data) ? data.data : [];
      setList(items);
    } catch (e) {
      setErr(e.message);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load(true); // Initial load with loading spinner
    fetchStats();
    fetchUsers();
    fetchServices();
  }, [tab, userId, dateFrom, dateTo]);

  // Auto-refresh effect - silent refresh without loading spinner
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        load(false); // Auto-refresh without loading spinner
        fetchStats();
        fetchUsers();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, tab, userId, dateFrom, dateTo]);

  const applyFilters = async () => {
    await load();
  };

  const clearFilters = async () => {
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setTab("all");
    await load();
  };

  const startActivity = async () => {
    try {
      setErr("");
      setMsg("");
      if (!startUserId.trim()) throw new Error("User ID is required");

      const body = {
        user_id: Number(startUserId),
      };
      if (startTime) body.start_time = new Date(startTime).toISOString();

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to start activity"
        );

      setMsg("Parking activity started");
      autoHide();
      setShowStart(false);
      setStartUserId("");
      setStartTime("");
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const endActivity = async () => {
    if (!endingId) return;
    try {
      setErr("");
      setMsg("");

      const body = {};
      if (endTime) body.end_time = new Date(endTime).toISOString();

      const res = await fetch(`${apiBase}/${endingId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to end activity"
        );

      setMsg("Parking activity ended");
      autoHide();
      setEndingId(null);
      setEndTime("");
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const markAsPaid = async (id) => {
    try {
      setErr("");
      setMsg("");
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: 1 }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to mark as paid"
        );
      setMsg("Marked as paid");
      autoHide();
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  // Open modal to choose payment method
  const openPayModal = (a) => {
    setErr("");
    setMsg("");
    setPayingActId(a.act_id);
    setPayingUserId(a.user_id);
    setPayMethod("gcash");
    setShowPay(true);
  };

  // Create payment then mark activity as paid
  const confirmMarkPaid = async () => {
    if (!payingActId || !payingUserId) return;
    try {
      setErr("");
      setMsg("");
      const resCreate = await fetch("/api/parking-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(payingUserId),
          act_id: Number(payingActId),
          payment_method: payMethod,
        }),
      });
      const dataCreate = await resCreate.json();
      if (!resCreate.ok) {
        throw new Error(
          dataCreate?.message || dataCreate?.error || "Failed to create payment"
        );
      }
      await markAsPaid(payingActId);
      setMsg("Payment recorded and activity marked as paid");
      autoHide();
      setShowPay(false);
      setPayingActId(null);
      setPayingUserId(null);
      setPayMethod("gcash");
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  // Add edit functions
  const openEditModal = (activity) => {
    setEditingId(activity.act_id);
    setEditUserId(activity.user_id.toString());
    setEditStartTime(
      activity.start_time ? toLocalInputValue(activity.start_time) : ""
    );
    setEditEndTime(
      activity.end_time ? toLocalInputValue(activity.end_time) : ""
    );
    setEditIsPaid(!!activity.is_paid);
    setShowEdit(true);
  };

  const updateActivity = async () => {
    try {
      setErr("");
      setMsg("");

      const updateData = {
        user_id: parseInt(editUserId),
        is_paid: editIsPaid ? 1 : 0,
      };

      if (editStartTime) {
        updateData.start_time = editStartTime;
      }
      if (editEndTime) {
        updateData.end_time = editEndTime;
      }

      const res = await fetch(`${apiBase}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to update activity"
        );

      setMsg("Activity updated successfully");
      autoHide();
      setShowEdit(false);
      setEditingId(null);
      setEditUserId("");
      setEditStartTime("");
      setEditEndTime("");
      setEditIsPaid(false);
      load(); // Refresh the list
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteActivity = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setErr("");
      setMsg("");

      const res = await fetch(`${apiBase}/${editingId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to delete activity"
        );

      setMsg("Activity deleted successfully");
      autoHide();
      setShowEdit(false);
      setEditingId(null);
      setEditUserId("");
      setEditStartTime("");
      setEditEndTime("");
      load(); // Refresh the list
    } catch (e) {
      setErr(e.message);
    }
  };

  const computed = useMemo(() => {
    let filteredList = list || [];

    // Apply client-side filtering based on tab selection
    if (tab === "active") {
      filteredList = filteredList.filter((a) => !a.end_time);
    } else if (tab === "completed") {
      // Only show activities that are both completed (have end_time) AND paid
      filteredList = filteredList.filter((a) => a.end_time && a.is_paid);
    } else if (tab === "unpaid") {
      // Show only activities that are not paid
      filteredList = filteredList.filter((a) => !a.is_paid);
    }
    // For "all" tab, show all activities without additional filtering

    return filteredList.map((a) => {
      return { ...a, _status: statusOf(a) };
    });
  }, [list, tab]);

  const Header = () => (
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
        <h2 style={{ margin: 0 }}>Parking Activities</h2>
        <span style={{ color: "#666", fontSize: 14 }}>
          {loading
            ? "Loading..."
            : `${list.length} result${list.length === 1 ? "" : "s"}`}
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
            onClick={() => setTab("all")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: tab === "all" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "all" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            onClick={() => setTab("active")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: tab === "active" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "active" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            Active
          </button>
          <button
            onClick={() => setTab("completed")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border:
                tab === "completed" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "completed" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            Completed
          </button>
          <button
            onClick={() => setTab("unpaid")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: tab === "unpaid" ? "1px solid #e53e3e" : "1px solid #ddd",
              background: tab === "unpaid" ? "#fff5f5" : "white",
              color: tab === "unpaid" ? "#e53e3e" : "inherit",
              cursor: "pointer",
            }}
          >
            Unpaid
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={searchUserRef}
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              requestAnimationFrame(() => searchUserRef.current?.focus());
            }}
            placeholder="Filter by user ID"
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              width: 140,
            }}
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          />
          <button
            type="button"
            onClick={applyFilters}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "none",
              background: "#007bff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowStart(true);
            setStartTime(toLocalInputValue(new Date()));
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "none",
            background: "#28a745",
            color: "white",
            cursor: "pointer",
          }}
        >
          + Start Activity
        </button>
      </div>
    </div>
  );

  const Stats = () => {
    if (!stats) return null;
    const s = stats;
    const total = s.total_activities || 0;
    const active = s.active_activities || 0;
    const completed = s.completed_activities || 0;
    const avgMins = s.avg_duration_seconds
      ? Math.round((s.avg_duration_seconds || 0) / 60)
      : 0;

    // Calculate statistics from the filtered/computed list
    const currentList = computed; // Use the filtered list
    const unpaidActivities = currentList.filter(
      (activity) => !activity.is_paid
    );
    const unpaidCount = unpaidActivities.length;
    const unpaidAmount = unpaidActivities.reduce((sum, activity) => {
      const amount = activity.amount;
      if (amount === null || amount === undefined || amount === "") {
        return sum;
      }
      const numericAmount = Number(amount);
      return sum + (isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);

    const paidActivities = currentList.filter((activity) => activity.is_paid);
    const paidCount = paidActivities.length;
    const paidAmount = paidActivities.reduce((sum, activity) => {
      const amount = activity.amount;
      if (amount === null || amount === undefined || amount === "") {
        return sum;
      }
      const numericAmount = Number(amount);
      return sum + (isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);

    // Calculate total completed count (activities with end_time)
    const completedActivities = currentList.filter(
      (activity) => activity.end_time
    );
    const totalCompletedCount = completedActivities.length;

    // Context-aware statistics based on selected tab
    if (tab === "active") {
      // Show only active-related statistics
      return (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              border: "1px solid #e0e0e0",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Active Activities</div>
            <div style={{ fontWeight: 700 }}>{currentList.length}</div>
          </div>
          <div
            style={{
              padding: 12,
              border: "1px solid #e0e0e0",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>
              Avg Duration (min)
            </div>
            <div style={{ fontWeight: 700 }}>{avgMins}</div>
          </div>
        </div>
      );
    }

    if (tab === "completed") {
      // Show total gain and total completed count for completed activities
      return (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              border: "1px solid #e0e0e0",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Total Completed</div>
            <div style={{ fontWeight: 700 }}>{totalCompletedCount}</div>
          </div>
          <div
            style={{
              padding: 12,
              border: "1px solid #28a745",
              borderRadius: 6,
              background: "#f8fff8",
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Total Gain</div>
            <div style={{ fontWeight: 700, color: "#28a745" }}>
              {money(paidAmount)}
            </div>
          </div>
        </div>
      );
    }

    if (tab === "unpaid") {
      // Only show unpaid statistics
      return (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              border: "1px solid #ff6b6b",
              borderRadius: 6,
              background: "#fff5f5",
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Unpaid Activities</div>
            <div style={{ fontWeight: 700, color: "#e53e3e" }}>
              {unpaidCount}
            </div>
          </div>
          <div
            style={{
              padding: 12,
              border: "1px solid #ff6b6b",
              borderRadius: 6,
              background: "#fff5f5",
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Unpaid Amount</div>
            <div style={{ fontWeight: 700, color: "#e53e3e" }}>
              {money(unpaidAmount)}
            </div>
          </div>
        </div>
      );
    }

    // For "all" tab, show all statistics
    return (
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
      >
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total</div>
          <div style={{ fontWeight: 700 }}>{total}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Active</div>
          <div style={{ fontWeight: 700 }}>{active}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Completed</div>
          <div style={{ fontWeight: 700 }}>{completed}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total Completed</div>
          <div style={{ fontWeight: 700 }}>{totalCompletedCount}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Avg Duration (min)</div>
          <div style={{ fontWeight: 700 }}>{avgMins}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #28a745",
            borderRadius: 6,
            background: "#f8fff8",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Paid Activities</div>
          <div style={{ fontWeight: 700, color: "#28a745" }}>{paidCount}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #28a745",
            borderRadius: 6,
            background: "#f8fff8",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total Paid</div>
          <div style={{ fontWeight: 700, color: "#28a745" }}>
            {money(paidAmount)}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #ff6b6b",
            borderRadius: 6,
            background: "#fff5f5",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Unpaid Activities</div>
          <div style={{ fontWeight: 700, color: "#e53e3e" }}>{unpaidCount}</div>
        </div>
        <div
          style={{
            padding: 12,
            border: "1px solid #ff6b6b",
            borderRadius: 6,
            background: "#fff5f5",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Unpaid Amount</div>
          <div style={{ fontWeight: 700, color: "#e53e3e" }}>
            {money(unpaidAmount)}
          </div>
        </div>
      </div>
    );
  };

  const UsersCards = () => {
    if (!users || users.length === 0) return null;
    const getVehicleType = (serviceId) => {
      const service = services.find((s) => s.service_id === serviceId);
      return service?.vehicle_type || "Unknown";
    };

    return (
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Users</h3>
          <span style={{ color: "#666", fontSize: 12 }}>
            {users.length} user{users.length === 1 ? "" : "s"}
          </span>
        </div>
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
                  Plate Number
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
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
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
                        background: "#e3f2fd",
                        color: "#1976d2",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      title={`User ID ${u.user_id}`}
                    >
                      #{u.user_id}
                    </span>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: "#333", fontWeight: 600 }}
                    >
                      {u.plate_number || "-"}
                    </span>
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
                          getVehicleType(u.service_id) === "car"
                            ? "#e8f5e8"
                            : getVehicleType(u.service_id) === "bike"
                            ? "#fff3cd"
                            : "#f3e5f5",
                        color:
                          getVehicleType(u.service_id) === "car"
                            ? "#155724"
                            : getVehicleType(u.service_id) === "bike"
                            ? "#856404"
                            : "#7b1fa2",
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {getVehicleType(u.service_id)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const Table = () => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, []);

    const items = computed;

    return (
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
                User
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Start
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                End
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Duration (hr)
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Amount
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Paid
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const start = a.start_time ? new Date(a.start_time) : null;
              const end = a.end_time ? new Date(a.end_time) : null;
              let durationMins = "-";
              if (start) {
                const endRef = end || new Date();
                const durationHours = Math.max(
                  0,
                  Math.round((endRef - start) / 3600000)
                );
                durationMins = durationHours;
              }

              return (
                <tr key={a.act_id}>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {a.act_id}
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
                        background: "#e3f2fd",
                        color: "#1976d2",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      #{a.user_id}
                    </span>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {fmt(a.start_time)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {fmt(a.end_time)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div>{durationMins}</div>
                      {a._status === "Active" &&
                        typeof durationMins === "number" && (
                          <div
                            title={`${durationMins} hr`}
                            style={{
                              width: 120,
                              height: 6,
                              background: "#eee",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(
                                  100,
                                  Math.round((durationMins / 2) * 100)
                                )}%`,
                                background:
                                  durationMins < 2 ? "#66bb6a" : "#f39c12",
                              }}
                            />
                          </div>
                        )}
                    </div>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {money(a.amount)}
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
                        background: a.is_paid ? "#e6ffed" : "#ffabab",
                        color: a.is_paid ? "#0a6" : "#c42d2d",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {a.is_paid ? "Yes" : "No"}
                    </span>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid " + "#f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: a.end_time ? "#e6ffed" : "#fff5f5",
                        color: a.end_time ? "#0a6" : "#c42d2d",
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      {a.end_time ? "complete" : "incomplete"}
                    </span>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid " + "#f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      {!a.end_time && (
                        <button
                          type="button"
                          onClick={() => {
                            setEndingId(a.act_id);
                            setEndTime(toLocalInputValue(new Date()));
                          }}
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          End
                        </button>
                      )}
                      {a.end_time && !a.is_paid && (
                        <button
                          type="button"
                          onClick={() => openPayModal(a)}
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          Mark Paid
                        </button>
                      )}
                      {/* Add Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(a)}
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
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={9} style={{ padding: 12, color: "#666" }}>
                  No activities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const StartModal = () => {
    if (!showStart) return null;
    return (
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
            minWidth: 360,
            maxWidth: 480,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>Start Parking Activity</h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              User
            </label>
            <select
              value={startUserId}
              onChange={(e) => setStartUserId(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="">Select a user</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  #{u.user_id} - {u.plate_number || "-"}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Start Time (optional)
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowStart(false);
                setStartUserId("");
                setStartTime("");
              }}
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
              type="button"
              onClick={startActivity}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!startUserId.trim()}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EndModal = () => {
    if (!endingId) return null;
    return (
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
            minWidth: 340,
            maxWidth: 460,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>End Activity #{endingId}</h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              End Time (optional)
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setEndingId(null);
                setEndTime("");
              }}
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
              type="button"
              onClick={endActivity}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#6c757d",
                color: "white",
                cursor: "pointer",
              }}
            >
              End
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PayModal = () => {
    if (!showPay) return null;
    return (
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
            minWidth: 340,
            maxWidth: 460,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>
            Record Payment for Activity #{payingActId}
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Payment Method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="gcash">GCash</option>
              <option value="paymaya">PayMaya</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowPay(false);
                setPayingActId(null);
                setPayingUserId(null);
                setPayMethod("gcash");
              }}
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
              type="button"
              onClick={confirmMarkPaid}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add Edit Modal component
  const EditModal = () => {
    if (!showEdit) return null;
    return (
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
            maxWidth: 500,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>Edit Parking Activity</h3>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              User ID
            </label>
            <input
              type="number"
              value={editUserId}
              onChange={(e) => setEditUserId(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Start Time
            </label>
            <input
              type="datetime-local"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              End Time
            </label>
            <input
              type="datetime-local"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={editIsPaid}
                onChange={(e) => setEditIsPaid(e.target.checked)}
              />
              Is Paid
            </label>
          </div>

          <div
            style={{ display: "flex", gap: 8, justifyContent: "space-between" }}
          >
            <button
              type="button"
              onClick={deleteActivity}
              style={{
                padding: "6px 10px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Delete
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowEdit(false);
                  setEditingId(null);
                  setEditUserId("");
                  setEditStartTime("");
                  setEditEndTime("");
                  setEditIsPaid(false);
                }}
                style={{
                  padding: "6px 10px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateActivity}
                style={{
                  padding: "6px 10px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                disabled={!editUserId.trim()}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Header with refresh controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>
            Parking Activities
          </h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            Monitor and manage parking sessions
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Auto-refresh controls */}
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
              <option value={5000}>Refresh every 5s</option>
              <option value={10000}>Refresh every 10s</option>
              <option value={30000}>Refresh every 30s</option>
              <option value={60000}>Refresh every 1m</option>
            </select>
          </div>

          <button
            onClick={() => load(true)}
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
      {err && (
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
          {err}
        </div>
      )}

      {/* Success Message */}
      {msg && (
        <div
          style={{
            padding: "16px",
            background: "#d4edda",
            color: "#155724",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : (
        <Table />
      )}

      <StartModal />
      <EndModal />
      <PayModal />
      <EditModal />
    </div>
  );
};

export default AdminParkingActivities;
