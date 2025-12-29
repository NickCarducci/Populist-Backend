import React, { useState, useEffect } from "react";
import { voteBill, getUserVote, getVoteStats } from "./src/services/firestoreService";
import { auth, db } from "./src/firebase";
import { onSnapshot, collection, query, where } from "firebase/firestore";

// Mock data matching BillStore.swift for initial state
const MOCK_BILLS = [
  {
    number: "1234",
    type: "HR",
    originChamber: "House",
    title: "Affordable Healthcare Expansion Act of 2025",
    latestAction: {
      text: "Referred to the Committee on Energy and Commerce",
      actionDate: new Date().toISOString()
    },
    updateDate: new Date().toISOString(),
    topic: "Healthcare",
    topicColor: "#007AFF", // Blue
    supportPercentage: 67,
    votesCount: 3421,
    commentsCount: 156
  },
  {
    number: "567",
    type: "S",
    originChamber: "Senate",
    title: "Climate Action and Green Jobs Initiative",
    latestAction: {
      text: "Passed Senate, referred to House",
      actionDate: new Date(Date.now() - 86400000).toISOString()
    },
    updateDate: new Date(Date.now() - 86400000).toISOString(),
    topic: "Environment",
    topicColor: "#34C759", // Green
    supportPercentage: 52,
    votesCount: 2198,
    commentsCount: 89
  },
  {
    number: "891",
    type: "HR",
    originChamber: "House",
    title: "Digital Privacy Protection Act",
    latestAction: {
      text: "Committee hearing scheduled",
      actionDate: new Date(Date.now() - 172800000).toISOString()
    },
    updateDate: new Date(Date.now() - 172800000).toISOString(),
    topic: "Technology",
    topicColor: "#5AC8FA", // Cyan
    supportPercentage: 78,
    votesCount: 4567,
    commentsCount: 234
  }
];

