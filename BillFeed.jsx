import React, { useState, useEffect } from "react";

function BillFeed() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_URL = window.location.origin;

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch bills from your backend
      // For now, we'll use mock data until you have a public bills endpoint
      const mockBills = [
        {
          id: "1",
          number: "HR 1234",
          title: "Affordable Healthcare Expansion Act of 2025",
          chamber: "House",
          sponsor: "Rep. Sarah Johnson (D-CA)",
          introducedDate: "2025-12-01",
          status: "In Committee",
          votesCount: 3421,
          commentsCount: 156,
          summary: "Expands access to affordable healthcare by increasing subsidies for low-income families and capping prescription drug costs."
        },
        {
          id: "2",
          number: "S 789",
          title: "Clean Energy Investment Act",
          chamber: "Senate",
          sponsor: "Sen. Michael Chen (I-OR)",
          introducedDate: "2025-11-28",
          status: "Floor Vote Pending",
          votesCount: 2891,
          commentsCount: 203,
          summary: "Provides tax incentives for renewable energy projects and establishes a national clean energy grid modernization program."
        },
        {
          id: "3",
          number: "HR 5678",
          title: "Small Business Relief and Recovery Act",
          chamber: "House",
          sponsor: "Rep. David Martinez (R-TX)",
          introducedDate: "2025-11-25",
          status: "Passed House",
          votesCount: 4523,
          commentsCount: 287,
          summary: "Offers tax credits and low-interest loans to small businesses affected by recent economic challenges."
        },
        {
          id: "4",
          number: "S 456",
          title: "Infrastructure Maintenance and Safety Act",
          chamber: "Senate",
          sponsor: "Sen. Emily Thompson (D-NY)",
          introducedDate: "2025-11-20",
          status: "In Committee",
          votesCount: 1834,
          commentsCount: 92,
          summary: "Allocates federal funding for bridge and road repairs, with emphasis on rural infrastructure improvements."
        },
        {
          id: "5",
          number: "HR 2468",
          title: "Veterans Healthcare Modernization Act",
          chamber: "House",
          sponsor: "Rep. James Wilson (R-FL)",
          introducedDate: "2025-11-15",
          status: "Enacted",
          votesCount: 6721,
          commentsCount: 445,
          summary: "Modernizes VA healthcare facilities and expands mental health services for veterans."
        },
        {
          id: "6",
          number: "S 234",
          title: "Digital Privacy Protection Act",
          chamber: "Senate",
          sponsor: "Sen. Lisa Chang (D-WA)",
          introducedDate: "2025-11-10",
          status: "In Committee",
          votesCount: 2156,
          commentsCount: 178,
          summary: "Establishes comprehensive data privacy regulations for tech companies and gives consumers control over their personal data."
        }
      ];

      setBills(mockBills);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "In Committee": "#666",
      "Floor Vote Pending": "#ffaa00",
      "Passed House": "#00aaff",
      "Passed Senate": "#00aaff",
      "Enacted": "#00ff88"
    };
    return colors[status] || "#666";
  };

  const getChamberColor = (chamber) => {
    return chamber === "House" ? "#4a90e2" : "#e24a4a";
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "50vh",
        color: "#666"
      }}>
        Loading bills...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "2rem",
        background: "rgba(255,100,100,0.1)",
        border: "1px solid rgba(255,100,100,0.3)",
        borderRadius: "12px",
        color: "#ffaaaa",
        textAlign: "center"
      }}>
        ⚠️ Error loading bills: {error}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{
          fontWeight: 300,
          fontSize: "2.5rem",
          margin: "0 0 0.5rem 0",
          letterSpacing: "0.05em"
        }}>
          Legislative Feed
        </h1>
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          Read-only preview of current legislation
        </p>
      </div>

      {/* Bills List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {bills.map((bill) => (
          <div
            key={bill.id}
            style={{
              padding: "1.5rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              transition: "all 0.2s ease",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            {/* Header: Bill Number & Chamber */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "0.75rem"
            }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#fff",
                  fontFamily: "monospace"
                }}>
                  {bill.number}
                </span>
                <span style={{
                  fontSize: "0.7rem",
                  padding: "3px 10px",
                  background: `${getChamberColor(bill.chamber)}22`,
                  color: getChamberColor(bill.chamber),
                  borderRadius: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600
                }}>
                  {bill.chamber}
                </span>
              </div>
              <span style={{
                fontSize: "0.7rem",
                padding: "3px 10px",
                background: `${getStatusColor(bill.status)}22`,
                color: getStatusColor(bill.status),
                borderRadius: "12px",
                fontWeight: 500
              }}>
                {bill.status}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: "1.2rem",
              fontWeight: 500,
              margin: "0 0 0.5rem 0",
              color: "#fff",
              lineHeight: 1.4
            }}>
              {bill.title}
            </h3>

            {/* Summary */}
            <p style={{
              color: "#aaa",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              margin: "0 0 1rem 0"
            }}>
              {bill.summary}
            </p>

            {/* Metadata */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255,255,255,0.1)"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ color: "#888", fontSize: "0.8rem" }}>
                  Sponsored by <span style={{ color: "#aaa" }}>{bill.sponsor}</span>
                </span>
                <span style={{ color: "#666", fontSize: "0.75rem" }}>
                  Introduced {new Date(bill.introducedDate).toLocaleDateString()}
                </span>
              </div>

              {/* Engagement Stats */}
              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>👍</span>
                  <span style={{ color: "#aaa" }}>{bill.votesCount.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>💬</span>
                  <span style={{ color: "#aaa" }}>{bill.commentsCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: "3rem",
        padding: "1.5rem",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <p style={{ color: "#666", fontSize: "0.85rem", margin: 0 }}>
          📱 <strong>Coming soon:</strong> Full interactive features in the Populist mobile app
        </p>
        <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Vote, comment, and engage with legislation
        </p>
      </div>
    </div>
  );
}

export default BillFeed;
