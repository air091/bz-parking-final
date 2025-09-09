import React, { useEffect, useRef, useState } from "react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("table"); // "table" | "list"
  const [search, setSearch] = useState("");
  const searchInputRef = useRef(null);

  const [editingUser, setEditingUser] = useState(null);
  const [editPlate, setEditPlate] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createPlate, setCreatePlate] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const apiBase = "/api/user";

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(apiBase);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Failed to load users");
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setError("");
      if (!search.trim()) {
        await load();
        return;
      }
      const url = `${apiBase}/search?search=${encodeURIComponent(
        search.trim()
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Search failed");
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const autoHideMessage = () => {
    setTimeout(() => setMessage(""), 3000);
  };

  const createUser = async () => {
    try {
      setError("");
      setMessage("");
      const body = { plate_number: createPlate.trim() };
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Create failed");
      setMessage("User created successfully");
      autoHideMessage();
      setShowCreate(false);
      setCreatePlate("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (u) => {
    setEditingUser(u);
    setEditPlate(u.plate_number || "");
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      setError("");
      setMessage("");
      const res = await fetch(`${apiBase}/${editingUser.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate_number: editPlate.trim() }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("User updated successfully");
      autoHideMessage();
      setEditingUser(null);
      setEditPlate("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteUser = async () => {
    if (!deletingId) return;
    try {
      setError("");
      setMessage("");
      const res = await fetch(`${apiBase}/${deletingId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Delete failed");
      setMessage("User deleted successfully");
      autoHideMessage();
      setDeletingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const HeaderBar = () => (
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
        <h2 style={{ margin: 0 }}>Users</h2>
        <span style={{ color: "#666", fontSize: 14 }}>
          {loading
            ? "Loading..."
            : `${users.length} result${users.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setActiveTab("table")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border:
                activeTab === "table" ? "1px solid #007bff" : "1px solid #ddd",
              background: activeTab === "table" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            Table
          </button>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border:
                activeTab === "list" ? "1px solid #007bff" : "1px solid #ddd",
              background: activeTab === "list" ? "#e9f2ff" : "white",
              cursor: "pointer",
            }}
          >
            List
          </button>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // ensure the field keeps focus even after re-render
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchUsers();
            }}
            placeholder="Search by plate number"
            style={{
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              minWidth: 220,
            }}
          />
          <button
            type="button"
            onClick={searchUsers}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "none",
              background: "#007bff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              load();
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
          >
            Reset
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
          + New User
        </button>
      </div>
    </div>
  );

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
              Plate Number
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
          {users.map((u) => (
            <tr key={u.user_id}>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {u.user_id}
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
                  {u.plate_number}
                </span>
              </td>
              <td
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "6px 4px",
                }}
              >
                {u.created_at ? new Date(u.created_at).toLocaleString() : "-"}
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
                    onClick={() => startEdit(u)}
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
                    onClick={() => setDeletingId(u.user_id)}
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
          {users.length === 0 && !loading && (
            <tr>
              <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderList = () => (
    <div style={{ display: "grid", gap: 8 }}>
      {users.map((u) => (
        <div
          key={u.user_id}
          style={{
            padding: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            background: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: 16 }}>
                User #{u.user_id}
              </h4>
              <p style={{ margin: "2px 0", color: "#666", fontSize: 14 }}>
                Plate:{" "}
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
                  {u.plate_number}
                </span>
              </p>
              <p style={{ margin: "2px 0", color: "#666", fontSize: 14 }}>
                Created:{" "}
                {u.created_at ? new Date(u.created_at).toLocaleString() : "-"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => startEdit(u)}
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
                onClick={() => setDeletingId(u.user_id)}
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
          </div>
        </div>
      ))}
      {users.length === 0 && !loading && (
        <div style={{ padding: 12, color: "#666" }}>No users found.</div>
      )}
    </div>
  );

  const renderEditModal = () => {
    if (!editingUser) return null;
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
            Edit User #{editingUser.user_id}
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Plate Number:
            </label>
            <input
              value={editPlate}
              onChange={(e) => setEditPlate(e.target.value)}
              placeholder="Enter plate number"
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
                setEditingUser(null);
                setEditPlate("");
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
              onClick={updateUser}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#007bff",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!editPlate.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateModal = () => {
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
          <h3 style={{ margin: "0 0 16px 0" }}>Create New User</h3>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Plate Number:
            </label>
            <input
              value={createPlate}
              onChange={(e) => setCreatePlate(e.target.value)}
              placeholder="Enter plate number"
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
                setShowCreate(false);
                setCreatePlate("");
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
              onClick={createUser}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!createPlate.trim()}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirm = () => {
    if (!deletingId) return null;
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
            minWidth: 320,
            maxWidth: 420,
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>Delete User</h3>
          <p style={{ margin: "0 0 16px 0", color: "#666" }}>
            Are you sure you want to delete user #{deletingId}? This action
            cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setDeletingId(null)}
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
              onClick={deleteUser}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#dc3545",
                color: "white",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <HeaderBar />

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

      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : activeTab === "table" ? (
        renderTable()
      ) : (
        renderList()
      )}

      {renderEditModal()}
      {renderCreateModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default AdminUsers;
