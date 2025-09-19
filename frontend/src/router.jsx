import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout.jsx";
import UserLayout from "./layouts/UserLayout.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminArduino from "./pages/admin/Arduino";
import AdminServices from "./pages/admin/Services.jsx";
import AdminSensors from "./pages/admin/Sensors.jsx";
import AdminParkingSlots from "./pages/admin/ParkingSlots.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import AdminParkingPayments from "./pages/admin/ParkingPayments.jsx";
import AdminParkingActivities from "./pages/admin/ParkingActivities.jsx";
import AdminHoldPayments from "./pages/admin/HoldPayments.jsx";
import UserParkingSlots from "./pages/user/ParkingSlots.jsx";
import NotFound from "./pages/admin/NotFound.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/user" replace /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "arduino", element: <AdminArduino /> },
      { path: "services", element: <AdminServices /> },
      { path: "sensors", element: <AdminSensors /> },
      { path: "parking-slots", element: <AdminParkingSlots /> },
      { path: "users", element: <AdminUsers /> },
      { path: "parking-payments", element: <AdminParkingPayments /> },
      { path: "parking-activities", element: <AdminParkingActivities /> },
      { path: "hold-payments", element: <AdminHoldPayments /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/user",
    element: <UserLayout />,
    children: [
      { index: true, element: <UserParkingSlots /> },
      { path: "parking-slots", element: <UserParkingSlots /> },
      { path: "*", element: <Navigate to="/user" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
