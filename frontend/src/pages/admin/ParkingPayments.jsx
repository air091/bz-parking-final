import React, { useEffect, useMemo, useRef, useState } from "react";

const AdminParkingPayments = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("all"); // all | gcash | paymaya | cash
  const [userId, setUserId] = useState("");
  const [actId, setActId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createActId, setCreateActId] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState("gcash");

  const [editingId, setEditingId] = useState(null);
  const [editUserId, setEditUserId] = useState("");
  const [editActId, setEditActId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");

  const [stats, setStats] = useState(null);
  const [actList, setActList] = useState([]);
  const [showCompleted, setShowCompleted] = useState(true);

  const searchUserRef = useRef(null);
  const searchActRef = useRef(null);

  const apiBase = "/api/parking-payment";

  const autoHide = () => setTimeout(() => setMsg(""), 2500);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "-");
  const money = (n) =>
    n === null || n === undefined
      ? "-"
      : Number(n).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

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

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      let url = `${apiBase}`;
      if (tab === "gcash") url = `${apiBase}/method/gcash`;
      if (tab === "paymaya") url = `${apiBase}/method/paymaya`;
      if (tab === "cash") url = `${apiBase}/method/cash`;

      // precise filters override tab
      if (userId.trim()) {
        url = `${apiBase}/user/${encodeURIComponent(userId.trim())}`;
      } else if (actId.trim()) {
        url = `${apiBase}/activity/${encodeURIComponent(actId.trim())}`;
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
          data?.message || data?.error || "Failed to load parking payments"
        );
      const items = Array.isArray(data?.data) ? data.data : [];
      setList(items);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedActivities = async () => {
    try {
      const res = await fetch("/api/parking-activity/completed");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load activities"
        );
      const items = Array.isArray(data?.data) ? data.data : [];
      // Filter to only show completed AND paid activities
      const completedAndPaid = items.filter((activity) => activity.is_paid);
      setActList(completedAndPaid);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    load();
    fetchStats();
    fetchCompletedActivities();
  }, []);

  useEffect(() => {
    load();
  }, [tab]);

  const applyFilters = async () => {
    await load();
  };

  const clearFilters = async () => {
    setUserId("");
    setActId("");
    setDateFrom("");
    setDateTo("");
    setTab("all");
    await load();
  };

  const createParkingPayment = async () => {
    try {
      setErr("");
      setMsg("");
      if (!createUserId.trim()) throw new Error("User ID is required");
      if (!createActId.trim()) throw new Error("Activity ID is required");

      const body = {
        user_id: Number(createUserId),
        act_id: Number(createActId),
        payment_method: createPaymentMethod,
      };

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to create parking payment"
        );

      setMsg("Parking payment created successfully");
      autoHide();
      setShowCreate(false);
      setCreateUserId("");
      setCreateActId("");
      setCreatePaymentMethod("gcash");
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const updateParkingPayment = async () => {
    if (!editingId) return;
    try {
      setErr("");
      setMsg("");

      const body = {};
      if (editPaymentMethod) body.payment_method = editPaymentMethod;

      if (Object.keys(body).length === 0) {
        throw new Error("At least one field must be provided for update");
      }

      const res = await fetch(`${apiBase}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to update parking payment"
        );

      setMsg("Parking payment updated successfully");
      autoHide();
      setEditingId(null);
      setEditUserId("");
      setEditActId("");
      setEditPaymentMethod("");
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteParkingPayment = async (id) => {
    if (!confirm("Are you sure you want to delete this parking payment?"))
      return;
    try {
      setErr("");
      setMsg("");
      const res = await fetch(`${apiBase}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to delete parking payment"
        );
      setMsg("Parking payment deleted successfully");
      autoHide();
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const computed = useMemo(() => {
    return (list || []).map((item) => ({ ...item }));
  }, [list]);

  const completedActivities = useMemo(() => {
    return (actList || []).map((a) => ({
      ...a,
      _status: a?.end_time ? "complete" : "incomplete",
    }));
  }, [actList]);

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
        <h2 style={{ margin: 0 }}>Parking Payments</h2>
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
            onClick={() => setTab("gcash")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: tab === "gcash" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "gcash" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            GCash
          </button>
          <button
            onClick={() => setTab("paymaya")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border:
                tab === "paymaya" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "paymaya" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            PayMaya
          </button>
          <button
            onClick={() => setTab("cash")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: tab === "cash" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "cash" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            Cash
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
            ref={searchActRef}
            value={actId}
            onChange={(e) => {
              setActId(e.target.value);
              requestAnimationFrame(() => searchActRef.current?.focus());
            }}
            placeholder="Filter by activity ID"
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
          onClick={() => setShowCreate(true)}
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "none",
            background: "#28a745",
            color: "white",
            cursor: "pointer",
          }}
        >
          + Create Payment
        </button>
      </div>
    </div>
  );

  const Stats = () => {
    if (!stats) return null;
    const s = stats;

    return (
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
      >
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total Payments</div>
          <div style={{ fontWeight: 700 }}>{s.total_payments || 0}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>GCash Count</div>
          <div style={{ fontWeight: 700 }}>{s.gcash_count || 0}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>PayMaya Count</div>
          <div style={{ fontWeight: 700 }}>{s.paymaya_count || 0}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Cash Count</div>
          <div style={{ fontWeight: 700 }}>{s.cash_count || 0}</div>
        </div>
      </div>
    );
  };

  const ActivitiesTable = () => {
    const items = completedActivities;
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
                Amount
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
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
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
                      background: a.end_time ? "#e6ffed" : "#fff5f5",
                      color: a.end_time ? "#0a6" : "#c42d2d",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {a.end_time ? "complete" : "incomplete"}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                  No completed activities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const PaymentsTable = () => {
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
                Plate Number
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Activity
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Payment Method
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Created At
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Updated At
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
            {items.map((item) => (
              <tr key={item.parking_payment_id}>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {item.parking_payment_id}
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
                    #{item.user_id}
                  </span>
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {item.plate_number || "-"}
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
                      background: "#f3e5f5",
                      color: "#7b1fa2",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    #{item.act_id}
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
                        item.payment_method === "gcash"
                          ? "#e8f5e8"
                          : item.payment_method === "paymaya"
                          ? "#fff3cd"
                          : "#f8d7da",
                      color:
                        item.payment_method === "gcash"
                          ? "#155724"
                          : item.payment_method === "paymaya"
                          ? "#856404"
                          : "#721c24",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.payment_method}
                  </span>
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {fmt(item.created_at)}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {fmt(item.updated_at)}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.parking_payment_id);
                        setEditUserId(item.user_id?.toString?.() || "");
                        setEditActId(item.act_id?.toString?.() || "");
                        setEditPaymentMethod(item.payment_method);
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
                    <button
                      type="button"
                      onClick={() =>
                        deleteParkingPayment(item.parking_payment_id)
                      }
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ padding: 12, color: "#666" }}>
                  No parking payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const CreateModal = () => {
    if (!showCreate) return null;
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
          <h3 style={{ margin: "0 0 16px 0" }}>Create Parking Payment</h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              User ID
            </label>
            <input
              value={createUserId}
              onChange={(e) => setCreateUserId(e.target.value)}
              placeholder="Enter user ID"
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
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Activity ID
            </label>
            <input
              value={createActId}
              onChange={(e) => setCreateActId(e.target.value)}
              placeholder="Enter activity ID"
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
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Payment Method
            </label>
            <select
              value={createPaymentMethod}
              onChange={(e) => setCreatePaymentMethod(e.target.value)}
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
                setShowCreate(false);
                setCreateUserId("");
                setCreateActId("");
                setCreatePaymentMethod("gcash");
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
              onClick={createParkingPayment}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!createUserId.trim() || !createActId.trim()}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if (!editingId) return null;
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
          <h3 style={{ margin: "0 0 16px 0" }}>
            Edit Parking Payment #{editingId}
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              User ID
            </label>
            <div
              style={{
                padding: 8,
                border: "1px solid #eee",
                borderRadius: 4,
                background: "#f9f9f9",
                color: "#555",
              }}
            >
              #{editUserId || "-"}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Activity ID
            </label>
            <div
              style={{
                padding: 8,
                border: "1px solid #eee",
                borderRadius: 4,
                background: "#f9f9f9",
                color: "#555",
              }}
            >
              #{editActId || "-"}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              Payment Method
            </label>
            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
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
                setEditingId(null);
                setEditUserId("");
                setEditActId("");
                setEditPaymentMethod("");
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
              onClick={updateParkingPayment}
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
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <Header />
      {stats && <Stats />}

      <div
        style={{
          margin: "12px 0 8px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>
          Completed Parking Activities
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#666", fontSize: 12 }}>
            {actList.length} result{actList.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {showCompleted ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {showCompleted &&
        (loading ? (
          <div style={{ padding: 12, color: "#666" }}>Loading...</div>
        ) : (
          <ActivitiesTable />
        ))}

      <div
        style={{
          margin: "12px 0 8px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>Parking Payments</h3>
        <span style={{ color: "#666", fontSize: 12 }}>
          {list.length} result{list.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : (
        <PaymentsTable />
      )}

      {(err || msg) && (
        <div style={{ marginBottom: 12 }}>
          {err && (
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
              {err}
            </div>
          )}
          {msg && (
            <div
              style={{
                padding: "8px 12px",
                background: "#e6ffed",
                color: "#0a6",
                border: "1px solid #badbcc",
                borderRadius: 6,
              }}
            >
              {msg}
            </div>
          )}
        </div>
      )}

      <CreateModal />
      <EditModal />
    </div>
  );
};

export default AdminParkingPayments;
