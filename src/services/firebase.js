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

export const firebaseConfig = {
  apiKey: storedConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: storedConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: storedConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: storedConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: storedConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: storedConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
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
