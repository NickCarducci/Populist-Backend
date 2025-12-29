import React, { useState, useEffect } from "react";
import { auth } from "./src/firebase";

function AdminDashboard({ user, onSignOut }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "active" | "revoked"
  const [revokeReason, setRevokeReason] = useState("");
  const [activeDevice, setActiveDevice] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Backend URL - adjust if needed
  const BACKEND_URL = window.location.origin;

  // Check if user is authorized admin
  useEffect(() => {
    const authorized = user?.email === "nmcarducci@gmail.com";
    setIsAuthorized(authorized);
    if (!authorized) {
      setError("Unauthorized - admin access required (nmcarducci@gmail.com)");
    }
  }, [user]);

  // Get Firebase ID token
  const getIdToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Not authenticated");
      }
      return await currentUser.getIdToken();
    } catch (err) {
      throw new Error(`Authentication error: ${err.message}`);
    }
  };

  const fetchDevices = async () => {
    if (!isAuthorized) {
      setError("Unauthorized - admin access required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await getIdToken();
      const params = new URLSearchParams({ idToken });
      if (filter === "active") params.append("revoked", "false");
      if (filter === "revoked") params.append("revoked", "true");

      const response = await fetch(`${BACKEND_URL}/admin/devices?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch devices");
      }

      setDevices(data.devices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm(`Revoke device ${deviceId.substring(0, 12)}...?`)) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`${BACKEND_URL}/admin/revoke-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          idToken,
          reason: revokeReason || "Revoked from admin dashboard"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke device");
      }

      // Refresh device list
      await fetchDevices();
      setRevokeReason("");
      setActiveDevice(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Never";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDeviceId = (id) => {
    if (!id) return "Unknown";
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  // Auto-fetch on mount if authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchDevices();
    }
  }, [isAuthorized, filter]);

  // Show unauthorized message if not admin
  if (!isAuthorized) {
    return (
      <div style={{ animation: "fadein 1s ease-in", width: "100%", maxWidth: "500px" }}>
        <div
          style={{
            padding: "2rem",
            border: "1px solid rgba(255,100,100,0.2)",
            borderRadius: "16px",
            background: "rgba(255,100,100,0.05)",
            backdropFilter: "blur(10px)"
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🚫</div>
          <h3 style={{ fontWeight: 500, margin: "0 0 0.5rem 0", color: "#ffaaaa" }}>
            Unauthorized Access
          </h3>
          <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Signed in as: <code style={{ color: "#ffaaaa" }}>{user.email || user.uid}</code>
          </p>
          <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Only <code style={{ color: "#aaffcc" }}>nmcarducci@gmail.com</code> has admin access to manage devices.
          </p>

          <button
            onClick={onSignOut}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadein 1s ease-in", width: "100%", maxWidth: "1200px", padding: "0 2rem" }}>
      <div
        style={{
          padding: "2rem",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(10px)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontWeight: 500, margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>
              App Attest Devices
            </h2>
            <p style={{ color: "#888", fontSize: "0.85rem", margin: 0 }}>
              {user.email || user.uid}
            </p>
          </div>
          <button
            onClick={onSignOut}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#888",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {["all", "active", "revoked"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "rgba(255,255,255,0.1)" : "transparent",
                border: `1px solid ${filter === f ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: filter === f ? "#fff" : "#888",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.8rem",
                textTransform: "capitalize"
              }}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchDevices}
            disabled={loading}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              fontSize: "0.8rem"
            }}
          >
            {loading ? "Loading..." : "🔄 Refresh"}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(255,100,100,0.1)",
              border: "1px solid rgba(255,100,100,0.3)",
              borderRadius: "8px",
              color: "#ffaaaa",
              fontSize: "0.85rem",
              marginBottom: "1rem"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Device List */}
        <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
          {devices.length === 0 && !loading ? (
            <div style={{ textAlign: "center", color: "#666", padding: "3rem 0" }}>
              No devices found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  style={{
                    padding: "1rem",
                    background: device.revoked
                      ? "rgba(255,100,100,0.05)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      device.revoked ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.1)"
                    }`,
                    borderRadius: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <code
                          style={{
                            color: device.revoked ? "#ffaaaa" : "#fff",
                            fontSize: "0.9rem",
                            fontWeight: 500
                          }}
                        >
                          {formatDeviceId(device.deviceId)}
                        </code>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            background: device.platform === "ios"
                              ? "rgba(100,150,255,0.2)"
                              : "rgba(100,255,150,0.2)",
                            color: device.platform === "ios" ? "#aaccff" : "#aaffcc",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}
                        >
                          {device.platform || "unknown"}
                        </span>
                        {device.revoked && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              background: "rgba(255,100,100,0.2)",
                              color: "#ffaaaa",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em"
                            }}
                          >
                            Revoked
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.6 }}>
                        <div>Issued: {formatDate(device.issuedAt)}</div>
                        <div>Last Seen: {formatDate(device.lastSeen)}</div>
                        <div>Requests: {device.requestCount || 0}</div>
                        {device.ipAddress && <div>IP: {device.ipAddress}</div>}
                        {device.revokedReason && (
                          <div style={{ color: "#ffaaaa" }}>Reason: {device.revokedReason}</div>
                        )}
                      </div>
                    </div>
                    {!device.revoked && (
                      <button
                        onClick={() => {
                          if (activeDevice === device.deviceId) {
                            setActiveDevice(null);
                            setRevokeReason("");
                          } else {
                            setActiveDevice(device.deviceId);
                          }
                        }}
                        style={{
                          background: "rgba(255,100,100,0.1)",
                          border: "1px solid rgba(255,100,100,0.3)",
                          color: "#ffaaaa",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 500
                        }}
                      >
                        {activeDevice === device.deviceId ? "Cancel" : "Revoke"}
                      </button>
                    )}
                  </div>

                  {/* Revoke Form */}
                  {activeDevice === device.deviceId && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid rgba(255,255,255,0.1)"
                      }}
                    >
                      <input
                        type="text"
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Reason for revocation (optional)"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.8rem",
                          marginBottom: "0.5rem"
                        }}
                      />
                      <button
                        onClick={() => revokeDevice(device.deviceId)}
                        disabled={loading}
                        style={{
                          width: "100%",
                          background: "rgba(255,100,100,0.2)",
                          border: "1px solid rgba(255,100,100,0.4)",
                          color: "#ffaaaa",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          cursor: loading ? "wait" : "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 500
                        }}
                      >
                        {loading ? "Revoking..." : "Confirm Revocation"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        {devices.length > 0 && (
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-around",
              fontSize: "0.8rem",
              color: "#888"
            }}
          >
            <div>
              <div style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 500 }}>
                {devices.length}
              </div>
              <div>Total Devices</div>
            </div>
            <div>
              <div style={{ color: "#aaffcc", fontSize: "1.5rem", fontWeight: 500 }}>
                {devices.filter((d) => !d.revoked).length}
              </div>
              <div>Active</div>
            </div>
            <div>
              <div style={{ color: "#ffaaaa", fontSize: "1.5rem", fontWeight: 500 }}>
                {devices.filter((d) => d.revoked).length}
              </div>
              <div>Revoked</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
