/**
 * Firestore Service
 * Centralized Firestore database operations
 */

import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';

// MARK: - User Operations

/**
 * Gets the current user's data from Firestore
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export async function getCurrentUser() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

/**
 * Updates the current user's data
 * @param {Object} data - Fields to update
 * @returns {Promise<void>}
 */
export async function updateCurrentUser(data) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'users', user.uid), data);
  } catch (error) {
    console.error('Error updating current user:', error);
    throw error;
  }
}

/**
 * Observes the current user's data in real-time
 * @param {Function} callback - Callback function receiving user data
 * @returns {Function} - Unsubscribe function
 */
export function observeCurrentUser(callback) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  return onSnapshot(
    doc(db, 'users', user.uid),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data(),
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error observing user:', error);
      callback(null);
    }
  );
}

// MARK: - Organization Operations

/**
 * Gets all organizations
 * @param {number} limitCount - Maximum number of organizations to fetch
 * @returns {Promise<Array>} - Array of organization objects
 */
export async function getOrganizations(limitCount = 50) {
  try {
    const q = query(
      collection(db, 'organizations'),
      orderBy('memberCount', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting organizations:', error);
    throw error;
  }
}

/**
 * Gets a specific organization by ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object|null>} - Organization data or null
 */
export async function getOrganization(orgId) {
  try {
    const orgDoc = await getDoc(doc(db, 'organizations', orgId));
    if (!orgDoc.exists()) {
      return null;
    }

    return {
      id: orgDoc.id,
      ...orgDoc.data(),
    };
  } catch (error) {
    console.error('Error getting organization:', error);
    throw error;
  }
}

/**
 * Joins an organization
 * @param {string} orgId - Organization ID to join
 * @returns {Promise<void>}
 */
export async function joinOrganization(orgId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update organization
    await updateDoc(doc(db, 'organizations', orgId), {
      members: arrayUnion(user.uid),
      memberCount: increment(1),
    });

    // Update user's following list
    await updateDoc(doc(db, 'users', user.uid), {
      following: arrayUnion(orgId),
    });
  } catch (error) {
    console.error('Error joining organization:', error);
    throw error;
  }
}

/**
 * Leaves an organization
 * @param {string} orgId - Organization ID to leave
 * @returns {Promise<void>}
 */
export async function leaveOrganization(orgId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update organization
    await updateDoc(doc(db, 'organizations', orgId), {
      members: arrayRemove(user.uid),
      memberCount: increment(-1),
    });

    // Update user's following list
    await updateDoc(doc(db, 'users', user.uid), {
      following: arrayRemove(orgId),
    });
  } catch (error) {
    console.error('Error leaving organization:', error);
    throw error;
  }
}

// MARK: - Chat Message Operations

/**
 * Gets messages for an organization
 * @param {string} orgId - Organization ID
 * @param {number} limitCount - Maximum number of messages to fetch
 * @returns {Promise<Array>} - Array of message objects
 */
export async function getMessages(orgId, limitCount = 50) {
  try {
    const q = query(
      collection(db, 'organizations', orgId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return messages.reverse(); // Return oldest first
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

/**
 * Sends a message to an organization
 * @param {string} orgId - Organization ID
 * @param {string} content - Message content
 * @param {string} type - Message type: 'text', 'image', or 'poll'
 * @returns {Promise<string>} - Message ID
 */
export async function sendMessage(orgId, content, type = 'text') {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user data for author name
    const userData = await getCurrentUser();
    const authorName = userData?.email || 'Anonymous';

    const messageRef = doc(collection(db, 'organizations', orgId, 'messages'));
    await setDoc(messageRef, {
      authorId: user.uid,
      authorName,
      content,
      timestamp: serverTimestamp(),
      type,
      reactions: {},
    });

    return messageRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Observes messages for an organization in real-time
 * @param {string} orgId - Organization ID
 * @param {Function} callback - Callback function receiving messages array
 * @returns {Function} - Unsubscribe function
 */
export function observeMessages(orgId, callback) {
  const q = query(
    collection(db, 'organizations', orgId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(messages);
    },
    (error) => {
      console.error('Error observing messages:', error);
      callback([]);
    }
  );
}

// MARK: - Forum Post Operations

/**
 * Gets forum posts
 * @param {number} limitCount - Maximum number of posts to fetch
 * @returns {Promise<Array>} - Array of post objects
 */
export async function getForumPosts(limitCount = 50) {
  try {
    const q = query(
      collection(db, 'forum_posts'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting forum posts:', error);
    throw error;
  }
}

/**
 * Creates a new forum post
 * @param {string} content - Post content
 * @param {string|null} billId - Optional bill ID
 * @param {string|null} organizationId - Optional organization ID
 * @returns {Promise<string>} - Post ID
 */
export async function createForumPost(content, billId = null, organizationId = null) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userData = await getCurrentUser();
    const authorName = userData?.email || 'Anonymous';

    const postRef = doc(collection(db, 'forum_posts'));
    await setDoc(postRef, {
      authorId: user.uid,
      authorName,
      content,
      timestamp: serverTimestamp(),
      billId: billId || null,
      organizationId: organizationId || null,
      likeCount: 0,
      commentCount: 0,
      likedBy: [],
      isSample: false,
    });

    return postRef.id;
  } catch (error) {
    console.error('Error creating forum post:', error);
    throw error;
  }
}

/**
 * Likes a forum post
 * @param {string} postId - Post ID
 * @returns {Promise<void>}
 */
export async function likeForumPost(postId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'forum_posts', postId), {
      likedBy: arrayUnion(user.uid),
      likeCount: increment(1),
    });
  } catch (error) {
    console.error('Error liking forum post:', error);
    throw error;
  }
}

/**
 * Unlikes a forum post
 * @param {string} postId - Post ID
 * @returns {Promise<void>}
 */
export async function unlikeForumPost(postId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'forum_posts', postId), {
      likedBy: arrayRemove(user.uid),
      likeCount: increment(-1),
    });
  } catch (error) {
    console.error('Error unliking forum post:', error);
    throw error;
  }
}

