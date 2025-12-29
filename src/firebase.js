/**
 * Firebase Configuration and Initialization
 * Centralized Firebase setup for the React app
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIWePSPPG4vlaPUkYruZSdOR95NglRT2o",
  authDomain: "pop-u-list.firebaseapp.com",
  projectId: "pop-u-list",
  storageBucket: "pop-u-list.firebasestorage.app",
  messagingSenderId: "373429951237",
  appId: "1:373429951237:web:85726684aaa034ec9eb56c"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
