import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';

const AuthContext = createContext(null);

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
          // Check for mock user if not signed into Firebase
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
      // Fallback mode when Firebase env credentials are not yet populated
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
        const result = await signInWithPopup(auth, googleProvider);
        const signedUser = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Emergency Officer',
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        setUser(signedUser);
        localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        return signedUser;
      } catch (err) {
        setAuthError(err.message || 'Failed to authenticate with Google');
        throw err;
      }
    } else {
      // Graceful fallback for local development before live Firebase keys are entered
      const mockGoogleUser = {
        uid: 'oauth-google-' + Date.now(),
        displayName: 'Google Officer (' + (selectedRole || role).toUpperCase() + ')',
        email: 'officer@ner-lifeline.gov.in',
        photoURL: null,
        isDemoOAuth: true,
      };
      setUser(mockGoogleUser);
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockGoogleUser));
      return mockGoogleUser;
    }
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
      // Fallback demo user
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
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
