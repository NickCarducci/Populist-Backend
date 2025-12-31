import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Callback page for Didit verification completion
 *
 * URL: https://youinpolitics.com/verification-complete
 *
 * This page is shown after user completes Didit verification.
 * It extracts the session_id from URL params and closes the verification flow.
 */
function VerificationComplete() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract session_id from URL params
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const status = params.get('status');

    console.log('✅ Didit verification complete!');
    console.log('   Session ID:', sessionId);
    console.log('   Status:', status);

    // Wait 2 seconds to show success message, then redirect
    setTimeout(() => {
      // Redirect back to account page
      navigate('/account');
    }, 2000);
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
          Verification Complete!
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          Your identity has been verified.
          <br />
          Redirecting you back...
        </p>
        <div style={{
          marginTop: '2rem',
          width: '200px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #0A84FF, #34C759)',
            animation: 'progress 2s ease-in-out'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default VerificationComplete;
