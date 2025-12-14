import React, { useState, useEffect } from "react";

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

// Helper to enrich raw API data with UI-specific fields (simulating the iOS app logic)
const enrichBillData = (bill) => {
  const topics = [
    { name: "Healthcare", color: "#007AFF" },
    { name: "Economy", color: "#FF9500" },
    { name: "Environment", color: "#34C759" },
    { name: "Defense", color: "#FF3B30" },
    { name: "Education", color: "#AF52DE" },
    { name: "Technology", color: "#5856D6" },
    { name: "Infrastructure", color: "#8E8E93" }
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  return {
    ...bill,
    topic: randomTopic.name,
    topicColor: randomTopic.color,
    supportPercentage: Math.floor(Math.random() * 40) + 40, // Random 40-80%
    votesCount: Math.floor(Math.random() * 5000) + 100,
    commentsCount: Math.floor(Math.random() * 300) + 10
  };
};

function BillFeed() {
  // Initialize with mock bills so the user sees content immediately
  const [bills, setBills] = useState(MOCK_BILLS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      // Call our backend proxy instead of Congress.gov directly
      // This protects the API key from being exposed in the browser
      const response = await fetch("/api/bills?limit=20");

      if (!response.ok) {
        throw new Error("Failed to fetch legislation");
      }

      const data = await response.json();

      if (data.bills && data.bills.length > 0) {
        // Enrich the real data to match the mock data structure
        setBills(data.bills.map(enrichBillData));
      }
    } catch (err) {
      console.error("Feed error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
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
      {bills.map((bill) => (
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                style={{ fontSize: "0.8rem", color: "#666", marginTop: "4px" }}
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
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#8E8E93"
                }}
              >
                <span>👍</span>
                <span style={{ fontSize: "0.85rem" }}>
                  {bill.supportPercentage}% Support
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
                <span>🗳️</span>
                <span style={{ fontSize: "0.85rem" }}>
                  {bill.votesCount.toLocaleString()}
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
                  {bill.commentsCount.toLocaleString()}
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
      ))}
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
