import React, { useState, useEffect } from "react";
import { db } from "./App";
import {
  doc,
  runTransaction,
  collection,
  query,
  where,
  documentId,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

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

function BillFeed({ user }) {
  // Initialize with mock bills so the user sees content immediately
  const [bills, setBills] = useState(MOCK_BILLS);
  const [stats, setStats] = useState({}); // Map of billId -> { supportCount, opposeCount, userVote }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBills();
  }, [user]); // Re-fetch if user logs in/out to update vote status

  // Real-time listener for stats and user votes
  useEffect(() => {
    if (bills.length === 0) return;

    const billIds = bills.map(getBillId);

    // 1. Listen to aggregate stats (bill_stats collection)
    const statsQuery = query(
      collection(db, "bill_stats"),
      where(documentId(), "in", billIds)
    );

    const unsubStats = onSnapshot(statsQuery, (snapshot) => {
      setStats((prev) => {
        const next = { ...prev };
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          next[doc.id] = {
            ...next[doc.id],
            supportCount: data.supportCount || 0,
            opposeCount: data.opposeCount || 0
          };
        });
        return next;
      });
    });

    // 2. Listen to user's own votes (votes collection)
    let unsubVotes = () => {};
    if (user) {
      const votesQuery = query(
        collection(db, "votes"),
        where("uid", "==", user.uid),
        where("billId", "in", billIds)
      );

      unsubVotes = onSnapshot(votesQuery, (snapshot) => {
        setStats((prev) => {
          const next = { ...prev };

          // Handle vote changes/removals
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const bId = data.billId;
            if (change.type === "added" || change.type === "modified") {
              next[bId] = { ...next[bId], userVote: data.voteType };
            }
            if (change.type === "removed") {
              next[bId] = { ...next[bId], userVote: null };
            }
          });
          return next;
        });
      });
    }

    return () => {
      unsubStats();
      unsubVotes();
    };
  }, [bills, user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      // Call our backend proxy instead of Congress.gov directly
      // This protects the API key from being exposed in the browser
      const response = await fetch("/api/bills?limit=20");

      if (!response.ok) {
        throw new Error("Failed to fetch legislation");
      }

      const data = await response.json();

      let currentBills = bills;
      if (data.bills && data.bills.length > 0) {
        currentBills = data.bills;
        setBills(currentBills);
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
    const voteRef = doc(db, "votes", `${user.uid}_${billId}`);
    const statsRef = doc(db, "bill_stats", billId);

    try {
      await runTransaction(db, async (transaction) => {
        const voteDoc = await transaction.get(voteRef);
        const statsDoc = await transaction.get(statsRef);

        let supportDelta = 0;
        let opposeDelta = 0;

        if (voteDoc.exists()) {
          const previousVote = voteDoc.data().voteType;

          if (previousVote === voteType) {
            // Toggle off (remove vote)
            transaction.delete(voteRef);
            if (voteType === "support") supportDelta = -1;
            else opposeDelta = -1;
          } else {
            // Switch vote
            transaction.update(voteRef, {
              voteType,
              updatedAt: serverTimestamp()
            });
            if (voteType === "support") {
              supportDelta = 1;
              opposeDelta = -1;
            } else {
              opposeDelta = 1;
              supportDelta = -1;
            }
          }
        } else {
          // New vote
          transaction.set(voteRef, {
            uid: user.uid,
            billId,
            voteType,
            createdAt: serverTimestamp()
          });
          if (voteType === "support") supportDelta = 1;
          else opposeDelta = 1;
        }

        // Update stats
        const currentStats = statsDoc.exists()
          ? statsDoc.data()
          : { supportCount: 0, opposeCount: 0 };
        const newSupport = (currentStats.supportCount || 0) + supportDelta;
        const newOppose = (currentStats.opposeCount || 0) + opposeDelta;

        transaction.set(
          statsRef,
          {
            supportCount: Math.max(0, newSupport),
            opposeCount: Math.max(0, newOppose)
          },
          { merge: true }
        );
      });
    } catch (e) {
      console.error("Vote failed", e);
      // Ideally revert optimistic update here
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
          userVote: null
        };
        const totalVotes = stat.supportCount + stat.opposeCount;
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
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0A84FF",
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                Read more ›
              </button>
            </div>
          </div>
        );
      })}
      <div
        style={{
          textAlign: "center",
          marginTop: "2rem",
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
