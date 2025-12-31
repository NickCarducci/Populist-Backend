import React, { useState, useEffect } from "react";
import { observeCurrentUser } from "./src/services/firestoreService";
import DiditVerificationView from "./src/components/DiditVerificationView";

function UserAccount({ user, onSignOut }) {
  const isAdmin = user?.email === "nmcarducci@gmail.com";
  const [userData, setUserData] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(true);

  // Observe user data from Firestore for verification status
  useEffect(() => {
    if (!user) return;

    const unsubscribe = observeCurrentUser((data) => {
      setUserData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const verificationStatus = userData?.digitVerificationStatus;
  const isVerified = verificationStatus === 'verified';
  const isVerifying = verificationStatus === 'pending' || verificationStatus === 'under_review' || verificationStatus === 'in_progress' || verificationStatus === 'submitted';
  const hasFailed = verificationStatus === 'rejected' || verificationStatus === 'abandoned';

  const handleStartVerification = () => {
    setShowVerification(true);
  };

  const handleVerificationComplete = (success) => {
    setShowVerification(false);
    if (success) {
      // User data will update via real-time listener
    }
  };

  const handleVerificationCancel = () => {
    setShowVerification(false);
  };

  // Show verification modal
  if (showVerification) {
    return (
      <DiditVerificationView
        verificationType="proof_of_address"
        onComplete={handleVerificationComplete}
        onCancel={handleVerificationCancel}
      />
    );
  }

  return (
    <div
      style={{
        animation: "fadein 1s ease-in",
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto"
      }}
    >
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
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</div>
          <h2
            style={{
              fontWeight: 500,
              margin: "0 0 0.5rem 0",
              fontSize: "1.5rem"
            }}
          >
            Your Account
          </h2>
          <p style={{ color: "#888", fontSize: "0.85rem" }}>
            Signed in with Apple
          </p>
        </div>

        {/* Account Info */}
        <div
          style={{
            padding: "1.5rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            marginBottom: "1.5rem"
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#888",
                fontSize: "0.75rem",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              Email
            </label>
            <div
              style={{
                color: "#fff",
                fontSize: "1rem",
                fontFamily: "monospace",
                wordBreak: "break-all"
              }}
            >
              {user.email || "Not provided"}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#888",
                fontSize: "0.75rem",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              User ID
            </label>
            <div
              style={{
                color: "#aaa",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                wordBreak: "break-all"
              }}
            >
              {user.uid}
            </div>
          </div>

          {isAdmin && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "rgba(100,255,150,0.1)",
                border: "1px solid rgba(100,255,150,0.2)",
                borderRadius: "8px"
              }}
            >
              <div
                style={{
                  color: "#aaffcc",
                  fontSize: "0.85rem",
                  fontWeight: 500
                }}
              >
                🔐 Admin Access Enabled
              </div>
            </div>
          )}

          {/* Location (if verified) */}
          {isVerified && (userData?.state || userData?.locality) && (
            <div style={{ marginTop: "1rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#888",
                  fontSize: "0.75rem",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                Verified Location
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  background: "rgba(100,150,255,0.1)",
                  border: "1px solid rgba(100,150,255,0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#aaccff", fontSize: "0.9rem", fontWeight: 500 }}>
                    {userData.locality && userData.state
                      ? `${userData.locality}, ${userData.state}`
                      : userData.state || userData.locality}
                  </div>
                  <div style={{ color: "#777", fontSize: "0.7rem", marginTop: "2px" }}>
                    Bills filtered to your area
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div style={{ marginTop: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#888",
                fontSize: "0.75rem",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              Identity Verification
            </label>
            {loading ? (
              <div style={{ color: "#888", fontSize: "0.85rem" }}>
                Loading status...
              </div>
            ) : isVerified ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "rgba(100,255,150,0.1)",
                  border: "1px solid rgba(100,255,150,0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#aaffcc", fontSize: "0.85rem", fontWeight: 500 }}>
                    Verified
                  </div>
                  {userData?.verifiedAt && (
                    <div style={{ color: "#777", fontSize: "0.7rem", marginTop: "2px" }}>
                      {new Date(userData.verifiedAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ) : isVerifying ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "rgba(255,200,100,0.1)",
                  border: "1px solid rgba(255,200,100,0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>⏳</span>
                <div style={{ color: "#ffcc88", fontSize: "0.85rem", fontWeight: 500 }}>
                  Verification in progress...
                </div>
              </div>
            ) : hasFailed ? (
              <div>
                <div
                  style={{
                    padding: "0.75rem",
                    background: "rgba(255,100,100,0.1)",
                    border: "1px solid rgba(255,100,100,0.2)",
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <div style={{ color: "#ffaaaa", fontSize: "0.85rem", fontWeight: 500 }}>
                    Verification failed
                  </div>
                </div>
                <button
                  onClick={handleStartVerification}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#0A84FF",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartVerification}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "#0A84FF",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Start Verification
              </button>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              fontWeight: 500,
              color: "#aaa",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.8rem"
            }}
          >
            Account Features
          </h3>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {/* Cross-Platform Sync */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "start", gap: "1rem" }}
              >
                <div style={{ fontSize: "1.5rem" }}>📱</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 500,
                      marginBottom: "0.25rem"
                    }}
                  >
                    Cross-Platform Account
                  </div>
                  <div style={{ color: "#888", fontSize: "0.85rem" }}>
                    Your account works on iOS, Android, and web
                  </div>
                </div>
              </div>
            </div>

            {/* Vote History */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "start", gap: "1rem" }}
              >
                <div style={{ fontSize: "1.5rem" }}>👍</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 500,
                      marginBottom: "0.25rem"
                    }}
                  >
                    Vote History
                  </div>
                  <div style={{ color: "#888", fontSize: "0.85rem" }}>
                    Your votes and comments sync across devices
                  </div>
                </div>
              </div>
            </div>

            {/* Personalized Feed */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "start", gap: "1rem" }}
              >
                <div style={{ fontSize: "1.5rem" }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 500,
                      marginBottom: "0.25rem"
                    }}
                  >
                    Personalized Feed
                  </div>
                  <div style={{ color: "#888", fontSize: "0.85rem" }}>
                    See bills you care about, track your representatives
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "start", gap: "1rem" }}
              >
                <div style={{ fontSize: "1.5rem" }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 500,
                      marginBottom: "0.25rem"
                    }}
                  >
                    Privacy First
                  </div>
                  <div style={{ color: "#888", fontSize: "0.85rem" }}>
                    Your votes are private, we never share your data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(100,150,255,0.05)",
            border: "1px solid rgba(100,150,255,0.1)",
            borderRadius: "8px",
            marginBottom: "1.5rem"
          }}
        >
          <div
            style={{
              color: "#aaccff",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
              fontWeight: 500
            }}
          >
            ✨ Coming Soon
          </div>
          <div style={{ color: "#888", fontSize: "0.8rem", lineHeight: 1.5 }}>
            • Download your voting history
            <br />
            • Export comments and engagement data
            <br />
            • Privacy settings and data controls
            <br />• Custom bill notifications
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 500,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,100,100,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,100,100,0.3)";
            e.currentTarget.style.color = "#ffaaaa";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.color = "#fff";
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default UserAccount;
