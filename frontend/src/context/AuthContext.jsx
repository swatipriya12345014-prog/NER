import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, saveFirebaseConfig } from '../services/firebase';
import { AuthContext } from './AuthContextInstance';

const ROLE_STORAGE_KEY = 'ner_lifeline_user_role';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => {
    try {
      return sessionStorage.getItem(ROLE_STORAGE_KEY) || localStorage.getItem(ROLE_STORAGE_KEY) || 'admin';
    } catch {
      return 'admin';
    }
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // High-Security Directive: Enforce Zero-Trust In-Memory Authentication.
  // Any manual URL selection, address-bar entry, or browser reload starts unauthenticated,
  // guaranteeing that typing `/alert` or any protected route directly displays the login page.
  useEffect(() => {
    try {
      localStorage.removeItem('ner_lifeline_mock_user');
      localStorage.removeItem('ner_lifeline_session_user');
      sessionStorage.removeItem('ner_lifeline_session_user');
      sessionStorage.removeItem('ner_lifeline_mock_user');
    } catch {}

    if (isFirebaseConfigured && auth) {
      try {
        setPersistence(auth, inMemoryPersistence).catch(() => {});
        signOut(auth).catch(() => {});
      } catch {}
    }

    setUser(null);
    setLoading(false);
  }, []);

  const changeRole = (newRole) => {
    setRole(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
      sessionStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch {}
  };

  const loginWithGoogle = async (selectedRole) => {
    setAuthError(null);
    if (selectedRole) changeRole(selectedRole);

    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        console.log('Starting Firebase Google signInWithPopup...');
        await setPersistence(auth, inMemoryPersistence);
        const result = await signInWithPopup(auth, googleProvider);
        const signedUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Emergency Officer',
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        setUser(signedUser);
        return { success: true, user: signedUser, live: true };
      } catch (err) {
        console.error('Firebase Auth Error details:', err.code, err.message);
        let friendlyMessage = err.message;

        if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
          friendlyMessage = 'Google provider is not enabled in Firebase Console. Go to Build > Authentication > Sign-in method > Google and click Enable.';
        } else if (err.code === 'auth/unauthorized-domain') {
          friendlyMessage = 'Domain not authorized in Firebase Console. Go to Authentication → Settings → Authorized domains and add your Vercel deployment domain (e.g. your-app.vercel.app).';
        } else if (err.code === 'auth/popup-blocked') {
          friendlyMessage = 'Browser blocked the popup window. Please allow popups or use the Account Selector.';
        } else if (err.code === 'auth/popup-closed-by-user') {
          friendlyMessage = 'Google Sign-in popup was closed before finishing.';
        }

        const customErr = new Error(friendlyMessage);
        customErr.code = err.code;
        setAuthError(friendlyMessage);
        throw customErr;
      }
    } else {
      return { success: false, needAccountSelection: true };
    }
  };

  const selectGoogleAccount = (accountData, selectedRole) => {
    if (selectedRole) changeRole(selectedRole);
    const chosenUser = {
      uid: accountData.uid || 'google-user-' + Date.now(),
      displayName: accountData.displayName,
      email: accountData.email,
      photoURL: accountData.photoURL || null,
      provider: 'google.com',
    };
    setUser(chosenUser);
    return chosenUser;
  };

  const loginWithEmail = async (email, password, selectedRole) => {
    setAuthError(null);
    if (selectedRole) changeRole(selectedRole);

    if (isFirebaseConfigured && auth) {
      try {
        await setPersistence(auth, inMemoryPersistence);
        const result = await signInWithEmailAndPassword(auth, email, password);
        const signedUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || email.split('@')[0],
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        setUser(signedUser);
        return signedUser;
      } catch (err) {
        setAuthError(err.message || 'Invalid credentials');
        throw err;
      }
    } else {
      const demoUser = {
        uid: 'user-' + Date.now(),
        displayName: email ? email.split('@')[0] : 'Demo User',
        email: email || 'admin@ner-lifeline.gov.in',
        photoURL: null,
      };
      setUser(demoUser);
      return demoUser;
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign-out error:', err);
      }
    }
    try {
      sessionStorage.clear();
      localStorage.removeItem('ner_lifeline_mock_user');
      localStorage.removeItem('ner_lifeline_session_user');
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        authError,
        isFirebaseConfigured,
        changeRole,
        loginWithGoogle,
        selectGoogleAccount,
        loginWithEmail,
        logout,
        saveFirebaseConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
export { AuthContext } from './AuthContextInstance';
