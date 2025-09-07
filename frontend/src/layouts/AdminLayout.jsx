import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{ width: 240, padding: 16, borderRight: "1px solid #e5e5e5" }}
      >
        <h2 style={{ marginTop: 0 }}>BZpark Admin</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/services">Services</NavLink>
          <NavLink to="/admin/sensors">Sensors</NavLink>
          <NavLink to="/admin/parking-slots">Parking Slots</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/parking-activities">Parking Activities</NavLink>
          <NavLink to="/admin/parking-payments">Parking Payments</NavLink>
          <NavLink to="/admin/hold-payments">Hold Payments</NavLink>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
