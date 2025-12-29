import React, { useState, useEffect } from "react";
import { voteBill, getUserVote, getVoteStats } from "./src/services/firestoreService";
import { auth } from "./src/firebase";

function BillDetail({ billId, onBack, user }) {
  const [bill, setBill] = useState(null);
  const [stats, setStats] = useState({ supportCount: 0, opposeCount: 0, totalVotes: 0, userVote: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBillDetail();
    loadVoteData();
  }, [billId, user]);

  const fetchBillDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills/${billId}`);

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

  const loadVoteData = async () => {
    if (!billId) return;

    try {
      const voteStats = await getVoteStats(billId);
      const userVote = user ? await getUserVote(billId) : null;

      setStats({
        ...voteStats,
        userVote
      });
    } catch (err) {
      console.error("Error loading vote data:", err);
    }
  };

  const handleVote = async (voteType) => {
    if (!user) {
      alert("Please sign in to vote!");
      return;
    }

    const currentVote = stats.userVote;

    // Optimistic update
    setStats(prev => ({
      ...prev,
      userVote: currentVote === voteType ? null : voteType
    }));

    try {
      await voteBill(billId, voteType);

      // Refresh stats after vote
      const newStats = await getVoteStats(billId);
      const newVote = await getUserVote(billId);

      setStats({
        ...newStats,
        userVote: newVote
      });
    } catch (e) {
      console.error("Vote failed", e);

      // Revert optimistic update on error
      setStats(prev => ({
        ...prev,
        userVote: currentVote
      }));

      alert("Failed to submit vote. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <div style={{ color: "#888" }}>Loading bill details...</div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ff6b6b" }}>⚠️</div>
        <div style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
          {error || "Bill not found"}
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "10px 20px",
            background: "#0A84FF",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          ← Back to Bills
        </button>
      </div>
    );
  }

  const totalVotes = stats.totalVotes || (stats.supportCount + stats.opposeCount);
  const supportPercent = totalVotes > 0 ? Math.round((stats.supportCount / totalVotes) * 100) : 0;
  const opposePercent = totalVotes > 0 ? Math.round((stats.opposeCount / totalVotes) * 100) : 0;

  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "24px",
          fontSize: "0.9rem"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        ← Back to Bills
      </button>

      {/* Bill Header */}
      <div style={{
        background: "rgba(28, 28, 30, 1)",
        borderRadius: "16px",
        padding: "32px",
        marginBottom: "24px",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{
            color: bill.type === "HR" ? "#0A84FF" : "#FF453A",
            fontWeight: "bold",
            fontSize: "1.1rem",
            letterSpacing: "0.05em"
          }}>
            {bill.type} {bill.number}
          </span>
          {bill.originChamber && (
            <span style={{
              fontSize: "0.8rem",
              color: "#8E8E93",
              padding: "4px 8px",
              border: "1px solid #3A3A3C",
              borderRadius: "4px"
            }}>
              {bill.originChamber}
            </span>
          )}
        </div>

        <h1 style={{
          margin: "0 0 16px 0",
          fontSize: "1.8rem",
          lineHeight: "1.3",
          fontWeight: "600"
        }}>
          {bill.title}
        </h1>

        {bill.updateDate && (
          <div style={{ color: "#666", fontSize: "0.85rem", marginBottom: "24px" }}>
            Last updated: {new Date(bill.updateDate).toLocaleDateString()}
          </div>
        )}

        {/* Voting Section */}
        <div style={{
          padding: "24px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div style={{ fontSize: "0.9rem", color: "#888", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Community Vote
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <button
              onClick={() => handleVote("support")}
              style={{
                flex: 1,
                padding: "16px",
                background: stats.userVote === "support" ? "#34C759" : "rgba(52, 199, 89, 0.1)",
                border: stats.userVote === "support" ? "2px solid #34C759" : "2px solid rgba(52, 199, 89, 0.3)",
                borderRadius: "12px",
                color: stats.userVote === "support" ? "#fff" : "#34C759",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (stats.userVote !== "support") {
                  e.currentTarget.style.background = "rgba(52, 199, 89, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (stats.userVote !== "support") {
                  e.currentTarget.style.background = "rgba(52, 199, 89, 0.1)";
                }
              }}
            >
              👍 Support ({supportPercent}%)
            </button>

            <button
              onClick={() => handleVote("oppose")}
              style={{
                flex: 1,
                padding: "16px",
                background: stats.userVote === "oppose" ? "#FF453A" : "rgba(255, 69, 58, 0.1)",
                border: stats.userVote === "oppose" ? "2px solid #FF453A" : "2px solid rgba(255, 69, 58, 0.3)",
                borderRadius: "12px",
                color: stats.userVote === "oppose" ? "#fff" : "#FF453A",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (stats.userVote !== "oppose") {
                  e.currentTarget.style.background = "rgba(255, 69, 58, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (stats.userVote !== "oppose") {
                  e.currentTarget.style.background = "rgba(255, 69, 58, 0.1)";
                }
              }}
            >
              👎 Oppose ({opposePercent}%)
            </button>
          </div>

          <div style={{ textAlign: "center", color: "#666", fontSize: "0.85rem" }}>
            {totalVotes.toLocaleString()} total votes
          </div>
        </div>
      </div>

      {/* Latest Action */}
      {bill.latestAction && (
        <div style={{
          background: "rgba(28, 28, 30, 1)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "1.3rem", fontWeight: "600" }}>
            Latest Action
          </h2>
          <p style={{ color: "#ddd", fontSize: "1rem", lineHeight: "1.6", marginBottom: "8px" }}>
            {bill.latestAction.text}
          </p>
          <div style={{ color: "#666", fontSize: "0.85rem" }}>
            {new Date(bill.latestAction.actionDate).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Summary */}
      {bill.summary && (
        <div style={{
          background: "rgba(28, 28, 30, 1)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "1.3rem", fontWeight: "600" }}>
            Summary
          </h2>
          <p style={{ color: "#ddd", fontSize: "1rem", lineHeight: "1.6" }}>
            {bill.summary}
          </p>
        </div>
      )}

      {/* Sponsors */}
      {bill.sponsors && bill.sponsors.length > 0 && (
        <div style={{
          background: "rgba(28, 28, 30, 1)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "1.3rem", fontWeight: "600" }}>
            Sponsors
          </h2>
          {bill.sponsors.map((sponsor, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <span style={{ color: "#ddd", fontSize: "1rem" }}>
                {sponsor.firstName} {sponsor.lastName}
              </span>
              {sponsor.party && (
                <span style={{ color: "#888", fontSize: "0.9rem", marginLeft: "8px" }}>
                  ({sponsor.party} - {sponsor.state})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* External Link */}
      {bill.url && (
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a
            href={bill.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "rgba(10, 132, 255, 0.1)",
              border: "1px solid rgba(10, 132, 255, 0.3)",
              borderRadius: "8px",
              color: "#0A84FF",
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(10, 132, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(10, 132, 255, 0.1)";
            }}
          >
            View Full Bill on Congress.gov →
          </a>
        </div>
      )}
    </div>
  );
}

export default BillDetail;
