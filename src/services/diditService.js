/**
 * Didit Verification Service
 * Handles identity verification sessions via Didit API
 */

import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Creates a new Didit verification session
 * @param {string} verificationType - Type of verification: 'proof_of_address', 'id_verification', or 'face_match'
 * @param {Object} metadata - Additional metadata to include
 * @returns {Promise<{sessionId: string, sessionUrl: string}>}
 */
export async function createVerificationSession(
  verificationType = 'proof_of_address',
  metadata = {}
) {
  try {
    // Get current user's ID token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/api/didit/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        idToken,
        verificationType,
        metadata,
        platform: 'web',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create verification session');
    }

    const data = await response.json();
    return {
      sessionId: data.sessionId,
      sessionUrl: data.sessionUrl,
    };
  } catch (error) {
    console.error('Error creating verification session:', error);
    throw error;
  }
}

/**
 * Gets the current status of a verification session
 * @param {string} sessionId - The session ID to check
 * @returns {Promise<Object>} - Session status data
 */
export async function getVerificationStatus(sessionId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/api/didit/status/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get verification status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting verification status:', error);
    throw error;
  }
}

/**
 * Polls verification status until completion or timeout
 * @param {string} sessionId - The session ID to poll
 * @param {Function} onUpdate - Callback function called on each status update
 * @param {number} intervalMs - Polling interval in milliseconds (default: 3000)
 * @param {number} maxAttempts - Maximum number of polling attempts (default: 60)
 * @returns {Promise<Object>} - Final status data
 */
export async function pollVerificationStatus(
  sessionId,
  onUpdate = null,
  intervalMs = 3000,
  maxAttempts = 60
) {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        attempts++;

        const status = await getVerificationStatus(sessionId);

        // Call update callback if provided
        if (onUpdate) {
          onUpdate(status);
        }

        // Check if verification is complete
        if (status.status === 'verified' || status.status === 'failed') {
          clearInterval(pollInterval);
          resolve(status);
          return;
        }

        // Check if max attempts reached
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          reject(new Error('Polling timeout: verification took too long'));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, intervalMs);
  });
}

/**
 * Stops an active polling operation
 * Note: Store the interval ID if you need manual cancellation
 */
export function cancelPolling(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
  }
}
