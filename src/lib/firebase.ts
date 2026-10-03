import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  // Never fall back to window.location.hostname here. Firebase Auth expects a
  // real authorized auth domain, and using "localhost" breaks the popup/handler
  // flow by redirecting to http://localhost/__/auth/handler on port 80.
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

if (
  typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'undefined' &&
  typeof window !== 'undefined'
) {
  // Fail loudly in dev when the env file is missing instead of falling back to
  // committed values. Production builds read the same vars from the platform.
  console.warn(
    '[PAGE.OS] NEXT_PUBLIC_FIREBASE_* environment variables are not set. Firebase features are disabled. Copy .env.local from your deployment config.',
  );
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

async function enableOptionalAnalytics() {
  if (typeof window === 'undefined' || !firebaseConfig.measurementId) {
    return null;
  }

  const { getAnalytics, isSupported } = await import('firebase/analytics');
  const supported = await isSupported();
  return supported ? getAnalytics(app) : null;
}

export { app, auth, db, googleProvider, enableOptionalAnalytics };
