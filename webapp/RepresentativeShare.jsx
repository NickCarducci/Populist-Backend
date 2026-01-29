import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Shareable representative profile page that handles deep linking for iOS users
 * URL format: /representative/:bioguideId (e.g., /representative/M001233)
 */
function RepresentativeShare() {
  const { bioguideId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Fetch representative details
    fetchRepresentativeProfile();
  }, [bioguideId]);

  const fetchRepresentativeProfile = async () => {
    try {
      setLoading(true);

      // Fetch profile and votes in parallel
      const [profileResponse, votesResponse] = await Promise.all([
        fetch(`/api/representatives/${bioguideId}`),
        fetch(`/api/representatives/${bioguideId}/votes?limit=5`)
      ]);

      if (!profileResponse.ok) {
        throw new Error("Failed to fetch representative profile");
      }

      const profileData = await profileResponse.json();
      setProfile(profileData.member);

      // Votes might not be available for all members
      if (votesResponse.ok) {
        const votesData = await votesResponse.json();
        setVotes(votesData.votes || []);
      }
    } catch (err) {
      console.error("Error fetching representative:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInApp = () => {
    // Deep link format: populist://representative/{bioguideId}
    const deepLink = `populist://representative/${bioguideId}`;

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
    // Navigate to the main app with representative profile
    navigate(`/?representativeId=${bioguideId}`);
  };

  const getPartyColor = (party) => {
    if (!party) return "#888";
    const partyLower = party.toLowerCase();
    if (partyLower.includes("democrat")) return "#0A84FF";
    if (partyLower.includes("republican")) return "#FF453A";
    return "#9F86FF";
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}>⏳</div>
          <div style={styles.loadingText}>Loading representative profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorText}>
            {error || "Representative not found"}
          </div>
          <div style={styles.errorDescription}>
            This representative may not be available, or the link may be invalid.
          </div>

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

  // Extract relevant profile data
  const currentTerm = profile.terms?.item?.[0] || {};
  const name = profile.directOrderName || profile.name || "Unknown";
  const party = currentTerm.party || "Unknown";
  const state = currentTerm.state || "";
  const district = currentTerm.district;
  const chamber = currentTerm.chamber || "";
  const office = profile.addressInformation?.officeAddress || null;
  const phone = profile.addressInformation?.phoneNumber || null;
  const imageUrl = profile.depiction?.imageUrl || null;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Representative Profile Card */}
        <div style={styles.profileCard}>
          {/* Header with photo and basic info */}
          <div style={styles.profileHeader}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                style={styles.profileImage}
              />
            ) : (
              <div style={styles.placeholderImage}>
                <span style={styles.initials}>
                  {name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              </div>
            )}

            <div style={styles.profileInfo}>
              <h1 style={styles.name}>{name}</h1>

              <div style={styles.badges}>
                <span style={{
                  ...styles.partyBadge,
                  color: getPartyColor(party)
                }}>
                  {party}
                </span>
                <span style={styles.dot}>•</span>
                <span style={styles.location}>
                  {state}{district ? ` District ${district}` : ''}
                </span>
              </div>

              <span style={styles.chamberBadge}>{chamber}</span>
            </div>
          </div>

          {/* Contact Information */}
          {(office || phone) && (
            <div style={styles.contactSection}>
              <div style={styles.sectionTitle}>Contact Information</div>

              {office && (
                <div style={styles.contactItem}>
                  <span style={styles.contactIcon}>🏛️</span>
                  <span style={styles.contactText}>{office}</span>
                </div>
              )}

              {phone && (
                <div style={styles.contactItem}>
                  <span style={styles.contactIcon}>📞</span>
                  <a href={`tel:${phone.replace(/\D/g, '')}`} style={styles.phoneLink}>
                    {phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Recent Votes Preview */}
          {votes.length > 0 && (
            <div style={styles.votesSection}>
              <div style={styles.sectionTitle}>Recent Votes</div>
              <div style={styles.votesPreview}>
                {votes.slice(0, 3).map((vote, index) => (
                  <div key={index} style={styles.voteItem}>
                    <span style={styles.votePosition}>
                      {vote.memberVote || vote.vote || 'N/A'}
                    </span>
                    <span style={styles.voteQuestion}>
                      {vote.question || 'Unknown vote'}
                    </span>
                  </div>
                ))}
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
              View full voting history, contact your representative, and track their legislation
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
              View Full Profile
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
  profileCard: {
    background: "rgba(28, 28, 30, 1)",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "24px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  profileHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px"
  },
  profileImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,255,255,0.1)"
  },
  placeholderImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  initials: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#fff"
  },
  profileInfo: {
    flex: 1
  },
  name: {
    margin: "0 0 12px 0",
    fontSize: "1.75rem",
    lineHeight: "1.3",
    fontWeight: "700"
  },
  badges: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  partyBadge: {
    fontWeight: "600",
    fontSize: "0.95rem"
  },
  dot: {
    color: "#666"
  },
  location: {
    color: "#888",
    fontSize: "0.95rem"
  },
  chamberBadge: {
    display: "inline-block",
    fontSize: "0.75rem",
    color: "#888",
    padding: "6px 12px",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "6px"
  },
  contactSection: {
    padding: "20px 0",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  sectionTitle: {
    fontSize: "0.85rem",
    color: "#888",
    marginBottom: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600"
  },
  contactItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px"
  },
  contactIcon: {
    fontSize: "1.2rem"
  },
  contactText: {
    color: "#ddd",
    fontSize: "0.95rem"
  },
  phoneLink: {
    color: "#0A84FF",
    textDecoration: "none",
    fontSize: "0.95rem"
  },
  votesSection: {
    padding: "20px 0",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  votesPreview: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  voteItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "8px"
  },
  votePosition: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#0A84FF",
    padding: "4px 8px",
    background: "rgba(10, 132, 255, 0.15)",
    borderRadius: "4px"
  },
  voteQuestion: {
    fontSize: "0.85rem",
    color: "#ddd",
    lineHeight: "1.4",
    flex: 1
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
  }
};

export default RepresentativeShare;