function BillFeed({ user, onViewBill }) {
  // Initialize with mock bills so the user sees content immediately
  const [bills, setBills] = useState(MOCK_BILLS);
  const [stats, setStats] = useState({}); // Map of billId -> { supportCount, opposeCount, totalVotes, userVote }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBills();
  }, [user, page]); // Re-fetch if user logs in/out or page changes

  // Real-time listener for stats and user votes
  useEffect(() => {
    if (bills.length === 0) return;

    const billIds = bills.map(getBillId);

    // 1. Listen to aggregate stats (bill_votes collection - matches iOS)
    const statsQuery = query(
      collection(db, "bill_votes"),
      where("__name__", "in", billIds)
    );

    const unsubStats = onSnapshot(statsQuery, (snapshot) => {
      setStats((prev) => {
        const next = { ...prev };
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          next[doc.id] = {
            ...next[doc.id],
            supportCount: data.supportCount || 0,
            opposeCount: data.opposeCount || 0,
            totalVotes: data.totalVotes || 0
          };
        });
        return next;
      });
    });

    // 2. Fetch user's votes for all bills (private subcollection - matches iOS)
    const loadUserVotes = async () => {
      if (!user) return;

      for (const billId of billIds) {
        try {
          const vote = await getUserVote(billId);
          setStats((prev) => ({
            ...prev,
            [billId]: { ...prev[billId], userVote: vote }
          }));
        } catch (err) {
          console.error(`Error loading vote for ${billId}:`, err);
        }
      }
    };

    loadUserVotes();

    return () => {
      unsubStats();
    };
  }, [bills, user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      // Call our backend proxy instead of Congress.gov directly
      // This protects the API key from being exposed in the browser
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`/api/bills?limit=${itemsPerPage}&offset=${offset}`);

      if (!response.ok) {
        throw new Error("Failed to fetch legislation");
      }

      const data = await response.json();

      let currentBills = bills;
      if (data.bills && data.bills.length > 0) {
        currentBills = data.bills;
        setBills(currentBills);
        setHasMore(data.bills.length === itemsPerPage);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Feed error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBillId = (bill) => {
    // Generate stable ID: type + number + congress (e.g., "hr1234-119")
    // Default to 119 if congress is missing (common in mock data)
    const congress = bill.congress || 119;
    return `${bill.type.toLowerCase()}${bill.number}-${congress}`;
  };

  const handleVote = async (bill, voteType) => {
    if (!user) {
      alert("Please sign in to vote!");
      return;
    }

    const billId = getBillId(bill);
    const currentVote = stats[billId]?.userVote;

    // Optimistic update
    setStats((prev) => ({
      ...prev,
      [billId]: {
        ...prev[billId],
        userVote: currentVote === voteType ? null : voteType
      }
    }));

    try {
      // Use firestoreService for voting (matches iOS VoteService)
      await voteBill(billId, voteType);

      // Refresh stats after vote
      const newStats = await getVoteStats(billId);
      const newVote = await getUserVote(billId);

      setStats((prev) => ({
        ...prev,
        [billId]: {
          ...newStats,
          userVote: newVote
        }
      }));
    } catch (e) {
      console.error("Vote failed", e);

      // Revert optimistic update on error
      setStats((prev) => ({
        ...prev,
        [billId]: {
          ...prev[billId],
          userVote: currentVote
        }
      }));

      alert("Failed to submit vote. Please try again.");
    }
  };

  if (error)
    return (
      <div style={{ color: "#ff6b6b", marginTop: "2rem" }}>
        Unable to load bills. Please try again later.
      </div>
    );

  return (
    <div style={{ width: "100%", maxWidth: "800px", padding: "0 20px" }}>
      {bills.map((bill) => {
        const billId = getBillId(bill);
        const stat = stats[billId] || {
          supportCount: 0,
          opposeCount: 0,
          totalVotes: 0,
          userVote: null
        };
        const totalVotes = stat.totalVotes || (stat.supportCount + stat.opposeCount);
        const supportPercent =
          totalVotes > 0
            ? Math.round((stat.supportCount / totalVotes) * 100)
            : 0;

        return (
          <div
            key={bill.url || Math.random()}
            style={{
              backgroundColor: "rgba(28, 28, 30, 1)", // iOS System Gray 6 (Dark Mode)
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              textAlign: "left",
              transition: "transform 0.2s ease",
              cursor: "default"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    color: bill.type === "HR" ? "#0A84FF" : "#FF453A", // iOS Blue / Red
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    letterSpacing: "0.05em"
                  }}
                >
                  {bill.type} {bill.number}
                </span>
                {bill.topic && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: `${bill.topicColor}20`, // 20% opacity
                      color: bill.topicColor,
                      fontWeight: "600",
                      textTransform: "uppercase"
                    }}
                  >
                    {bill.topic}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#8E8E93",
                    padding: "2px 6px",
                    border: "1px solid #3A3A3C",
                    borderRadius: "4px"
                  }}
                >
                  {bill.originChamber}
                </span>
              </div>
              <span style={{ color: "#666", fontSize: "0.85rem" }}>
                {new Date(bill.updateDate).toLocaleDateString()}
              </span>
            </div>
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "1.2rem",
                lineHeight: "1.4",
                fontWeight: "500"
              }}
            >
              {bill.title}
            </h3>

            {bill.latestAction && (
              <div style={{ marginBottom: "16px" }}>
                <p
                  style={{
                    color: "#999",
                    fontSize: "0.9rem",
                    margin: 0,
                    lineHeight: "1.5"
                  }}
                >
                  {bill.latestAction.text}
                </p>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#666",
                    marginTop: "4px"
                  }}
                >
                  {new Date(bill.latestAction.actionDate).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Engagement Stats Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.1)"
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <button
                  onClick={() => handleVote(bill, "support")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: stat.userVote === "support" ? "#34C759" : "#8E8E93",
                    transition: "color 0.2s"
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>👍</span>
                  <span style={{ fontSize: "0.85rem" }}>
                    {totalVotes > 0 ? `${supportPercent}%` : "0%"} Support
                  </span>
                </button>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#8E8E93"
                  }}
                >
                  <span>🗳️</span>
                  <span style={{ fontSize: "0.85rem" }}>
                    {totalVotes.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#8E8E93"
                  }}
                >
                  <span>💬</span>
                  <span style={{ fontSize: "0.85rem" }}>
                    {bill.commentsCount !== undefined
                      ? bill.commentsCount.toLocaleString()
                      : "0"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onViewBill && onViewBill(getBillId(bill))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0A84FF",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Read more ›
              </button>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        marginTop: "32px",
        padding: "24px 0"
      }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: "10px 20px",
            background: page === 1 ? "rgba(255,255,255,0.05)" : "#0A84FF",
            border: "none",
            borderRadius: "8px",
            color: page === 1 ? "#666" : "#fff",
            cursor: page === 1 ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
            transition: "opacity 0.2s"
          }}
          onMouseEnter={(e) => {
            if (page !== 1) e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            if (page !== 1) e.currentTarget.style.opacity = "1";
          }}
        >
          ← Previous
        </button>

        <div style={{
          padding: "10px 16px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: "500"
        }}>
          Page {page}
        </div>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          style={{
            padding: "10px 20px",
            background: !hasMore ? "rgba(255,255,255,0.05)" : "#0A84FF",
            border: "none",
            borderRadius: "8px",
            color: !hasMore ? "#666" : "#fff",
            cursor: !hasMore ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
            transition: "opacity 0.2s"
          }}
          onMouseEnter={(e) => {
            if (hasMore) e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            if (hasMore) e.currentTarget.style.opacity = "1";
          }}
        >
          Next →
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "1rem",
          color: "#444",
          fontSize: "0.8rem"
        }}
      >
        Data provided by Congress.gov
      </div>
    </div>
  );
}

export default BillFeed;
