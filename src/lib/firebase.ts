import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  // Fallback to hardcoded values for local development
  // In a deployed environment, these are pulled from environment variables
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDcetZGa7-_c28lbdZ-ZqvAbXaIQ_mEpwQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pageos.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pageos",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pageos.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "588283938271",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:588283938271:web:b739830deb89e91765f06a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-58C85TP1KC"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize analytics only on the client side if a measurementId is provided
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    getAnalytics(app);
}

export { app, auth, db, googleProvider };
