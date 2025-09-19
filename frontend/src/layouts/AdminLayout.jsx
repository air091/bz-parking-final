import { NavLink, Outlet } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";

// Create context for ESP base URL
const ESPContext = createContext();

export const useESP = () => {
  const context = useContext(ESPContext);
  if (!context) {
    throw new Error("useESP must be used within an ESPProvider");
  }
  return context;
};

export default function AdminLayout() {
  const [espBaseUrl, setEspBaseUrl] = useState("");

  // Load ESP base URL from localStorage on mount
  useEffect(() => {
    try {
      const savedEspBaseUrl = localStorage.getItem("espBaseUrl");
      if (savedEspBaseUrl) {
        setEspBaseUrl(savedEspBaseUrl);
      }
    } catch (error) {
      console.error("Error loading ESP base URL from localStorage:", error);
    }
  }, []);

  // Save ESP base URL to localStorage when it changes
  const updateEspBaseUrl = (url) => {
    setEspBaseUrl(url);
    try {
      localStorage.setItem("espBaseUrl", url);
    } catch (error) {
      console.error("Error saving ESP base URL to localStorage:", error);
    }
  };

  return (
    <ESPContext.Provider
      value={{ espBaseUrl, setEspBaseUrl: updateEspBaseUrl }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{ width: 240, padding: 16, borderRight: "1px solid #e5e5e5" }}
        >
          <h2 style={{ marginTop: 0 }}>BZpark Admin</h2>
          <nav style={{ display: "grid", gap: 8 }}>
            <NavLink to="/admin" end>
              Dashboard
            </NavLink>
            <NavLink to="/admin/arduino">Arduino</NavLink>
            <NavLink to="/admin/sensors">Sensors</NavLink>
            <NavLink to="/admin/services">Services</NavLink>
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
    </ESPContext.Provider>
  );
}
