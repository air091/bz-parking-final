import { Outlet } from "react-router-dom";

export default function UserLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <header
        style={{
          background: "#007bff",
          color: "white",
          padding: "16px 24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "24px" }}>BZpark</h1>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
            Smart Parking System
          </p>
        </div>
      </header>

      <main style={{ padding: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
}
