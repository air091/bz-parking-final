import React, { useEffect, useMemo, useRef, useState } from "react";

const AdminHoldPayments = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds

  const [tab, setTab] = useState("all"); // all | gcash | paymaya | pending | completed
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState("gcash");
  const [createIsDone, setCreateIsDone] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editUserId, setEditUserId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editIsDone, setEditIsDone] = useState(false);

  const [stats, setStats] = useState(null);

  const searchUserRef = useRef(null);

  const apiBase = "/api/hold-payment";

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

  const load = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not on auto-refresh
      if (isInitialLoad) {
        setLoading(true);
      }
      setErr("");

      let url = `${apiBase}`;
      if (tab === "gcash") url = `${apiBase}/method/gcash`;
      if (tab === "paymaya") url = `${apiBase}/method/paymaya`;
      if (tab === "pending") url = `${apiBase}/pending`;
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
      } else if (minAmount && maxAmount) {
        const q = new URLSearchParams({
          minAmount: minAmount,
          maxAmount: maxAmount,
        }).toString();
        url = `${apiBase}/amount-range?${q}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load hold payments"
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
  }, [tab, userId, dateFrom, dateTo, minAmount, maxAmount]);

  // Auto-refresh effect - silent refresh without loading spinner
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        load(false); // Auto-refresh without loading spinner
        fetchStats();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    autoRefresh,
    refreshInterval,
    tab,
    userId,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
  ]);

  const applyFilters = async () => {
    await load();
  };

  const clearFilters = async () => {
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setTab("all");
    await load();
  };

  const createHoldPayment = async () => {
    try {
      setErr("");
      setMsg("");
      if (!createUserId.trim()) throw new Error("User ID is required");
      if (!createAmount.trim()) throw new Error("Amount is required");

      const body = {
        user_id: Number(createUserId),
        amount: Number(createAmount),
        payment_method: createPaymentMethod,
        is_done: createIsDone,
      };

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to create hold payment"
        );

      setMsg("Hold payment created successfully");
      autoHide();
      setShowCreate(false);
      setCreateUserId("");
      setCreateAmount("");
      setCreatePaymentMethod("gcash");
      setCreateIsDone(false);
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const updateHoldPayment = async () => {
    if (!editingId) return;
    try {
      setErr("");
      setMsg("");

      const body = {};
      if (editUserId.trim()) body.user_id = Number(editUserId);
      if (editAmount.trim()) body.amount = Number(editAmount);
      if (editPaymentMethod) body.payment_method = editPaymentMethod;
      body.is_done = editIsDone;

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
          data?.message || data?.error || "Failed to update hold payment"
        );

      setMsg("Hold payment updated successfully");
      autoHide();
      setEditingId(null);
      setEditUserId("");
      setEditAmount("");
      setEditPaymentMethod("");
      setEditIsDone(false);
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const markAsDone = async (id) => {
    try {
      setErr("");
      setMsg("");
      const res = await fetch(`${apiBase}/${id}/mark-done`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to mark payment as done"
        );
      setMsg("Hold payment marked as done");
      autoHide();
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const markAsPending = async (id) => {
    try {
      setErr("");
      setMsg("");
      const res = await fetch(`${apiBase}/${id}/mark-pending`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to mark payment as pending"
        );
      setMsg("Hold payment marked as pending");
      autoHide();
      await load();
      await fetchStats();
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteHoldPayment = async (id) => {
    if (!confirm("Are you sure you want to delete this hold payment?")) return;
    try {
      setErr("");
      setMsg("");
      const res = await fetch(`${apiBase}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to delete hold payment"
        );
      setMsg("Hold payment deleted successfully");
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
        <h2 style={{ margin: 0 }}>Hold Payments</h2>
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
            onClick={() => setTab("pending")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border:
                tab === "pending" ? "1px solid #007bff" : "1px solid #ddd",
              background: tab === "pending" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            Pending
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
          <input
            type="number"
            step="0.01"
            min="0"
            max="999.99"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min amount"
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              width: 100,
            }}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            max="999.99"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Max amount"
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              width: 100,
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
          <div style={{ fontSize: 12, color: "#666" }}>Total Amount</div>
          <div style={{ fontWeight: 700 }}>{money(s.total_amount)}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Average Amount</div>
          <div style={{ fontWeight: 700 }}>{money(s.average_amount)}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Pending Count</div>
          <div style={{ fontWeight: 700, color: "#ff9800" }}>
            {s.pending_count || 0}
          </div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Completed Count</div>
          <div style={{ fontWeight: 700, color: "#4caf50" }}>
            {s.completed_count || 0}
          </div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Pending Total</div>
          <div style={{ fontWeight: 700, color: "#ff9800" }}>
            {money(s.pending_total)}
          </div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Completed Total</div>
          <div style={{ fontWeight: 700, color: "#4caf50" }}>
            {money(s.completed_total)}
          </div>
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
          <div style={{ fontSize: 12, color: "#666" }}>GCash Total</div>
          <div style={{ fontWeight: 700 }}>{money(s.gcash_total)}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>PayMaya Total</div>
          <div style={{ fontWeight: 700 }}>{money(s.paymaya_total)}</div>
        </div>
      </div>
    );
  };

  const Table = () => {
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
                Amount
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
                Status
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
              <tr key={item.hold_payment_id}>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {item.hold_payment_id}
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
                  {money(item.amount)}
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
                        item.payment_method === "gcash" ? "#e8f5e8" : "#fff3cd",
                      color:
                        item.payment_method === "gcash" ? "#155724" : "#856404",
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
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: item.is_done ? "#e8f5e8" : "#fff3cd",
                      color: item.is_done ? "#155724" : "#856404",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.is_done ? "Completed" : "Pending"}
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
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.hold_payment_id);
                        setEditUserId(item.user_id.toString());
                        setEditAmount(item.amount.toString());
                        setEditPaymentMethod(item.payment_method);
                        setEditIsDone(item.is_done || false);
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
                    {!item.is_done ? (
                      <button
                        type="button"
                        onClick={() => markAsDone(item.hold_payment_id)}
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
                        Mark Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsPending(item.hold_payment_id)}
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          background: "#ff9800",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Mark Pending
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteHoldPayment(item.hold_payment_id)}
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
                <td colSpan={9} style={{ padding: 12, color: "#666" }}>
                  No hold payments found.
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
          <h3 style={{ margin: "0 0 16px 0" }}>Create Hold Payment</h3>
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
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="999.99"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              placeholder="Enter amount"
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
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={createIsDone}
                onChange={(e) => setCreateIsDone(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{ fontWeight: "bold" }}>Mark as completed</span>
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreateUserId("");
                setCreateAmount("");
                setCreatePaymentMethod("gcash");
                setCreateIsDone(false);
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
              onClick={createHoldPayment}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!createUserId.trim() || !createAmount.trim()}
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
            Edit Hold Payment #{editingId}
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
            >
              User ID
            </label>
            <input
              value={editUserId}
              onChange={(e) => setEditUserId(e.target.value)}
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
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="999.99"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="Enter amount"
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
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={editIsDone}
                onChange={(e) => setEditIsDone(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{ fontWeight: "bold" }}>Mark as completed</span>
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditUserId("");
                setEditAmount("");
                setEditPaymentMethod("");
                setEditIsDone(false);
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
              onClick={updateHoldPayment}
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
          <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>Hold Payments</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            Manage parking slot reservation requests
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

      <CreateModal />
      <EditModal />
    </div>
  );
};

export default AdminHoldPayments;
