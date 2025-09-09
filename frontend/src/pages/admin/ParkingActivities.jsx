import React, { useEffect, useMemo, useRef, useState } from "react";

const AdminParkingActivities = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("all"); // all | active | completed
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showStart, setShowStart] = useState(false);
  const [startUserId, setStartUserId] = useState("");
  const [startTime, setStartTime] = useState("");

  const [endingId, setEndingId] = useState(null);
  const [endTime, setEndTime] = useState("");

  const [stats, setStats] = useState(null);

  const searchUserRef = useRef(null);

  const apiBase = "/api/parking-activity";

  const autoHide = () => setTimeout(() => setMsg(""), 2500);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "-");
  const statusOf = (a) => (a?.end_time ? "Completed" : "Active");

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
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchStats();
  }, []);

  useEffect(() => {
    load();
  }, [tab]);

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

  const computed = useMemo(() => {
    return (list || []).map((a) => {
      const start = a.start_time ? new Date(a.start_time) : null;
      const end = a.end_time ? new Date(a.end_time) : null;
      let durationMins = "-";
      if (start) {
        const endRef = end || new Date();
        durationMins = Math.max(0, Math.round((endRef - start) / 60000));
      }
      return { ...a, _status: statusOf(a), _durationMins: durationMins };
    });
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
          onClick={() => setShowStart(true)}
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
    return (
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
      >
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Total</div>
          <div style={{ fontWeight: 700 }}>{s.total || 0}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Active</div>
          <div style={{ fontWeight: 700 }}>{s.active || 0}</div>
        </div>
        <div
          style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Completed</div>
          <div style={{ fontWeight: 700 }}>{s.completed || 0}</div>
        </div>
        {"avg_duration_mins" in s && (
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
            <div style={{ fontWeight: 700 }}>
              {Math.round(s.avg_duration_mins || 0)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Table = () => (
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
              Duration (min)
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
          {computed.map((a) => (
            <tr key={a.activity_id}>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {a.activity_id}
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
                {a._durationMins}
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
                    background: a._status === "Active" ? "#fff8e1" : "#e6ffed",
                    color: a._status === "Active" ? "#8a6d3b" : "#0a6",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {a._status}
                </span>
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  {!a.end_time && (
                    <button
                      type="button"
                      onClick={() => {
                        setEndingId(a.activity_id);
                        setEndTime("");
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
                </div>
              </td>
            </tr>
          ))}
          {computed.length === 0 && !loading && (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: "#666" }}>
                No activities found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

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
              User ID
            </label>
            <input
              value={startUserId}
              onChange={(e) => setStartUserId(e.target.value)}
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

  return (
    <div style={{ padding: 12 }}>
      <Header />
      {stats && <Stats />}

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

      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : (
        <Table />
      )}

      <StartModal />
      <EndModal />
    </div>
  );
};

export default AdminParkingActivities;
