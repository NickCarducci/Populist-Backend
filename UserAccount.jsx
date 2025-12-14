import React from "react";

function UserAccount({ user, onSignOut }) {
  const isAdmin = user?.email === "nmcarducci@gmail.com";

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
