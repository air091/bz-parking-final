import React, { useEffect, useState } from "react";

// Add this outside the component, at the top of the file
let globalAutoDetectionInterval = null;
let globalAutoDetectionActive = false;
let globalEspBaseUrl = "";
let globalDetectionInterval = 3000;

// Global function for auto-detection
const globalAutoDetection = async () => {
  if (!globalEspBaseUrl) return;

  try {
    // Call ESP8266 API directly
    const res = await fetch(`${globalEspBaseUrl}/distance/both`, {
      method: "GET",
    });

    if (res.ok) {
      const data = await res.json();
      console.log("ESP8266 direct response:", data);

      // Parse the result string to extract distance values
      const result = data.result;

      if (result && result !== "TIMEOUT") {
        let distance1 = null;
        let distance2 = null;

        // Parse different formats that Arduino might send
        // Format: "DISTANCES: S1=15 IN, S2=22 IN"
        const distancesMatch = result.match(
          /DISTANCES:\s*S1=(\d+)\s*IN,\s*S2=(\d+)\s*IN/i
        );
        if (distancesMatch) {
          distance1 = parseInt(distancesMatch[1]);
          distance2 = parseInt(distancesMatch[2]);
        }

        // Format: "DISTANCE1: 15 IN"
        const distance1Match = result.match(/DISTANCE1:\s*(\d+)\s*IN/i);
        if (distance1Match) {
          distance1 = parseInt(distance1Match[1]);
        }

        // Format: "DISTANCE2: 22 IN"
        const distance2Match = result.match(/DISTANCE2:\s*(\d+)\s*IN/i);
        if (distance2Match) {
          distance2 = parseInt(distance2Match[1]);
        }

        // Format: Plain numbers "15,22" or "15 22"
        if (!distance1 && !distance2) {
          const numbers = result.match(/(\d+)/g);
          if (numbers && numbers.length >= 2) {
            distance1 = parseInt(numbers[0]);
            distance2 = parseInt(numbers[1]);
          }
        }

        console.log(
          `Parsed distances: Sensor1=${distance1}, Sensor2=${distance2}`
        );

        // Update sensors based on their data status
        const updatePromises = [];

        // Handle Sensor 1 (ID 7)
        if (distance1 !== null && distance1 > 0) {
          updatePromises.push(
            fetch("/api/sensor/7", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: distance1,
                status: "working",
              }),
            })
          );
          console.log(
            "✅ Sensor 7 updated to 'working' - distance:",
            distance1
          );
        } else {
          updatePromises.push(
            fetch("/api/sensor/7", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: 0,
                status: "maintenance",
              }),
            })
          );
          console.log("⚠️ Sensor 7 set to 'maintenance' - no valid data");
        }

        // Handle Sensor 2 (ID 6)
        if (distance2 !== null && distance2 > 0) {
          updatePromises.push(
            fetch("/api/sensor/6", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: distance2,
                status: "working",
              }),
            })
          );
          console.log(
            "✅ Sensor 6 updated to 'working' - distance:",
            distance2
          );
        } else {
          updatePromises.push(
            fetch("/api/sensor/6", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: 0,
                status: "maintenance",
              }),
            })
          );
          console.log("⚠️ Sensor 6 set to 'maintenance' - no valid data");
        }

        // Execute all updates
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log("✅ Updated sensor ranges and status from ESP8266 API");
        }
      } else {
        console.log("ESP8266 returned TIMEOUT or empty response");
        // Set all sensors to maintenance when no data is received
        const updatePromises = [
          fetch("/api/sensor/7", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sensor_range: 0,
              status: "maintenance",
            }),
          }),
          fetch("/api/sensor/6", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sensor_range: 0,
              status: "maintenance",
            }),
          }),
        ];

        await Promise.all(updatePromises);
        console.log("⚠️ All sensors set to 'maintenance' - no data received");
      }
    } else {
      console.log(`ESP8266 API error: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.log("ESP8266 API fetch error:", e.message);
  }
};

const AdminSensors = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [espBaseUrl, setEspBaseUrl] = useState("");
  const [esp8266Data, setEsp8266Data] = useState(null);
  const [esp8266Loading, setEsp8266Loading] = useState(false);

  // New state for automatic distance detection - initialize from localStorage
  const [autoDistanceDetection, setAutoDistanceDetection] = useState(() => {
    try {
      return localStorage.getItem("autoDistanceDetection") === "true";
    } catch {
      return false;
    }
  });

  const [distanceDetectionInterval, setDistanceDetectionInterval] = useState(
    () => {
      try {
        const saved = localStorage.getItem("distanceDetectionInterval");
        return saved ? parseInt(saved) : 3000;
      } catch {
        return 3000;
      }
    }
  );

  // New state for connected devices
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [scanningDevices, setScanningDevices] = useState(false);
  // Add Arduino-related state variables
  const [arduinos, setArduinos] = useState([]);
  const [showArduinoTable, setShowArduinoTable] = useState(false);

  // Function to scan for connected devices
  const scanConnectedDevices = async () => {
    setScanningDevices(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/sensor/scan-devices", {
        method: "GET",
      });

      const data = await res.json();

      if (res.ok) {
        setConnectedDevices(data.data || []);
        setMessage(`Found ${data.count} connected devices`);

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setMessage("");
        }, 5000);
      } else {
        throw new Error(
          data?.message || data?.error || "Failed to scan devices"
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setScanningDevices(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/sensor");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load sensors"
        );
      setSensors(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Automatic distance detection function with multiple fallback approaches
  const fetchDistancesAutomatically = async () => {
    if (!espBaseUrl) return;

    try {
      const headers = {};
      // Extract IP from espBaseUrl
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      // Try multiple approaches to get distance data
      let distanceData = null;

      // Approach 1: Try /distance/both
      try {
        const res1 = await fetch(`/api/esp8266/distance/both`, {
          method: "GET",
          headers,
        });

        if (res1.ok) {
          const text1 = await res1.text();
          if (text1 && text1.trim() !== "") {
            const data1 = JSON.parse(text1);
            if (data1 && data1.success && data1.data) {
              distanceData = data1.data;
              console.log(
                "✅ Got distance data from /distance/both:",
                distanceData
              );
            }
          }
        }
      } catch (e) {
        console.log("Approach 1 failed:", e.message);
      }

      // Approach 2: Try individual distance endpoints
      if (!distanceData) {
        try {
          const [res1, res2] = await Promise.all([
            fetch(`/api/esp8266/distance/1`, { method: "GET", headers }),
            fetch(`/api/esp8266/distance/2`, { method: "GET", headers }),
          ]);

          let distance1 = null;
          let distance2 = null;

          if (res1.ok) {
            const text1 = await res1.text();
            if (text1 && text1.trim() !== "") {
              const data1 = JSON.parse(text1);
              if (data1 && data1.success && data1.data) {
                distance1 = data1.data.distance || data1.data.distance1;
              }
            }
          }

          if (res2.ok) {
            const text2 = await res2.text();
            if (text2 && text2.trim() !== "") {
              const data2 = JSON.parse(text2);
              if (data2 && data2.success && data2.data) {
                distance2 = data2.data.distance || data2.data.distance2;
              }
            }
          }

          if (distance1 !== null || distance2 !== null) {
            distanceData = { distance1, distance2 };
            console.log(
              "✅ Got distance data from individual endpoints:",
              distanceData
            );
          }
        } catch (e) {
          console.log("Approach 2 failed:", e.message);
        }
      }

      // Approach 3: Use sensor server as fallback
      if (!distanceData) {
        try {
          const res = await fetch("http://localhost:8000/api/sensor", {
            method: "GET",
          });

          if (res.ok) {
            const data = await res.json();
            if (data && (data.sensor1In !== null || data.sensor2In !== null)) {
              distanceData = {
                distance1: data.sensor1In,
                distance2: data.sensor2In,
              };
              console.log(
                "✅ Got distance data from sensor server:",
                distanceData
              );
            }
          }
        } catch (e) {
          console.log("Approach 3 failed:", e.message);
        }
      }

      // Update database if we have distance data
      if (distanceData) {
        setEsp8266Data(distanceData);

        // Update sensors in database
        const updatePromises = [];

        if (
          distanceData.distance1 !== null &&
          distanceData.distance1 !== undefined
        ) {
          updatePromises.push(
            fetch("/api/sensor/7", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: Math.round(distanceData.distance1),
                status: "working",
              }),
            })
          );
        }

        if (
          distanceData.distance2 !== null &&
          distanceData.distance2 !== undefined
        ) {
          updatePromises.push(
            fetch("/api/sensor/6", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: Math.round(distanceData.distance2),
                status: "working",
              }),
            })
          );
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log("✅ Updated sensor ranges in database");
          // Reload sensors to show updated ranges
          setTimeout(load, 500);
        }
      } else {
        console.log("❌ No distance data available from any source");
      }
    } catch (e) {
      console.log("Auto distance detection error:", e.message);
    }
  };

  // Simplified automatic distance detection using sensor server
  const fetchDistancesFromSensorServer = async () => {
    try {
      // Fetch from local sensor server (sensorServer.js)
      const res = await fetch("http://localhost:8000/api/sensor", {
        method: "GET",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Sensor server data:", data);

        if (data && (data.sensor1In !== null || data.sensor2In !== null)) {
          // Update sensors in database using the sensor server data
          const updatePromises = [];

          if (data.sensor1In !== null && data.sensor1In !== undefined) {
            updatePromises.push(
              fetch("/api/sensor/7", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: Math.round(data.sensor1In),
                  status: "working",
                }),
              })
            );
          }

          if (data.sensor2In !== null && data.sensor2In !== undefined) {
            updatePromises.push(
              fetch("/api/sensor/6", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: Math.round(data.sensor2In),
                  status: "working",
                }),
              })
            );
          }

          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log("✅ Updated sensor ranges from sensor server");
            // Reload sensors to show updated ranges
            setTimeout(load, 500);
          }
        }
      } else {
        console.log(`Sensor server error: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.log("Sensor server fetch error:", e.message);
    }
  };

  // Test sensor server directly
  const testSensorServer = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/sensor");
      const data = await res.json();
      console.log("Sensor server data:", data);
    } catch (e) {
      console.log("Sensor server test failed:", e.message);
    }
  };

  // Direct ESP8266 API approach (bypass sensor server)
  const fetchDistancesFromESP8266Direct = async () => {
    if (!espBaseUrl) return;

    try {
      // Call ESP8266 API directly
      const res = await fetch(`${espBaseUrl}/distance/both`, {
        method: "GET",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("ESP8266 direct response:", data);

        // Parse the result string to extract distance values
        const result = data.result;

        if (result && result !== "TIMEOUT") {
          let distance1 = null;
          let distance2 = null;

          // Parse different formats that Arduino might send
          // Format: "DISTANCES: S1=15 IN, S2=22 IN"
          const distancesMatch = result.match(
            /DISTANCES:\s*S1=(\d+)\s*IN,\s*S2=(\d+)\s*IN/i
          );
          if (distancesMatch) {
            distance1 = parseInt(distancesMatch[1]);
            distance2 = parseInt(distancesMatch[2]);
          }

          // Format: "DISTANCE1: 15 IN"
          const distance1Match = result.match(/DISTANCE1:\s*(\d+)\s*IN/i);
          if (distance1Match) {
            distance1 = parseInt(distance1Match[1]);
          }

          // Format: "DISTANCE2: 22 IN"
          const distance2Match = result.match(/DISTANCE2:\s*(\d+)\s*IN/i);
          if (distance2Match) {
            distance2 = parseInt(distance2Match[1]);
          }

          // Format: Plain numbers "15,22" or "15 22"
          if (!distance1 && !distance2) {
            const numbers = result.match(/(\d+)/g);
            if (numbers && numbers.length >= 2) {
              distance1 = parseInt(numbers[0]);
              distance2 = parseInt(numbers[1]);
            }
          }

          console.log(
            `Parsed distances: Sensor1=${distance1}, Sensor2=${distance2}`
          );

          // Update sensors based on their data status
          const updatePromises = [];

          // Handle Sensor 1 (ID 7)
          if (distance1 !== null && distance1 > 0) {
            updatePromises.push(
              fetch("/api/sensor/7", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: distance1,
                  status: "working",
                }),
              })
            );
            console.log(
              "✅ Sensor 7 updated to 'working' - distance:",
              distance1
            );
          } else {
            updatePromises.push(
              fetch("/api/sensor/7", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: 0,
                  status: "maintenance",
                }),
              })
            );
            console.log("⚠️ Sensor 7 set to 'maintenance' - no valid data");
          }

          // Handle Sensor 2 (ID 6)
          if (distance2 !== null && distance2 > 0) {
            updatePromises.push(
              fetch("/api/sensor/6", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: distance2,
                  status: "working",
                }),
              })
            );
            console.log(
              "✅ Sensor 6 updated to 'working' - distance:",
              distance2
            );
          } else {
            updatePromises.push(
              fetch("/api/sensor/6", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_range: 0,
                  status: "maintenance",
                }),
              })
            );
            console.log("⚠️ Sensor 6 set to 'maintenance' - no valid data");
          }

          // Execute all updates
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log("✅ Updated sensor ranges and status from ESP8266 API");
            // Reload sensors to show updated ranges
            setTimeout(load, 500);
          }
        } else {
          console.log("ESP8266 returned TIMEOUT or empty response");
          // Set all sensors to maintenance when no data is received
          const updatePromises = [
            fetch("/api/sensor/7", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: 0,
                status: "maintenance",
              }),
            }),
            fetch("/api/sensor/6", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sensor_range: 0,
                status: "maintenance",
              }),
            }),
          ];

          await Promise.all(updatePromises);
          console.log("⚠️ All sensors set to 'maintenance' - no data received");
          setTimeout(load, 500);
        }
      } else {
        console.log(`ESP8266 API error: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.log("ESP8266 API fetch error:", e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh effect for sensors
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        load();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh effect for automatic distance detection
  useEffect(() => {
    let interval;

    // Check if auto-detection was running before (from localStorage) - only on mount
    const wasAutoDetecting =
      localStorage.getItem("autoDistanceDetection") === "true";
    const savedInterval = localStorage.getItem("distanceDetectionInterval");
    const savedEspBaseUrl = localStorage.getItem("espBaseUrl");

    if (wasAutoDetecting && savedEspBaseUrl) {
      // Restore the auto-detection state
      setAutoDistanceDetection(true);
      setDistanceDetectionInterval(
        savedInterval ? parseInt(savedInterval) : 3000
      );
      setEspBaseUrl(savedEspBaseUrl);
    }
  }, []); // Only run on mount

  // Separate effect for managing the interval
  useEffect(() => {
    let interval;

    if (autoDistanceDetection && espBaseUrl) {
      // Start the interval
      interval = setInterval(() => {
        fetchDistancesFromESP8266Direct();
      }, distanceDetectionInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoDistanceDetection, distanceDetectionInterval, espBaseUrl]);

  // Separate effect for saving to localStorage
  useEffect(() => {
    if (autoDistanceDetection || distanceDetectionInterval || espBaseUrl) {
      localStorage.setItem(
        "autoDistanceDetection",
        autoDistanceDetection.toString()
      );
      localStorage.setItem(
        "distanceDetectionInterval",
        distanceDetectionInterval.toString()
      );
      localStorage.setItem("espBaseUrl", espBaseUrl);
    }
  }, [autoDistanceDetection, distanceDetectionInterval, espBaseUrl]);

  // Load ESP base URL from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem("espBaseUrl") || "";
      setEspBaseUrl(v);
    } catch {}
  }, []);

  // Save ESP base URL to localStorage
  const saveEspBaseUrl = (url) => {
    try {
      localStorage.setItem("espBaseUrl", url);
      setEspBaseUrl(url);
    } catch {}
  };

  // Save interval setting to localStorage when it changes
  const saveDistanceDetectionInterval = (interval) => {
    try {
      localStorage.setItem("distanceDetectionInterval", interval.toString());
      setDistanceDetectionInterval(interval);
    } catch {}
  };

  // Direct ESP8266 communication (legacy method)
  const hitEsp = async (path) => {
    setError("");
    setMessage("");
    try {
      const base = (espBaseUrl || "").trim().replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(base)) {
        throw new Error("Set a valid ESP Base URL (http://x.x.x.x)");
      }
      const res = await fetch(`${base}${path}`, { method: "GET" });

      if (!res.ok) throw new Error(`ESP error ${res.status}`);

      if (path === "/sensor/on") {
        setMessage("ESP: Sensor ON sent");
      } else if (path === "/sensor/off") {
        setMessage("ESP: Sensor OFF sent");
      } else {
        setMessage("ESP: OK");
      }
      setTimeout(load, 500);
    } catch (e) {
      setError(e.message);
    }
  };

  // New ESP8266 API communication through backend
  const hitESP8266API = async (endpoint) => {
    setEsp8266Loading(true);
    setError("");
    setMessage("");
    try {
      const headers = {};
      // Extract IP from espBaseUrl for manual mode
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      const res = await fetch(`/api/esp8266${endpoint}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `ESP8266 API error ${res.status}`
        );
      }

      setEsp8266Data(data.data);
      setMessage(`ESP8266: ${data.message}`);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      setTimeout(load, 500);
    } catch (e) {
      setError(e.message);
    } finally {
      setEsp8266Loading(false);
    }
  };

  const sensorOn = () => hitEsp("/sensor/on");
  const sensorOff = () => hitEsp("/sensor/off");

  // ESP8266 API methods - only Sensor ON/OFF
  const esp8266SensorOn = async () => {
    setEsp8266Loading(true);
    setError("");
    setMessage("");
    try {
      const headers = {};
      // Extract IP from espBaseUrl for manual mode
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      const res = await fetch(`/api/esp8266/sensor/on`, {
        method: "GET",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `ESP8266 API error ${res.status}`
        );
      }

      setEsp8266Data(data.data);
      setMessage(`ESP8266: ${data.message}`);

      // Wait a moment for sensors to stabilize, then check which ones are working
      setTimeout(async () => {
        try {
          // Get current distance data to see which sensors are actually working
          const distanceRes = await fetch(`/api/esp8266/distance/both`, {
            method: "GET",
            headers,
          });

          if (distanceRes.ok) {
            const distanceData = await distanceRes.json();
            const result = distanceData.result;

            if (result && result !== "TIMEOUT") {
              let distance1 = null;
              let distance2 = null;

              // Parse different formats that Arduino might send
              // Format: "DISTANCES: S1=15 IN, S2=22 IN"
              const distancesMatch = result.match(
                /DISTANCES:\s*S1=(\d+)\s*IN,\s*S2=(\d+)\s*IN/i
              );
              if (distancesMatch) {
                distance1 = parseInt(distancesMatch[1]);
                distance2 = parseInt(distancesMatch[2]);
              }

              // Format: "DISTANCE1: 15 IN"
              const distance1Match = result.match(/DISTANCE1:\s*(\d+)\s*IN/i);
              if (distance1Match) {
                distance1 = parseInt(distance1Match[1]);
              }

              // Format: "DISTANCE2: 22 IN"
              const distance2Match = result.match(/DISTANCE2:\s*(\d+)\s*IN/i);
              if (distance2Match) {
                distance2 = parseInt(distance2Match[1]);
              }

              // Format: Plain numbers "15,22" or "15 22"
              if (!distance1 && !distance2) {
                const numbers = result.match(/(\d+)/g);
                if (numbers && numbers.length >= 2) {
                  distance1 = parseInt(numbers[0]);
                  distance2 = parseInt(numbers[1]);
                }
              }

              console.log(
                `Sensor ON - Parsed distances: Sensor1=${distance1}, Sensor2=${distance2}`
              );

              // Update sensors based on their data status
              const updatePromises = [];

              // Handle Sensor 1 (ID 7)
              if (distance1 !== null && distance1 > 0) {
                updatePromises.push(
                  fetch("/api/sensor/7", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "working",
                      sensor_range: distance1,
                    }),
                  })
                );
                console.log(
                  "✅ Sensor 7 (ID 7) set to 'working' - distance:",
                  distance1
                );
              } else {
                updatePromises.push(
                  fetch("/api/sensor/7", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "maintenance",
                      sensor_range: 0,
                    }),
                  })
                );
                console.log(
                  "⚠️ Sensor 7 (ID 7) set to 'maintenance' - no valid data"
                );
              }

              // Handle Sensor 2 (ID 6)
              if (distance2 !== null && distance2 > 0) {
                updatePromises.push(
                  fetch("/api/sensor/6", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "working",
                      sensor_range: distance2,
                    }),
                  })
                );
                console.log(
                  "✅ Sensor 6 (ID 6) set to 'working' - distance:",
                  distance2
                );
              } else {
                updatePromises.push(
                  fetch("/api/sensor/6", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "maintenance",
                      sensor_range: 0,
                    }),
                  })
                );
                console.log(
                  "⚠️ Sensor 6 (ID 6) set to 'maintenance' - no valid data"
                );
              }

              // Execute all updates
              await Promise.all(updatePromises);
              console.log("✅ Updated all sensors based on their data status");

              // Reload sensors to show updated ranges
              setTimeout(load, 500);
            } else {
              // No data received - set all sensors to maintenance
              console.log(
                "⚠️ No distance data received - setting all sensors to maintenance"
              );
              const updatePromises = [
                fetch("/api/sensor/7", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "maintenance",
                    sensor_range: 0,
                  }),
                }),
                fetch("/api/sensor/6", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "maintenance",
                    sensor_range: 0,
                  }),
                }),
              ];

              await Promise.all(updatePromises);
              console.log(
                "✅ All sensors set to 'maintenance' - no data received"
              );
              setTimeout(load, 500);
            }
          }
        } catch (e) {
          console.log("Error checking sensor status after ON:", e.message);
        }
      }, 2000); // Wait 2 seconds for sensors to stabilize

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setEsp8266Loading(false);
    }
  };

  const esp8266SensorOff = async () => {
    setEsp8266Loading(true);
    setError("");
    setMessage("");
    try {
      const headers = {};
      // Extract IP from espBaseUrl for manual mode
      const targetIp = espBaseUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      if (targetIp) {
        headers["X-Arduino-IP"] = targetIp;
      }

      const res = await fetch(`/api/esp8266/sensor/off`, {
        method: "GET",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `ESP8266 API error ${res.status}`
        );
      }

      setEsp8266Data(data.data);
      setMessage(`ESP8266: ${data.message}`);

      // Update all sensors to "maintenance" status and set sensor_range to 0
      const updatePromises = sensors.map((sensor) =>
        fetch(`/api/sensor/${sensor.sensor_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "maintenance",
            sensor_range: 0,
          }),
        })
      );

      await Promise.all(updatePromises);
      console.log("✅ All sensors set to 'maintenance' status");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      setTimeout(load, 500);
    } catch (e) {
      setError(e.message);
    } finally {
      setEsp8266Loading(false);
    }
  };

  const updateSensor = async (sensorId, updates) => {
    try {
      setError("");
      setMessage("");

      // If setting to maintenance, also set sensor_range to 0
      const payload = { ...updates };
      if (updates.status === "maintenance") {
        payload.sensor_range = 0;
      }

      const res = await fetch(`/api/sensor/${sensorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("Sensor updated successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  // Add delete sensor function
  const deleteSensor = async (sensorId) => {
    if (!window.confirm("Are you sure you want to delete this sensor?")) {
      return;
    }

    try {
      setError("");
      setMessage("");
      const res = await fetch(`/api/sensor/${sensorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Deletion failed");
      setMessage("Sensor deleted successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);

      await load(); // Reload sensors list
    } catch (e) {
      setError(e.message);
    }
  };

  // Function to start global auto-detection
  const startGlobalAutoDetection = () => {
    if (globalAutoDetectionInterval) {
      clearInterval(globalAutoDetectionInterval);
    }

    globalEspBaseUrl = espBaseUrl;
    globalDetectionInterval = distanceDetectionInterval;
    globalAutoDetectionActive = true;

    // Start the global interval
    globalAutoDetectionInterval = setInterval(
      globalAutoDetection,
      globalDetectionInterval
    );

    // Also run it immediately
    globalAutoDetection();

    console.log("🌐 Global auto-detection started");
  };

  // Function to stop global auto-detection
  const stopGlobalAutoDetection = () => {
    if (globalAutoDetectionInterval) {
      clearInterval(globalAutoDetectionInterval);
      globalAutoDetectionInterval = null;
    }
    globalAutoDetectionActive = false;
    console.log("🌐 Global auto-detection stopped");
  };

  // Update the button click handler
  const handleAutoDetectionToggle = () => {
    if (autoDistanceDetection) {
      stopGlobalAutoDetection();
      setAutoDistanceDetection(false);
    } else {
      if (!espBaseUrl) {
        alert("Please set ESP Base URL first");
        return;
      }
      setAutoDistanceDetection(true);
      startGlobalAutoDetection();
    }
  };

  // Check if auto-detection is already running when component mounts
  useEffect(() => {
    if (globalAutoDetectionActive) {
      setAutoDistanceDetection(true);
      setEspBaseUrl(globalEspBaseUrl);
      setDistanceDetectionInterval(globalDetectionInterval);
    }
  }, []);

  // Update sensors based on their data status
  const updateSensorsAndParkingSlots = async (distance1, distance2) => {
    const updatePromises = [];

    // Handle Sensor 1 (ID 7)
    if (distance1 !== null && distance1 > 0) {
      updatePromises.push(
        fetch("/api/sensor/7", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sensor_range: distance1,
            status: "working",
          }),
        })
      );
      console.log("✅ Sensor 7 updated to 'working' - distance:", distance1);
    } else {
      updatePromises.push(
        fetch("/api/sensor/7", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sensor_range: 0,
            status: "maintenance",
          }),
        })
      );
      console.log("⚠️ Sensor 7 set to 'maintenance' - no valid data");
    }

    // Handle Sensor 2 (ID 6)
    if (distance2 !== null && distance2 > 0) {
      updatePromises.push(
        fetch("/api/sensor/6", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sensor_range: distance2,
            status: "working",
          }),
        })
      );
      console.log("✅ Sensor 6 updated to 'working' - distance:", distance2);
    } else {
      updatePromises.push(
        fetch("/api/sensor/6", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sensor_range: 0,
            status: "maintenance",
          }),
        })
      );
      console.log("⚠️ Sensor 6 set to 'maintenance' - no valid data");
    }

    // Execute all sensor updates
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log("✅ Updated sensor ranges and status from ESP8266 API");

      // Now update parking slots based on sensor data
      await updateParkingSlotsFromSensorData(distance1, distance2);

      // Reload sensors to show updated ranges
      setTimeout(load, 500);
    }
  };

  // Helper function to update parking slots based on sensor data
  const updateParkingSlotsFromSensorData = async (distance1, distance2) => {
    try {
      // Update parking slots for sensor 7
      if (distance1 !== null) {
        const sensor7Status = distance1 > 0 ? "working" : "maintenance";
        const sensor7Range = distance1 > 0 ? distance1 : 0;

        // Find parking slots using sensor 7 and update them
        const slots7Response = await fetch("/api/parking-slot/sensor/7");
        if (slots7Response.ok) {
          const slots7Data = await slots7Response.json();
          if (slots7Data.success && slots7Data.data.length > 0) {
            for (const slot of slots7Data.data) {
              await fetch(`/api/parking-slot/${slot.slot_id}/sensor-update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_status: sensor7Status,
                  sensor_range: sensor7Range,
                }),
              });
            }
            console.log(
              `✅ Updated ${slots7Data.data.length} parking slot(s) for sensor 7`
            );
          }
        }
      }

      // Update parking slots for sensor 6
      if (distance2 !== null) {
        const sensor6Status = distance2 > 0 ? "working" : "maintenance";
        const sensor6Range = distance2 > 0 ? distance2 : 0;

        // Find parking slots using sensor 6 and update them
        const slots6Response = await fetch("/api/parking-slot/sensor/6");
        if (slots6Response.ok) {
          const slots6Data = await slots6Response.json();
          if (slots6Data.success && slots6Data.data.length > 0) {
            for (const slot of slots6Data.data) {
              await fetch(`/api/parking-slot/${slot.slot_id}/sensor-update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sensor_status: sensor6Status,
                  sensor_range: sensor6Range,
                }),
              });
            }
            console.log(
              `✅ Updated ${slots6Data.data.length} parking slot(s) for sensor 6`
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "Error updating parking slots from sensor data:",
        error.message
      );
    }
  };

  // Add function to load Arduino devices
  const loadArduinos = async () => {
    try {
      const res = await fetch("/api/arduino");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load Arduino devices"
        );
      setArduinos(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to load Arduino devices:", e.message);
    }
  };

  // Load Arduino devices when component mounts
  useEffect(() => {
    loadArduinos();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Sensors</h1>
          {autoRefresh && (
            <span
              style={{
                fontSize: 12,
                color: "#28a745",
                background: "#e6ffed",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #badbcc",
              }}
            >
              Auto-refresh ON
            </span>
          )}
          {autoDistanceDetection && (
            <span
              style={{
                fontSize: 12,
                color: "#17a2b8",
                background: "#e6f7ff",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #91d5ff",
              }}
            >
              Auto Distance Detection ON
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Auto-refresh controls */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ccc",
                borderRadius: 4,
                background: autoRefresh ? "#28a745" : "#fff",
                color: autoRefresh ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {autoRefresh ? "Stop Auto" : "Auto Refresh"}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 16px",
              border: "1px solid #007bff",
              borderRadius: 4,
              background: "#007bff",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Connected Devices on Hotspot Section - Updated */}
      <div
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "#495057" }}>Arduino Devices</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowArduinoTable(!showArduinoTable)}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #6c757d",
                borderRadius: 4,
                background: showArduinoTable ? "#6c757d" : "#fff",
                color: showArduinoTable ? "#fff" : "#6c757d",
                cursor: "pointer",
              }}
            >
              {showArduinoTable ? "Hide Table" : "Show Table"}
            </button>
            <button
              onClick={loadArduinos}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #17a2b8",
                borderRadius: 4,
                background: "#17a2b8",
                color: "white",
                cursor: "pointer",
              }}
            >
              Refresh Arduino Data
            </button>
          </div>
        </div>

        {showArduinoTable && (
          <div
            style={{
              background: "white",
              border: "1px solid #dee2e6",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    Arduino ID
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    IP Address
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    Location
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    Sensors Count
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                      fontWeight: 600,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {arduinos.map((arduino) => (
                  <tr key={arduino.arduino_id}>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      {arduino.arduino_id}
                    </td>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          background: "#f8f9fa",
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        {arduino.ip_address}
                      </span>
                    </td>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      {arduino.location}
                    </td>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background:
                            arduino.status === "active"
                              ? "#d4edda"
                              : arduino.status === "inactive"
                              ? "#f8d7da"
                              : "#fff3cd",
                          color:
                            arduino.status === "active"
                              ? "#155724"
                              : arduino.status === "inactive"
                              ? "#721c24"
                              : "#856404",
                        }}
                      >
                        {arduino.status}
                      </span>
                    </td>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: "#e3f2fd",
                          color: "#1976d2",
                        }}
                      >
                        {arduino.sensor_count || 0} sensors
                      </span>
                    </td>
                    <td
                      style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}
                    >
                      <button
                        onClick={() => {
                          const url = `http://${arduino.ip_address}`;
                          setEspBaseUrl(url);
                          try {
                            localStorage.setItem("espBaseUrl", url);
                          } catch {}
                        }}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          border: "1px solid #28a745",
                          borderRadius: 4,
                          background: "#28a745",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        Use as ESP URL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {arduinos.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#6c757d",
                }}
              >
                No Arduino devices found
              </div>
            )}
          </div>
        )}

        {!showArduinoTable && (
          <div style={{ textAlign: "center", color: "#6c757d", padding: 20 }}>
            Click "Show Table" to view Arduino devices
          </div>
        )}
      </div>

      {/* ESP8266 Configuration Section */}
      <div
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#495057" }}>
          ESP8266 Configuration
        </h3>

        {/* Manual Mode ESP Base URL Input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>
              ESP Base URL:
            </label>
            <input
              type="text"
              value={espBaseUrl}
              onChange={(e) => saveEspBaseUrl(e.target.value)}
              placeholder="http://192.168.1.100"
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                fontSize: 14,
                minWidth: 200,
              }}
            />
          </div>
        </div>

        {/* Automatic Distance Detection Controls */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleAutoDetectionToggle}
              disabled={!espBaseUrl}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #17a2b8",
                borderRadius: 4,
                background:
                  autoDistanceDetection && espBaseUrl ? "#17a2b8" : "#fff",
                color: autoDistanceDetection && espBaseUrl ? "#fff" : "#17a2b8",
                cursor: !espBaseUrl ? "not-allowed" : "pointer",
                opacity: !espBaseUrl ? 0.6 : 1,
              }}
            >
              {autoDistanceDetection
                ? "Stop Auto Detection"
                : "Start Auto Detection"}
            </button>
            <select
              value={distanceDetectionInterval}
              onChange={(e) => {
                const newInterval = Number(e.target.value);
                setDistanceDetectionInterval(newInterval);
                try {
                  localStorage.setItem(
                    "distanceDetectionInterval",
                    newInterval.toString()
                  );
                } catch {}
              }}
              disabled={!espBaseUrl}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                border: "1px solid #ced4da",
                borderRadius: 4,
                opacity: !espBaseUrl ? 0.6 : 1,
              }}
            >
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
            <span style={{ fontSize: 12, color: "#6c757d" }}>
              Auto-detects distances and updates database
            </span>
          </div>
        </div>

        {/* ESP8266 Control Buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", width: "100%", color: "#495057" }}>
            ESP8266 Sensor Control
          </h4>

          <button
            onClick={esp8266SensorOn}
            disabled={esp8266Loading || !espBaseUrl}
            style={{
              padding: "6px 12px",
              border: "1px solid #28a745",
              borderRadius: 4,
              background: esp8266Loading || !espBaseUrl ? "#6c757d" : "#28a745",
              color: "white",
              cursor: esp8266Loading || !espBaseUrl ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor ON"}
          </button>
          <button
            onClick={esp8266SensorOff}
            disabled={esp8266Loading || !espBaseUrl}
            style={{
              padding: "6px 12px",
              border: "1px solid #dc3545",
              borderRadius: 4,
              background: esp8266Loading || !espBaseUrl ? "#6c757d" : "#dc3545",
              color: "white",
              cursor: esp8266Loading || !espBaseUrl ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {esp8266Loading ? "Loading..." : "Sensor OFF"}
          </button>
        </div>

        {/* ESP8266 Response Display */}
        {esp8266Data && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#e9ecef",
              border: "1px solid #ced4da",
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            <strong>ESP8266 Response:</strong>
            <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(esp8266Data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: 12,
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: 4,
            color: "#721c24",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            padding: 12,
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: 4,
            color: "#155724",
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      {/* Sensors Table */}
      <div
        style={{
          background: "white",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                ID
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Type
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Arduino ID
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Range (inches)
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #dee2e6",
                  fontWeight: 600,
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((sensor) => (
              <tr key={sensor.sensor_id}>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.sensor_id}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.sensor_type}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  {sensor.arduino_id}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background:
                        sensor.sensor_range > 0
                          ? sensor.sensor_range < 10
                            ? "#dc3545"
                            : sensor.sensor_range < 20
                            ? "#ffc107"
                            : "#28a745"
                          : "#6c757d",
                      color: "white",
                    }}
                  >
                    {sensor.sensor_range || 0}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <select
                    value={sensor.status}
                    onChange={(e) =>
                      updateSensor(sensor.sensor_id, { status: e.target.value })
                    }
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #ced4da",
                      borderRadius: 4,
                      fontSize: 12,
                      background: "white",
                    }}
                  >
                    <option value="working">Working</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #dee2e6" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() =>
                        updateSensor(sensor.sensor_id, {
                          status:
                            sensor.status === "working"
                              ? "maintenance"
                              : "working",
                        })
                      }
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #007bff",
                        borderRadius: 4,
                        background: "#007bff",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Toggle Status
                    </button>
                    <button
                      onClick={() => deleteSensor(sensor.sensor_id)}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #dc3545",
                        borderRadius: 4,
                        background: "#dc3545",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
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

        {sensors.length === 0 && !loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            No sensors found
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            Loading sensors...
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSensors;
