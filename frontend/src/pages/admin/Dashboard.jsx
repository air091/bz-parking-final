import React, { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Statistics state
  const [parkingStats, setParkingStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [slotStats, setSlotStats] = useState(null);
  const [serviceStats, setServiceStats] = useState(null);
  const [holdPaymentStats, setHoldPaymentStats] = useState(null);

  // Recent activities state
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentHoldPayments, setRecentHoldPayments] = useState([]);

  // Combined revenue calculation
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch all statistics in parallel
      const [
        parkingRes,
        paymentRes,
        slotRes,
        serviceRes,
        holdPaymentRes,
        activitiesRes,
        paymentsRes,
        holdPaymentsRes,
      ] = await Promise.all([
        fetch("/api/parking-activity/statistics"),
        fetch("/api/parking-payment/statistics"),
        fetch("/api/parking-slot/stats"),
        fetch("/api/service/statistics"),
        fetch("/api/hold-payment/statistics"),
        fetch("/api/parking-activity?limit=5&sort=start_time&order=desc"),
        fetch("/api/parking-payment?limit=5&sort=created_at&order=desc"),
        fetch("/api/hold-payment?limit=5&sort=created_at&order=desc"),
      ]);

      // Parse responses
      const parkingData = await parkingRes.json();
      const paymentData = await paymentRes.json();
      const slotData = await slotRes.json();
      const serviceData = await serviceRes.json();
      const holdPaymentData = await holdPaymentRes.json();
      const activitiesData = await activitiesRes.json();
      const paymentsData = await paymentsRes.json();
      const holdPaymentsData = await holdPaymentsRes.json();

      // Set statistics
      if (parkingData.success) setParkingStats(parkingData.data);
      if (paymentData.success) setPaymentStats(paymentData.data);
      if (slotData.success) setSlotStats(slotData.data);
      if (serviceData.success) setServiceStats(serviceData.data);
      if (holdPaymentData.success) setHoldPaymentStats(holdPaymentData.data);
      if (activitiesData.success)
        setRecentActivities(activitiesData.data || []);
      if (holdPaymentsData.success)
        setRecentHoldPayments(holdPaymentsData.data || []);

      // Calculate total revenue from parking activities (paid ones)
      let parkingRevenue = 0;
      if (parkingData.success && parkingData.data) {
        // Get revenue from completed activities that are paid
        const completedRes = await fetch("/api/parking-activity/completed");
        const completedData = await completedRes.json();
        if (completedData.success && completedData.data) {
          // Filter for paid activities and sum their amounts
          const paidActivities = completedData.data.filter(
            (activity) => activity.is_paid
          );
          parkingRevenue = paidActivities.reduce((sum, activity) => {
            return sum + (parseFloat(activity.amount) || 0);
          }, 0);
        }
      }

      // Get hold payment revenue
      const holdRevenue =
        holdPaymentData.success && holdPaymentData.data
          ? parseFloat(holdPaymentData.data.total_amount) || 0
          : 0;

      // Set combined revenue
      setTotalRevenue(parkingRevenue + holdRevenue);

      // For payments, we need to get the amounts from the corresponding activities
      if (paymentsData.success) {
        const payments = paymentsData.data || [];
        const paymentsWithAmounts = await Promise.all(
          payments.map(async (payment) => {
            try {
              // Fetch the corresponding activity to get the amount
              const activityRes = await fetch(
                `/api/parking-activity/${payment.act_id}`
              );
              const activityData = await activityRes.json();
              return {
                ...payment,
                amount: activityData.success ? activityData.data.amount : 0,
              };
            } catch (err) {
              console.error(`Error fetching activity ${payment.act_id}:`, err);
              return { ...payment, amount: 0 };
            }
          })
        );
        setRecentPayments(paymentsWithAmounts);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  // Utility functions
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "₱0.00";
    return `₱${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
      case "paid":
        return "#10b981"; // green
      case "incomplete":
      case "unpaid":
        return "#f59e0b"; // yellow
      case "cancelled":
      case "failed":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          fontSize: "18px",
          color: "#6b7280",
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          fontSize: "18px",
          color: "#ef4444",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h1
        style={{
          marginBottom: "24px",
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1f2937",
        }}
      >
        Dashboard Overview
      </h1>

      {/* Statistics Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {/* Parking Activities Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ color: "white", fontSize: "20px" }}></span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                Parking Activities
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {parkingStats?.total_activities || 0}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#10b981" }}>
              Active: {parkingStats?.active_activities || 0}
            </span>
            <span style={{ color: "#6b7280" }}>
              Completed: {parkingStats?.completed_activities || 0}
            </span>
          </div>
        </div>

        {/* Parking Slots Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ color: "white", fontSize: "20px" }}>️</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                Parking Slots
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {slotStats?.overview?.total_slots || 0}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#10b981" }}>
              Available: {slotStats?.overview?.available_slots || 0}
            </span>
            <span style={{ color: "#ef4444" }}>
              Occupied: {slotStats?.overview?.occupied_slots || 0}
            </span>
          </div>
        </div>

        {/* Revenue Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ color: "white", fontSize: "20px" }}></span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                Total Revenue
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#6b7280" }}>
              Parking:{" "}
              {formatCurrency(
                totalRevenue - (holdPaymentStats?.total_amount || 0)
              )}
            </span>
            <span style={{ color: "#10b981" }}>
              Hold: {formatCurrency(holdPaymentStats?.total_amount || 0)}
            </span>
          </div>
        </div>

        {/* Services Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ color: "white", fontSize: "20px" }}>⚙️</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                Services
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {serviceStats?.total_services || 0}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#10b981" }}>
              Active: {serviceStats?.active_services || 0}
            </span>
            <span style={{ color: "#6b7280" }}>
              Inactive: {serviceStats?.inactive_services || 0}
            </span>
          </div>
        </div>

        {/* Hold Payments Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ color: "white", fontSize: "20px" }}></span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                Hold Payments
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {holdPaymentStats?.total_payments || 0}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "#10b981" }}>
              GCash: {holdPaymentStats?.gcash_count || 0}
            </span>
            <span style={{ color: "#3b82f6" }}>
              PayMaya: {holdPaymentStats?.paymaya_count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activities and Payments */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {/* Recent Parking Activities */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Recent Parking Activities
          </h3>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {recentActivities.length === 0 ? (
              <p
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No recent activities
              </p>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={activity.id || index}
                  style={{
                    padding: "12px",
                    borderBottom:
                      index < recentActivities.length - 1
                        ? "1px solid #f3f4f6"
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      User #{activity.user_id}
                    </p>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}
                    >
                      {formatDate(activity.start_time)}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background:
                        getStatusColor(
                          activity.end_time
                            ? activity.is_paid
                              ? "completed"
                              : "unpaid"
                            : "active"
                        ) + "20",
                      color: getStatusColor(
                        activity.end_time
                          ? activity.is_paid
                            ? "completed"
                            : "unpaid"
                          : "active"
                      ),
                    }}
                  >
                    {activity.end_time
                      ? activity.is_paid
                        ? "Completed"
                        : "Unpaid"
                      : "Active"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Recent Parking Payments
          </h3>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {recentPayments.length === 0 ? (
              <p
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No recent payments
              </p>
            ) : (
              recentPayments.map((payment, index) => (
                <div
                  key={payment.id || index}
                  style={{
                    padding: "12px",
                    borderBottom:
                      index < recentPayments.length - 1
                        ? "1px solid #f3f4f6"
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(payment.amount)}
                    </p>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}
                    >
                      {payment.payment_method} •{" "}
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: "#10b98120",
                      color: "#10b981",
                    }}
                  >
                    Paid
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Hold Payments */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Recent Hold Payments
          </h3>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {recentHoldPayments.length === 0 ? (
              <p
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No recent hold payments
              </p>
            ) : (
              recentHoldPayments.map((payment, index) => (
                <div
                  key={payment.id || index}
                  style={{
                    padding: "12px",
                    borderBottom:
                      index < recentHoldPayments.length - 1
                        ? "1px solid #f3f4f6"
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(payment.amount)}
                    </p>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}
                    >
                      {payment.payment_method} •{" "}
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: "#ef444420",
                      color: "#ef4444",
                    }}
                  >
                    Hold
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#1f2937",
          }}
        >
          Quick Actions
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <button
            onClick={() => (window.location.href = "/admin/parking-activities")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            View All Activities
          </button>
          <button
            onClick={() => (window.location.href = "/admin/parking-payments")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            View All Payments
          </button>
          <button
            onClick={() => (window.location.href = "/admin/hold-payments")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            View Hold Payments
          </button>
          <button
            onClick={() => (window.location.href = "/admin/parking-slots")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            Manage Parking Slots
          </button>
          <button
            onClick={() => (window.location.href = "/admin/users")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
