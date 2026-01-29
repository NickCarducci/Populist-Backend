import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Shareable bill page that handles deep linking for iOS users
 * URL format: /bill/:billId (e.g., /bill/hr1234-119)
 */
function BillShare() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Fetch bill details
    fetchBillDetail();
  }, [billId]);

  const fetchBillDetail = async () => {
    try {
      setLoading(true);
      // billId format is "hr1234-119" (type+number+congress)
      // Backend expects "119-hr-1234" (congress-type-number)
      const [typeNumber, congress] = billId.split("-");
      const type = typeNumber.match(/[a-z]+/i)[0];
      const number = typeNumber.match(/\d+/)[0];
      const backendBillId = `${congress}-${type}-${number}`;

      const response = await fetch(`/api/bills/${backendBillId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bill details");
      }

      const data = await response.json();
      setBill(data.bill);
    } catch (err) {
      console.error("Error fetching bill:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInApp = () => {
    // Deep link format: populist://bill/{billId}
    const deepLink = `populist://bill/${billId}`;

    // Try to open the deep link
    window.location.href = deepLink;
    setHasAttemptedDeepLink(true);

    // Fallback to App Store after a delay if app isn't installed
    setTimeout(() => {
      // Check if the page is still visible (if app opened, page would be hidden)
      if (document.visibilityState === 'visible') {
        // App not installed, show download prompt or stay on page
        // TODO: Add App Store link when app is published
        console.log('App not installed - staying on web page');
      }
    }, 2500);
  };

  const handleContinueOnWeb = () => {
    // Navigate to the main app with bill details
    navigate(`/?billId=${billId}`);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}>⏳</div>
          <div style={styles.loadingText}>Loading bill details...</div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorText}>
            {error || "Bill not found"}
          </div>
          <div style={styles.errorDescription}>
            This bill may not be available yet, or the link may be invalid.
          </div>

          {/* Show download app option even on error */}
          {isIOS ? (
            <button
              onClick={() => window.location.href = 'https://youinpolitics.com'}
              style={styles.backButton}
            >
              Download Populist App
            </button>
          ) : (
            <button onClick={() => navigate('/')} style={styles.backButton}>
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Bill Preview Card */}
        <div style={styles.billCard}>
          <div style={styles.billHeader}>
            <span style={{
              ...styles.billNumber,
              color: bill.type === "HR" ? "#0A84FF" : "#FF453A"
            }}>
              {bill.type} {bill.number}
            </span>
            {bill.originChamber && (
              <span style={styles.chamberBadge}>
                {bill.originChamber}
              </span>
            )}
          </div>

          <h1 style={styles.billTitle}>
            {bill.title}
          </h1>

          {bill.latestAction && (
            <div style={styles.latestAction}>
              <div style={styles.actionLabel}>Latest Action</div>
              <div style={styles.actionText}>{bill.latestAction.text}</div>
              <div style={styles.actionDate}>
                {new Date(bill.latestAction.actionDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* iOS Deep Link Section */}
        {isIOS && (
          <div style={styles.iosSection}>
            <div style={styles.appIcon}>📱</div>
            <h2 style={styles.iosTitle}>Open in Populist App</h2>
            <p style={styles.iosDescription}>
              Get the full experience with voting, discussions, and personalized bill tracking
            </p>

            <button onClick={handleOpenInApp} style={styles.primaryButton}>
              Open in App
            </button>

            <button onClick={handleContinueOnWeb} style={styles.secondaryButton}>
              Continue on Web
            </button>
          </div>
        )}

        {/* Web Section */}
        {!isIOS && (
          <div style={styles.webSection}>
            <button onClick={handleContinueOnWeb} style={styles.primaryButton}>
              View Full Bill Details
            </button>
          </div>
        )}

        {/* Download App Prompt for non-iOS */}
        {!isIOS && (
          <div style={styles.downloadPrompt}>
            <p style={styles.downloadText}>
              Download Populist on iOS for the best experience
            </p>
            <p style={{...styles.downloadText, fontSize: "0.85rem", marginTop: "8px"}}>
              App Store link coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #000000, #1a1a1a)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  content: {
    maxWidth: "600px",
    width: "100%"
  },
  loadingContainer: {
    textAlign: "center"
  },
  spinner: {
    fontSize: "3rem",
    marginBottom: "1rem",
    animation: "pulse 1.5s ease-in-out infinite"
  },
  loadingText: {
    color: "#888",
    fontSize: "1rem"
  },
  errorContainer: {
    textAlign: "center"
  },
  errorIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
    color: "#ff6b6b"
  },
  errorText: {
    color: "#ff6b6b",
    marginBottom: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600"
  },
  errorDescription: {
    color: "#888",
    marginBottom: "1.5rem",
    fontSize: "0.9rem",
    lineHeight: "1.4"
  },
  backButton: {
    padding: "12px 24px",
    background: "#0A84FF",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600"
  },
  billCard: {
    background: "rgba(28, 28, 30, 1)",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "24px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  billHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  billNumber: {
    fontWeight: "bold",
    fontSize: "1.1rem",
    letterSpacing: "0.05em"
  },
  chamberBadge: {
    fontSize: "0.8rem",
    color: "#8E8E93",
    padding: "4px 12px",
    border: "1px solid #3A3A3C",
    borderRadius: "6px"
  },
  billTitle: {
    margin: "0 0 24px 0",
    fontSize: "1.5rem",
    lineHeight: "1.4",
    fontWeight: "600"
  },
  latestAction: {
    padding: "16px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  actionLabel: {
    fontSize: "0.75rem",
    color: "#888",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  actionText: {
    color: "#ddd",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    marginBottom: "8px"
  },
  actionDate: {
    color: "#666",
    fontSize: "0.85rem"
  },
  iosSection: {
    textAlign: "center",
    padding: "32px 24px"
  },
  appIcon: {
    fontSize: "4rem",
    marginBottom: "16px"
  },
  iosTitle: {
    margin: "0 0 12px 0",
    fontSize: "1.5rem",
    fontWeight: "600"
  },
  iosDescription: {
    color: "#888",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    marginBottom: "32px"
  },
  primaryButton: {
    width: "100%",
    padding: "16px",
    background: "#0A84FF",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1.05rem",
    fontWeight: "600",
    marginBottom: "12px",
    transition: "opacity 0.2s"
  },
  secondaryButton: {
    width: "100%",
    padding: "16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    transition: "background 0.2s"
  },
  webSection: {
    textAlign: "center",
    padding: "24px"
  },
  downloadPrompt: {
    textAlign: "center",
    marginTop: "32px",
    padding: "24px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  downloadText: {
    color: "#888",
    fontSize: "0.9rem",
    marginBottom: "12px"
  },
  appStoreLink: {
    color: "#0A84FF",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: "500"
  }
};

export default BillShare;
