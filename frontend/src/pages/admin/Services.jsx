import React, { useEffect, useMemo, useState } from "react";

const initialForm = { vehicle_type: "", first_2_hrs: "", per_succ_hr: "" };

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = useMemo(() => "/api/service", []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(apiBase);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to fetch services"
        );
      setServices(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // keep numeric fields numeric-ish while allowing empty
    if ((name === "first_2_hrs" || name === "per_succ_hr") && value !== "") {
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const payload = {
      vehicle_type: form.vehicle_type.trim(),
      first_2_hrs: form.first_2_hrs === "" ? 0 : Number(form.first_2_hrs),
      per_succ_hr: form.per_succ_hr === "" ? 0 : Number(form.per_succ_hr),
    };

    try {
      const res = await fetch(editingId ? `${apiBase}/${editingId}` : apiBase, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Request failed");

      setMessage(
        data?.message || (editingId ? "Service updated" : "Service created")
      );
      await fetchServices();
      resetForm();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (svc) => {
    setEditingId(svc.service_id);
    setForm({
      vehicle_type: svc.vehicle_type || "",
      first_2_hrs: String(svc.first_2_hrs ?? ""),
      per_succ_hr: String(svc.per_succ_hr ?? ""),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this service?")) return;
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Delete failed");
      setMessage(data?.message || "Service deleted");
      await fetchServices();
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Services</h1>

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

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 8, maxWidth: 420, marginBottom: 16 }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <label htmlFor="vehicle_type">Vehicle Type</label>
          <input
            id="vehicle_type"
            name="vehicle_type"
            value={form.vehicle_type}
            onChange={handleChange}
            placeholder="e.g., car, motorcycle"
            required
          />
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label htmlFor="first_2_hrs">First 2 Hours (amount)</label>
          <input
            id="first_2_hrs"
            name="first_2_hrs"
            type="number"
            min="0"
            value={form.first_2_hrs}
            onChange={handleChange}
            placeholder="e.g., 50"
          />
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label htmlFor="per_succ_hr">Per Succeeding Hour (amount)</label>
          <input
            id="per_succ_hr"
            name="per_succ_hr"
            type="number"
            min="0"
            value={form.per_succ_hr}
            onChange={handleChange}
            placeholder="e.g., 20"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting}>
            {submitting
              ? "Saving..."
              : editingId
              ? "Update Service"
              : "Add Service"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} disabled={submitting}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <p>Loading...</p>
        ) : services.length === 0 ? (
          <p>No services found.</p>
        ) : (
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
                  Vehicle Type
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  First 2 Hours
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: "8px 4px",
                  }}
                >
                  Per Succeeding Hour
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
              {services.map((s) => (
                <tr key={s.service_id}>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.service_id}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.vehicle_type}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.first_2_hrs}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    {s.per_succ_hr}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "6px 4px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => handleEdit(s)}
                        style={{ fontSize: "12px", padding: "4px 8px" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.service_id)}
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          color: "#a00",
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
        )}
      </div>
    </div>
  );
};

export default AdminServices;