// MARK: - Event Operations

/**
 * Gets upcoming events
 * @param {number} limitCount - Maximum number of events to fetch
 * @returns {Promise<Array>} - Array of event objects
 */
export async function getUpcomingEvents(limitCount = 50) {
  try {
    const q = query(
      collection(db, 'events'),
      where('startDate', '>', new Date()),
      orderBy('startDate', 'asc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw error;
  }
}

/**
 * Attends an event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export async function attendEvent(eventId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'events', eventId), {
      attendees: arrayUnion(user.uid),
      attendeeCount: increment(1),
    });
  } catch (error) {
    console.error('Error attending event:', error);
    throw error;
  }
}

/**
 * Unattends an event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export async function unattendEvent(eventId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await updateDoc(doc(db, 'events', eventId), {
      attendees: arrayRemove(user.uid),
      attendeeCount: increment(-1),
    });
  } catch (error) {
    console.error('Error unattending event:', error);
    throw error;
  }
}

// MARK: - Vote Operations

/**
 * Gets vote statistics for a bill
 * @param {string} billId - Bill ID
 * @returns {Promise<Object>} - Vote statistics
 */
export async function getVoteStats(billId) {
  try {
    const statsDoc = await getDoc(doc(db, 'bill_votes', billId));
    if (!statsDoc.exists()) {
      return {
        supportCount: 0,
        opposeCount: 0,
        totalVotes: 0,
        supportPercentage: 0,
        opposePercentage: 0,
      };
    }

    const data = statsDoc.data();
    const total = data.totalVotes || 0;

    return {
      supportCount: data.supportCount || 0,
      opposeCount: data.opposeCount || 0,
      totalVotes: total,
      supportPercentage: total > 0 ? (data.supportCount / total) * 100 : 0,
      opposePercentage: total > 0 ? (data.opposeCount / total) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting vote stats:', error);
    throw error;
  }
}

/**
 * Gets the current user's vote on a bill
 * @param {string} billId - Bill ID
 * @returns {Promise<string|null>} - 'support', 'oppose', or null
 */
export async function getUserVote(billId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const voteDoc = await getDoc(
      doc(db, 'user_votes', user.uid, 'votes', billId)
    );

    if (!voteDoc.exists()) {
      return null;
    }

    return voteDoc.data().vote;
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

/**
 * Votes on a bill
 * @param {string} billId - Bill ID
 * @param {string} vote - 'support' or 'oppose'
 * @returns {Promise<void>}
 */
export async function voteBill(billId, vote) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user already voted
    const existingVote = await getUserVote(billId);

    if (existingVote) {
      // Remove previous vote counts
      if (existingVote === 'support') {
        await updateDoc(doc(db, 'bill_votes', billId), {
          supportCount: increment(-1),
          totalVotes: increment(-1),
        });
      } else {
        await updateDoc(doc(db, 'bill_votes', billId), {
          opposeCount: increment(-1),
          totalVotes: increment(-1),
        });
      }
    }

    // Add new vote
    await setDoc(doc(db, 'user_votes', user.uid, 'votes', billId), {
      vote,
      timestamp: serverTimestamp(),
    });

    // Update vote counts
    const statsRef = doc(db, 'bill_votes', billId);
    if (vote === 'support') {
      await setDoc(
        statsRef,
        {
          supportCount: increment(1),
          totalVotes: increment(1),
        },
        { merge: true }
      );
    } else {
      await setDoc(
        statsRef,
        {
          opposeCount: increment(1),
          totalVotes: increment(1),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error voting on bill:', error);
    throw error;
  }
}
