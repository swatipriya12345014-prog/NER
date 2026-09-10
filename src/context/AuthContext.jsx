import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, saveFirebaseConfig } from '../services/firebase';
import { AuthContext } from './AuthContextInstance';

const ROLE_STORAGE_KEY = 'ner_lifeline_user_role';
const MOCK_USER_STORAGE_KEY = 'ner_lifeline_mock_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => {
    return localStorage.getItem(ROLE_STORAGE_KEY) || 'admin';
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Sync Firebase Auth state
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Authorized User',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          const savedMock = localStorage.getItem(MOCK_USER_STORAGE_KEY);
          if (savedMock) {
            try {
              setUser(JSON.parse(savedMock));
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const savedMock = localStorage.getItem(MOCK_USER_STORAGE_KEY);
      if (savedMock) {
        try {
          setUser(JSON.parse(savedMock));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  const changeRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const loginWithGoogle = async (selectedRole) => {
    setAuthError(null);
    if (selectedRole) changeRole(selectedRole);

    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        console.log('Starting Firebase Google signInWithPopup...');
        const result = await signInWithPopup(auth, googleProvider);
        const signedUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Emergency Officer',
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        setUser(signedUser);
        localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        return { success: true, user: signedUser, live: true };
      } catch (err) {
        console.error('Firebase Auth Error details:', err.code, err.message);
        let friendlyMessage = err.message;

        if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
          friendlyMessage = 'Google provider is not enabled in Firebase Console. Go to Build > Authentication > Sign-in method > Google and click Enable.';
        } else if (err.code === 'auth/unauthorized-domain') {
          friendlyMessage = 'Domain not authorized in Firebase Console. Go to Authentication > Settings > Authorized domains and ensure localhost is listed.';
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
    localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(chosenUser));
    return chosenUser;
  };

  const loginWithEmail = async (email, password, selectedRole) => {
    setAuthError(null);
    if (selectedRole) changeRole(selectedRole);

    if (isFirebaseConfigured && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const signedUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || email.split('@')[0],
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        setUser(signedUser);
        localStorage.removeItem(MOCK_USER_STORAGE_KEY);
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
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(demoUser));
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
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
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
