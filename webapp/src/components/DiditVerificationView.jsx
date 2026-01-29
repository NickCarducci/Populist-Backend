/**
 * DiditVerificationView Component
 * Full-screen verification flow for Didit identity verification
 * Supports Proof of Address, ID Verification, and Face Match
 */

import React, { useState, useEffect } from 'react';
import { createVerificationSession } from '../services/diditService';

/**
 * DiditVerificationView Component
 *
 * Shows an iframe for Didit identity verification.
 * The parent component (UserAccount) detects completion via real-time Firestore listener
 * and auto-closes this modal - no polling needed.
 */
export default function DiditVerificationView({
  verificationType = 'proof_of_address',
  onComplete,
  onCancel,
  isVerified = false // Passed from parent when real-time listener detects completion
}) {
  const [sessionUrl, setSessionUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initializing');

  // Show success state when parent detects verification via real-time listener
  useEffect(() => {
    if (isVerified) {
      setStatus('verified');
    }
  }, [isVerified]);

  // Start verification session on mount
  useEffect(() => {
    initializeVerification();
  }, []);

  const initializeVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const { sessionId: newSessionId, sessionUrl: newSessionUrl } =
        await createVerificationSession(verificationType, {
          source: 'web',
          timestamp: new Date().toISOString()
        });

      setSessionId(newSessionId);
      setSessionUrl(newSessionUrl);
      setStatus('ready');
      setLoading(false);

      // No polling needed - parent component detects completion via real-time Firestore listener
    } catch (err) {
      console.error('Failed to initialize verification:', err);
      setError(err.message || 'Failed to start verification session');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('initializing');
    initializeVerification();
  };

  // Loading State
  if (loading || status === 'initializing') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <h2 style={styles.loadingTitle}>Initializing Verification</h2>
          <p style={styles.loadingText}>
            Setting up your identity verification session...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && status !== 'verified') {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Verification Error</h2>
          <p style={styles.errorText}>{error}</p>
          <div style={styles.buttonRow}>
            <button onClick={handleRetry} style={styles.retryButton}>
              Try Again
            </button>
            <button onClick={handleCancel} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (status === 'verified') {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Verification Complete!</h2>
          <p style={styles.successText}>
            Your identity has been successfully verified.
          </p>
          <p style={styles.successSubtext}>
            You'll be redirected shortly...
          </p>
        </div>
      </div>
    );
  }

  // WebView State (default)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={handleCancel} style={styles.closeButton}>
          ✕
        </button>
        <h3 style={styles.headerTitle}>Identity Verification</h3>
        <div style={{ width: 32 }} />
      </div>

      <iframe
        src={sessionUrl}
        style={styles.iframe}
        title="Didit Verification"
        allow="camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Powered by Didit • Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '1.2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  iframe: {
    flex: 1,
    border: 'none',
    width: '100%'
  },
  footer: {
    padding: '12px 20px',
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center'
  },
  footerText: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#8E8E93'
  },
  loadingCard: {
    margin: 'auto',
    padding: '48px 32px',
    textAlign: 'center',
    maxWidth: 400
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #0A84FF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px'
  },
  loadingTitle: {
    margin: '0 0 12px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#fff'
  },
  loadingText: {
    margin: 0,
    fontSize: '1rem',
    color: '#8E8E93',
    lineHeight: '1.5'
  },
  errorCard: {
    margin: 'auto',
    padding: '48px 32px',
    textAlign: 'center',
    maxWidth: 400
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '16px'
  },
  errorTitle: {
    margin: '0 0 12px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#fff'
  },
  errorText: {
    margin: '0 0 24px 0',
    fontSize: '1rem',
    color: '#8E8E93',
    lineHeight: '1.5'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#0A84FF',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  successCard: {
    margin: 'auto',
    padding: '48px 32px',
    textAlign: 'center',
    maxWidth: 400
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '16px'
  },
  successTitle: {
    margin: '0 0 12px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#fff'
  },
  successText: {
    margin: '0 0 8px 0',
    fontSize: '1rem',
    color: '#8E8E93',
    lineHeight: '1.5'
  },
  successSubtext: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  button:hover {
    opacity: 0.8;
  }
`;
document.head.appendChild(styleSheet);
