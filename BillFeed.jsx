import React, { useState, useEffect } from "react";

function BillFeed() {
  const [bills, setBills] = useState([]);
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
      setBills(data.bills || []);
    } catch (err) {
      console.error("Feed error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div style={{ color: "#888", marginTop: "2rem" }}>
        Loading legislation...
      </div>
    );
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
            backgroundColor: "rgba(255,255,255,0.05)",
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
              marginBottom: "12px"
            }}
          >
            <span
              style={{
                color: bill.type === "HR" ? "#4A90E2" : "#E24A4A",
                fontWeight: "bold",
                fontSize: "0.9rem",
                letterSpacing: "0.05em"
              }}
            >
              {bill.type} {bill.number}
            </span>
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
            <p
              style={{
                color: "#999",
                fontSize: "0.95rem",
                margin: 0,
                lineHeight: "1.5"
              }}
            >
              {bill.latestAction.text}
            </p>
          )}
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
