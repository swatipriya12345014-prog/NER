import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem('ner_firebase_config');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storedConfig = getStoredConfig();

// Hardcoded fallback config ensures the app works on any deployment
// (Vercel, Firebase Hosting, etc.) without requiring env vars in the dashboard.
// .env values and localStorage overrides take priority when available.
const FALLBACK_CONFIG = {
  apiKey: 'AIzaSyCiAUD17sbRWqs_yDmGFmBNQ37Z2oaznxU',
  authDomain: 'ner-l-b0ef4.firebaseapp.com',
  projectId: 'ner-l-b0ef4',
  storageBucket: 'ner-l-b0ef4.firebasestorage.app',
  messagingSenderId: '904831725553',
  appId: '1:904831725553:web:ecd72d33ac7d319df55e50',
};

export const firebaseConfig = {
  apiKey: storedConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK_CONFIG.apiKey,
  authDomain: storedConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK_CONFIG.authDomain,
  projectId: storedConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK_CONFIG.projectId,
  storageBucket: storedConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FALLBACK_CONFIG.storageBucket,
  messagingSenderId: storedConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FALLBACK_CONFIG.messagingSenderId,
  appId: storedConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK_CONFIG.appId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.apiKey.length > 10 &&
  firebaseConfig.projectId
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    // Forces Google to show account selection prompt every time
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
  }
}

export const saveFirebaseConfig = (config) => {
  try {
    localStorage.setItem('ner_firebase_config', JSON.stringify(config));
    window.location.reload();
  } catch (err) {
    console.error('Failed to save config', err);
  }
};

export { app, auth, googleProvider };
