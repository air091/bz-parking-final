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
  const [editServiceId, setEditServiceId] = useState(""); // "" | number

  const [showCreate, setShowCreate] = useState(false);
  const [createPlate, setCreatePlate] = useState("");
  const [createServiceId, setCreateServiceId] = useState(""); // "" | number

  const [deletingId, setDeletingId] = useState(null);

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(""); // "" = all

  // Camera preview (simple)
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [camInfo, setCamInfo] = useState(""); // quick diagnostics
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null); // { text, letters, confidence, imageUrl }
  const canvasRef = useRef(null);

  const [fileToOcr, setFileToOcr] = useState(null);

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
      }
    } finally {
      setCameraEnabled(false);
      setCamInfo("");
    }
  };

  const attachStream = async (stream) => {
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;

    // Prefer srcObject, fallback to src=blob for stubborn browsers
    try {
      video.srcObject = stream;
    } catch {
      video.src = URL.createObjectURL(stream);
    }

    await new Promise((resolve) => {
      const done = () => {
        video.removeEventListener("loadedmetadata", done);
        video.removeEventListener("canplay", done);
        resolve();
      };
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", done);
      video.addEventListener("canplay", done);
    });

    try {
      await video.play();
    } catch (e) {
      // Some browsers need another click; at least we tried.
    }

    setTimeout(() => {
      setCamInfo(`${video.videoWidth}x${video.videoHeight}`);
    }, 150);
  };

  // Enhanced camera start function with better settings
  const startCamera = async () => {
    try {
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Enhanced camera constraints for better image quality
      const attempts = [
        deviceId
          ? {
              video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, min: 15 },
              },
              audio: false,
            }
          : null,
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        },
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
      ].filter(Boolean);

      let lastErr;
      for (const c of attempts) {
        try {
          const s = await navigator.mediaDevices.getUserMedia(c);
          await attachStream(s);
          setCameraEnabled(true);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
    } catch (e) {
      setCamInfo("");
      setCameraEnabled(false);
      setError(e?.message || "Unable to access camera");
    }
  };

  // Image preprocessing helpers
  const drawProcessed = (
    video,
    {
      upscale = 2,
      grayscale = true,
      contrast = 1.2,
      threshold = false,
      cropCenter = false,
    } = {}
  ) => {
    const cw = video.videoWidth || 1280;
    const ch = video.videoHeight || 720;

    // Optional center crop (focus the middle band where plates often are)
    const cropH = cropCenter ? Math.floor(ch * 0.5) : ch;
    const cropY = cropCenter ? Math.floor((ch - cropH) / 2) : 0;

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(cw * upscale);
    canvas.height = Math.floor(cropH * upscale);
    const ctx = canvas.getContext("2d");

    // Draw source
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      video,
      0,
      cropY,
      cw,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Get pixels for processing
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;

    // Grayscale + contrast
    if (grayscale || threshold) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        let v = 0.299 * r + 0.587 * g + 0.114 * b; // luminance
        // contrast (simple)
        v = ((v / 255 - 0.5) * contrast + 0.5) * 255;
        v = Math.max(0, Math.min(255, v));
        if (threshold) {
          const t = 140; // tweak if needed
          const bin = v > t ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = bin;
        } else {
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    return canvas;
  };

  const canvasToBlob = (canvas, type = "image/jpeg", quality = 0.92) =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  // Enhanced plate extraction with more patterns
  const extractBestPlate = (raw) => {
    const s = (raw || "").toUpperCase().replace(/[^\w\s-]/g, " ");
    const candidates = [];

    // Enhanced plate patterns for better recognition
    const patterns = [
      /\b([A-Z]{1,3})[\s-]?([0-9]{1,4})\b/g, // LT 23, ABC-1234
      /\b([0-9]{1,4})[\s-]?([A-Z]{1,3})\b/g, // 23 LT
      /\b([A-Z]{2,4})[\s-]?([0-9]{2,4})\b/g, // LT23, LTR 234
      /\b([A-Z]{1,2})[\s-]?([0-9]{1,3})[\s-]?([A-Z]{1,2})\b/g, // A 123 B
      /\b([0-9]{1,3})[\s-]?([A-Z]{1,2})[\s-]?([0-9]{1,3})\b/g, // 123 A 456
      /\b([A-Z]{2,3})([0-9]{2,4})\b/g, // LT23 (no space)
      /\b([0-9]{2,4})([A-Z]{2,3})\b/g, // 23LT (no space)
    ];

    patterns.forEach((re) => {
      let m;
      while ((m = re.exec(s)) !== null) {
        if (m.length === 3) {
          candidates.push(`${m[1]} ${m[2]}`.replace(/\s+/, " ").trim());
        } else if (m.length === 4) {
          candidates.push(`${m[1]} ${m[2]} ${m[3]}`.replace(/\s+/, " ").trim());
        }
      }
    });

    // Fallbacks from tokens/joined if regex fails
    if (candidates.length === 0) {
      const joined = s.replace(/[\s-]+/g, "");
      if (/[A-Z]/.test(joined) && /\d/.test(joined) && joined.length >= 4) {
        candidates.push(joined);
      }
      s.split(/\s+/).forEach((t) => {
        if (/[A-Z]/.test(t) && /\d/.test(t) && t.length >= 4)
          candidates.push(t);
      });
    }

    // Enhanced scoring system
    const score = (p) => {
      const len = p.replace(/\s/g, "").length;
      const hasL = /[A-Z]/.test(p);
      const hasD = /\d/.test(p);
      let sc = 0;

      // Length scoring (license plates are typically 4-8 characters)
      if (len >= 4 && len <= 8) sc += 50;
      else if (len >= 3 && len <= 10) sc += 30;

      // Character type scoring
      if (hasL) sc += 25;
      if (hasD) sc += 25;

      // Format scoring
      if (/\s/.test(p) || /-/.test(p)) sc += 15;

      // Pattern validation
      if (/^[A-Z]{1,3}[\s-]?[0-9]{1,4}$/.test(p.replace(/\s/g, ""))) sc += 20;
      if (/^[0-9]{1,4}[\s-]?[A-Z]{1,3}$/.test(p.replace(/\s/g, ""))) sc += 20;

      return sc;
    };

    candidates.sort((a, b) => score(b) - score(a));
    return candidates[0] || "";
  };

  const deriveConfidence = (tessData, fallbackText) => {
    // Prefer tesseract's per-word confidences if available
    const words = tessData?.words || [];
    const vals = words
      .map((w) => Number(w.confidence))
      .filter((n) => !Number.isNaN(n));
    if (vals.length)
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

    // Next try symbols
    const symbols = tessData?.symbols || [];
    const svals = symbols
      .map((s) => Number(s.confidence))
      .filter((n) => !Number.isNaN(n));
    if (svals.length)
      return Math.round(svals.reduce((a, b) => a + b, 0) / svals.length);

    // Heuristic fallback if nothing available
    const best = extractBestPlate(fallbackText || "");
    if (best && best.length >= 6 && /[A-Z]/.test(best) && /\d/.test(best))
      return 70;
    if (best && best.length >= 5) return 55;
    return 40;
  };

  // Improved capture and read plate function
  const captureAndReadPlate = async () => {
    try {
      if (!videoRef.current) return;
      setError("");
      setOcrLoading(true);

      const v = videoRef.current;
      const vw = v.videoWidth || 1280,
        vh = v.videoHeight || 720;

      // Better cropping strategy - focus on center with more height
      const cropH = Math.floor(vh * 0.6); // Increased from 0.4 to 0.6
      const cropY = Math.floor((vh - cropH) / 2);
      const outW = vw * 3; // Increased upscaling from 2x to 3x
      const outH = cropH * 3;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");

      // Enhanced image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw with better quality
      ctx.drawImage(v, 0, cropY, vw, cropH, 0, 0, outW, outH);

      // Apply additional client-side preprocessing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = imageData.data;

      // Enhance contrast and reduce noise
      for (let i = 0; i < pixelData.length; i += 4) {
        const r = pixelData[i];
        const g = pixelData[i + 1];
        const b = pixelData[i + 2];

        // Convert to grayscale with better luminance calculation
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        // Apply contrast enhancement
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));

        pixelData[i] = pixelData[i + 1] = pixelData[i + 2] = enhanced;
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise(
        (resolve) => canvas.toBlob(resolve, "image/jpeg", 0.98) // Higher quality
      );

      const form = new FormData();
      form.append("image", blob, "frame.jpg");
      form.append("enhanceContrast", "true");
      form.append("sharpen", "true");
      form.append("denoise", "true");
      form.append("grayScale", "true");

      const res = await fetch("/api/ocr/detect-letters-enhanced", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data?.error || "OCR failed");

      const fullText = (data.text || "").trim();
      const letters =
        extractBestPlate(fullText) ||
        fullText.replace(/[^A-Z0-9]/g, "").toUpperCase();

      const imageUrl = URL.createObjectURL(blob);
      setOcrResult({
        text: fullText,
        letters,
        confidence: Math.round(data.confidence || 0),
        imageUrl,
      });
    } catch (e) {
      setError(e.message || "OCR failed");
    } finally {
      setOcrLoading(false);
    }
  };

  const detectFromFile = async () => {
    if (!fileToOcr) return;
    try {
      setError("");
      setOcrLoading(true);

      const form = new FormData();
      form.append("image", fileToOcr, fileToOcr.name || "upload.jpg");
      form.append("enhanceContrast", "true");
      form.append("sharpen", "true");
      form.append("denoise", "true");
      form.append("grayScale", "true");

      const res = await fetch("/api/ocr/detect-letters-enhanced", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data?.error || "OCR failed");

      const fullText = (data.text || "").trim();
      const letters =
        extractBestPlate(fullText) ||
        fullText.replace(/[^A-Z0-9]/g, "").toUpperCase();

      setOcrResult({
        text: fullText,
        letters,
        confidence: Math.round(data.confidence || 0),
        imageUrl: URL.createObjectURL(fileToOcr),
      });
    } catch (e) {
      setError(e.message || "OCR failed");
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        // Some browsers need any getUserMedia call before labels are available.
        try {
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch {}
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter((d) => d.kind === "videoinput");
        setDevices(cams);
        if (!deviceId && cams[0]) setDeviceId(cams[0].deviceId);
      } catch {}
    })();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (cameraEnabled && deviceId) {
      (async () => {
        stopCamera();
        await startCamera();
      })();
    }
  }, [deviceId]);

  // Camera features removed

  const apiBase = "/api/user";
  const serviceApi = "/api/service";

  const getServiceLabel = (id) => {
    if (id === null || id === undefined || id === "") return "-";
    const numId = Number(id);
    const svc = services.find((s) => s.service_id === numId);
    return svc ? `${svc.vehicle_type} (#${numId})` : `Service #${numId}`;
  };

  const loadServices = async () => {
    try {
      const res = await fetch(serviceApi);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to load services"
        );
      setServices(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError((prev) => prev || e.message);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      let url = apiBase;
      if (selectedService) {
        url = `${apiBase}/service/${selectedService}`;
      }
      const res = await fetch(url);
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
      let list = Array.isArray(data?.data) ? data.data : [];
      if (selectedService) {
        const svcId = Number(selectedService);
        list = list.filter((u) => Number(u.service_id) === svcId);
      }
      setUsers(list);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadServices();
    load();
  }, []);

  useEffect(() => {
    // reload when service filter changes
    if (!search.trim()) {
      load();
    } else {
      // re-apply search with the new filter
      searchUsers();
    }
  }, [selectedService]);

  const autoHideMessage = () => {
    setTimeout(() => setMessage(""), 3000);
  };

  // Camera handlers removed

  const createUser = async () => {
    try {
      setError("");
      setMessage("");
      const body = {
        plate_number: createPlate.trim(),
        service_id: createServiceId === "" ? null : Number(createServiceId),
      };
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
      setCreateServiceId("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (u) => {
    setEditingUser(u);
    setEditPlate(u.plate_number || "");
    setEditServiceId(
      u.service_id === null || u.service_id === undefined ? "" : u.service_id
    );
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      setError("");
      setMessage("");
      const res = await fetch(`${apiBase}/${editingUser.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate_number: editPlate.trim(),
          service_id: editServiceId === "" ? null : Number(editServiceId),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Update failed");
      setMessage("User updated successfully");
      autoHideMessage();
      setEditingUser(null);
      setEditPlate("");
      setEditServiceId("");
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

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
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

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
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
                if (!selectedService) {
                  load();
                } else {
                  searchUsers();
                }
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

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#555" }}>Service:</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                padding: "6px 8px",
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="">All</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.vehicle_type} (#{s.service_id})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedService("");
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
            Clear Filters
          </button>

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
    </div>
  );

  // Camera UI removed

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
              Service
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
                {getServiceLabel(u.service_id)}
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
              <td colSpan={5} style={{ padding: 12, color: "#666" }}>
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
              <p style={{ margin: "2px 0", color: "#666", fontSize: 14 }}>
                Service: {getServiceLabel(u.service_id)}
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

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Service:
            </label>
            <select
              value={editServiceId}
              onChange={(e) => setEditServiceId(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="">(None)</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.vehicle_type} (#{s.service_id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setEditPlate("");
                setEditServiceId("");
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

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Service:
            </label>
            <select
              value={createServiceId}
              onChange={(e) => setCreateServiceId(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="">(None)</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.vehicle_type} (#{s.service_id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreatePlate("");
                setCreateServiceId("");
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

  // Add this state for starting activity
  const [startingActivity, setStartingActivity] = useState(false);

  // Add this function to start parking activity
  const startParkingActivity = async (plateNumber) => {
    try {
      setStartingActivity(true);
      setError("");

      const res = await fetch("/api/parking-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate_number: plateNumber,
          activity_type: "entry",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start activity");

      setMessage(`Parking activity started for ${plateNumber}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setStartingActivity(false);
    }
  };

  const renderCamera = () => (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: "#333" }}>Camera</h3>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            background: cameraEnabled ? "#e6ffed" : "#ffe5e5",
            color: cameraEnabled ? "#0a6" : "#a00",
            border: `1px solid ${cameraEnabled ? "#badbcc" : "#f5c2c7"}`,
          }}
        >
          {cameraEnabled ? "On" : "Off"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <select
          value={deviceId}
          onChange={async (e) => {
            const id = e.target.value;
            setDeviceId(id);
            if (cameraEnabled) {
              stopCamera();
              await startCamera();
            }
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            minWidth: 220,
          }}
          disabled={!devices.length}
          title={devices.length ? "Select camera" : "No cameras found"}
        >
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={cameraEnabled ? stopCamera : startCamera}
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "none",
            background: cameraEnabled ? "#dc3545" : "#6c757d",
            color: "white",
            cursor: "pointer",
          }}
        >
          {cameraEnabled ? "Disable" : "Enable"}
        </button>

        <button
          type="button"
          onClick={captureAndReadPlate}
          disabled={!cameraEnabled || ocrLoading}
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "none",
            background: "#17a2b8",
            color: "white",
            cursor: cameraEnabled && !ocrLoading ? "pointer" : "not-allowed",
          }}
          title="Capture the current frame and detect plate letters"
        >
          {ocrLoading ? "Analyzing..." : "Capture & Read Plate"}
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              // quick refresh of available devices
              if (!navigator.mediaDevices?.enumerateDevices) return;
              const list = await navigator.mediaDevices.enumerateDevices();
              const cams = list.filter((d) => d.kind === "videoinput");
              setDevices(cams);
              if (!deviceId && cams[0]) setDeviceId(cams[0].deviceId);
            } catch {}
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
          title="Refresh camera list"
        >
          Refresh
        </button>

        <span style={{ fontSize: 12, color: "#666", marginLeft: "auto" }}>
          {cameraEnabled ? camInfo || "Starting..." : "Camera is off"}
        </span>
      </div>

      {/* Side-by-side layout */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Camera view - left side */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 400,
            borderRadius: 8,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", display: "block", aspectRatio: "16 / 9" }}
          />
          {/* Soft guide overlay (center band) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow:
                "inset 0 -35% 0 rgba(0,0,0,0.35), inset 0 35% 0 rgba(0,0,0,0.35)",
            }}
          />
        </div>

        {/* OCR Results - right side */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {ocrResult ? (
            <div
              style={{
                padding: 12,
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                background: "#f8f9fa",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#333" }}>
                Detection Result
              </h4>

              <div style={{ marginBottom: 8 }}>
                <img
                  src={ocrResult.imageUrl}
                  alt="Captured"
                  style={{
                    width: "100%",
                    maxWidth: 200,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 6,
                    background: "#000",
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Detected Text:
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    background: "#e3f2fd",
                    color: "#1976d2",
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: 1,
                  }}
                >
                  {ocrResult.letters || "No letters detected"}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Confidence: {ocrResult.confidence}%
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "#e0e0e0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${ocrResult.confidence}%`,
                      height: "100%",
                      background:
                        ocrResult.confidence > 70
                          ? "#28a745"
                          : ocrResult.confidence > 50
                          ? "#ffc107"
                          : "#dc3545",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Full Text:
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#555",
                    background: "white",
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ddd",
                    maxHeight: 60,
                    overflow: "auto",
                  }}
                >
                  {ocrResult.text || "No text detected"}
                </div>
              </div>

              {ocrResult.letters && ocrResult.confidence > 50 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setStartingActivity(true);
                        setError("");

                        // Step 1: Create user first
                        const createRes = await fetch("/api/user", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            plate_number: ocrResult.letters,
                            service_id: null, // You might want to make this configurable
                          }),
                        });

                        const createData = await createRes.json();
                        if (!createRes.ok) {
                          if (!createData.error?.includes("already exists")) {
                            throw new Error(
                              createData?.error || "Failed to create user"
                            );
                          }
                        }

                        // Get the user ID from the response
                        const userId =
                          createData.data?.user_id || createData.user_id;
                        if (!userId) {
                          throw new Error(
                            "User created but no user ID returned"
                          );
                        }

                        // Step 2: Start parking activity with the new user ID
                        const activityRes = await fetch(
                          "/api/parking-activity",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              user_id: userId, // Use the new user ID
                              plate_number: ocrResult.letters,
                              activity_type: "entry",
                            }),
                          }
                        );

                        const activityData = await activityRes.json();
                        if (!activityRes.ok) {
                          throw new Error(
                            activityData?.error || "Failed to start activity"
                          );
                        }

                        setMessage(
                          `User created and parking activity started for ${ocrResult.letters}`
                        );
                        setTimeout(() => setMessage(""), 3000);
                        await load();
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setStartingActivity(false);
                      }
                    }}
                    disabled={startingActivity}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "none",
                      background: "#28a745",
                      color: "white",
                      cursor: startingActivity ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {startingActivity
                      ? "Creating User & Starting Activity..."
                      : "Create User & Start Activity"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEnhancedCreatePlate(ocrResult.letters);
                      setShowEnhancedCreate(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "1px solid #007bff",
                      background: "white",
                      color: "#007bff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Create User & Start Activity
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "#666",
                fontSize: 14,
                border: "2px dashed #ddd",
                borderRadius: 8,
                background: "#f8f9fa",
              }}
            >
              Capture an image to see detection results here
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Tip: Aim the plate in the center band, ensure good lighting, then click
        "Capture & Read Plate".
      </div>
    </div>
  );

  const [photoURL, setPhotoURL] = useState("");

  const renderSimpleCamera = () => (
    <div style={{ marginBottom: 12 }}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPhotoURL(URL.createObjectURL(f));
            setFileToOcr(f);
          }
        }}
        style={{ padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
      />
      {photoURL && (
        <img
          src={photoURL}
          alt="Preview"
          style={{
            display: "block",
            marginTop: 8,
            maxWidth: 520,
            borderRadius: 8,
          }}
        />
      )}
      <button
        type="button"
        onClick={detectFromFile}
        disabled={!fileToOcr || ocrLoading}
        style={{
          marginLeft: 8,
          padding: "6px 10px",
          borderRadius: 4,
          border: "none",
          background: "#17a2b8",
          color: "white",
          cursor: fileToOcr && !ocrLoading ? "pointer" : "not-allowed",
        }}
      >
        {ocrLoading ? "Analyzing..." : "Detect Letters from File"}
      </button>
    </div>
  );

  // Add new state for the enhanced create modal
  const [showEnhancedCreate, setShowEnhancedCreate] = useState(false);
  const [enhancedCreatePlate, setEnhancedCreatePlate] = useState("");
  const [enhancedCreateServiceId, setEnhancedCreateServiceId] = useState("");
  const [enhancedCreateStartTime, setEnhancedCreateStartTime] = useState("");

  // Enhanced create user function
  const createUserWithActivity = async () => {
    try {
      setError("");
      setMessage("");

      // Step 1: Create user
      const userRes = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate_number: enhancedCreatePlate.trim(),
          service_id:
            enhancedCreateServiceId === ""
              ? null
              : Number(enhancedCreateServiceId),
        }),
      });

      const userData = await userRes.json();
      if (!userRes.ok) {
        if (!userData.error?.includes("already exists")) {
          throw new Error(userData?.error || "Failed to create user");
        }
      }

      // Get the user ID from the response
      const userId = userData.data?.user_id || userData.user_id;
      if (!userId) {
        throw new Error("User created but no user ID returned");
      }

      // Step 2: Start parking activity ONLY if start time is provided
      if (enhancedCreateStartTime) {
        const activityRes = await fetch("/api/parking-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId, // Use the new user ID
            plate_number: enhancedCreatePlate.trim(),
            activity_type: "entry",
            start_time: enhancedCreateStartTime,
          }),
        });

        const activityData = await activityRes.json();
        if (!activityRes.ok) {
          throw new Error(
            activityData?.error || "Failed to start parking activity"
          );
        }
      }

      setMessage(
        `User created${
          enhancedCreateStartTime ? " and parking activity started" : ""
        } for ${enhancedCreatePlate}`
      );
      autoHideMessage();
      setShowEnhancedCreate(false);
      setEnhancedCreatePlate("");
      setEnhancedCreateServiceId("");
      setEnhancedCreateStartTime("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  // Enhanced create modal
  const renderEnhancedCreateModal = () => {
    if (!showEnhancedCreate) return null;

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
            minWidth: 480,
            maxWidth: 600,
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>
            {enhancedCreateStartTime
              ? "Create User & Start Activity"
              : "Create User"}
          </h3>

          {/* Plate Number Section */}
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
              value={enhancedCreatePlate}
              onChange={(e) =>
                setEnhancedCreatePlate(e.target.value.toUpperCase())
              }
              placeholder="Enter plate number"
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 16,
                letterSpacing: 1,
              }}
            />
          </div>

          {/* Service Selection */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Service: <span style={{ color: "red" }}>*</span>
            </label>
            <select
              value={enhancedCreateServiceId}
              onChange={(e) => setEnhancedCreateServiceId(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border:
                  enhancedCreateServiceId === ""
                    ? "2px solid #dc3545"
                    : "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <option value="">Select a service (required)</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.vehicle_type} (#{s.service_id})
                </option>
              ))}
            </select>
            {enhancedCreateServiceId === "" && (
              <div style={{ fontSize: 12, color: "#dc3545", marginTop: 4 }}>
                Please select a service
              </div>
            )}
          </div>

          {/* Parking Activity Section */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#333" }}>
              Parking Activity (Optional)
            </h4>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 12,
                  color: "#666",
                }}
              >
                Start Time (Optional):
              </label>
              <input
                type="datetime-local"
                value={enhancedCreateStartTime}
                onChange={(e) => setEnhancedCreateStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                Leave empty to skip parking activity
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowEnhancedCreate(false);
                setEnhancedCreatePlate("");
                setEnhancedCreateServiceId("");
                setEnhancedCreateStartTime("");
              }}
              style={{
                padding: "8px 16px",
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
              onClick={createUserWithActivity}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                background: "#28a745",
                color: "white",
                cursor: "pointer",
              }}
              disabled={!enhancedCreatePlate.trim() || !enhancedCreateServiceId}
            >
              {enhancedCreateStartTime
                ? "Create User & Start Activity"
                : "Create User"}
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
      {renderCamera()}
      {renderSimpleCamera()}
      {loading ? (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      ) : activeTab === "table" ? (
        renderTable()
      ) : (
        renderList()
      )}
      {renderEditModal()}
      {renderCreateModal()}
      {renderEnhancedCreateModal()} {/* Add this line */}
      {renderDeleteConfirm()}
    </div>
  );
};

export default AdminUsers;
