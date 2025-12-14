import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import AdminDashboard from "./AdminDashboard";
import BillFeed from "./BillFeed";
import UserAccount from "./UserAccount";
// Import the functions you need from the SDKs you need
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIWePSPPG4vlaPUkYruZSdOR95NglRT2o",
  authDomain: "pop-u-list.firebaseapp.com",
  projectId: "pop-u-list",
  storageBucket: "pop-u-list.firebasestorage.app",
  messagingSenderId: "373429951237",
  appId: "1:373429951237:web:85726684aaa034ec9eb56c"
};

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("feed"); // "feed" | "admin" | "account"

  useEffect(() => {
    // Listen for auth state changes (persists session across refreshes)
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Check for token and uid in URL params (returned from backend redirect)
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token");

    if (token) {
      // Exchange the custom token for a Firebase session
      signInWithCustomToken(auth, token)
        .then(() => {
          // Clean the URL for a cleaner UI state
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        })
        .catch((err) => {
          console.error("Sign in failed", err);
          setError(err.message);
        });
    }
    return () => unsubscribe();
  }, []);

  const handleSignIn = () => {
    const clientId = "com.sayists.Populist.signin";
    const redirectUri = "https://youinpolitics.com/apple";
    const state = "init_sign_in";

    // Construct the Apple OAuth URL
    const url =
      `https://appleid.apple.com/auth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code id_token&` +
      `scope=name email&` +
      `response_mode=form_post&` +
      `state=${state}`;

    window.location.href = url;
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        margin: 0,
        overflow: user ? "auto" : "hidden",
        padding: user ? "2rem 0" : 0
      }}
    >
      <div
        style={{
          textAlign: "center",
          animation: "fadein 2s ease-in",
          width: "100%"
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontWeight: 200,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontSize: "2rem",
              marginBottom: "0.5rem"
            }}
          >
            You In Politics
          </h1>
          <p
            style={{
              color: "#666",
              fontSize: "0.8rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}
          >
            {view === "feed"
              ? "Populist Legislative Feed"
              : view === "account"
              ? "Your Account"
              : "Admin Dashboard"}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginBottom: "3rem",
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={() => setView("feed")}
            style={{
              background:
                view === "feed" ? "rgba(255,255,255,0.1)" : "transparent",
              border: `1px solid ${
                view === "feed"
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.1)"
              }`,
              color: view === "feed" ? "#fff" : "#888",
              padding: "8px 20px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
              transition: "all 0.2s ease"
            }}
          >
            📜 Bills
          </button>
          {user && (
            <button
              onClick={() => setView("account")}
              style={{
                background:
                  view === "account" ? "rgba(255,255,255,0.1)" : "transparent",
                border: `1px solid ${
                  view === "account"
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.1)"
                }`,
                color: view === "account" ? "#fff" : "#888",
                padding: "8px 20px",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
            >
              👤 Account
            </button>
          )}
          {user?.email === "nmcarducci@gmail.com" && (
            <button
              onClick={() => setView("admin")}
              style={{
                background:
                  view === "admin" ? "rgba(255,255,255,0.1)" : "transparent",
                border: `1px solid ${
                  view === "admin"
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.1)"
                }`,
                color: view === "admin" ? "#fff" : "#888",
                padding: "8px 20px",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
            >
              🔐 Admin
            </button>
          )}
          {!user && (
            <button
              onClick={handleSignIn}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                padding: "8px 20px",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <svg
                viewBox="0 0 384 512"
                width="14"
                height="14"
                style={{ fill: "white" }}
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
              </svg>
              Sign In
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ color: "#666" }}>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>Error: {error}</div>
        ) : view === "feed" ? (
          <BillFeed />
        ) : view === "account" && user ? (
          <UserAccount user={user} onSignOut={handleSignOut} />
        ) : view === "admin" && user ? (
          <AdminDashboard user={user} onSignOut={handleSignOut} />
        ) : (
          <div style={{ animation: "fadein 1s ease-in" }}>
            <p
              style={{
                color: "#888",
                fontSize: "0.9rem",
                marginBottom: "2rem"
              }}
            >
              {view === "admin"
                ? "Sign in to access admin features"
                : "Sign in to view your account"}
            </p>
            <button
              onClick={handleSignIn}
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "none",
                padding: "12px 24px",
                fontSize: "1rem",
                borderRadius: "50px",
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "0 auto",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
              }}
            >
              <svg
                viewBox="0 0 384 512"
                width="18"
                height="18"
                style={{ fill: "black" }}
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
              </svg>
              Sign in with Apple
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadein {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
