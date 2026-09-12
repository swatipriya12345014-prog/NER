import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  isRouteAllowedForRole, 
  getDefaultRouteForRole, 
  getRoleDisplayName,
  ROLE_CONFIG 
} from '../../constants/roles';

/**
 * ProtectedRoute — Authentication & Authorization Guard
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Wraps protected dashboard routes with:
 *  1. Authentication check — redirects unauthenticated users to login
 *  2. Strict Role-based access control — blocks unauthorized role access
 *     ensuring that one role cannot access the workspace of another role.
 *  3. Session timeout — auto-logout after 30 min of inactivity
 *  4. Auth state integrity — validates user object consistency
 */

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { user, role, loading, logout } = useAuth();
  const location = useLocation();
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Track user activity
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Session timeout checker
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    timeoutRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > SESSION_TIMEOUT_MS) {
        console.warn('[Security] Session timed out after 30 min inactivity');
        setSessionExpired(true);
        logout();
      }
    }, 60_000); // Check every minute

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [user, logout, resetTimer]);

  // Show loading spinner while auth state resolves
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary, #0a0e1a)',
        color: 'var(--text-primary, #e2e8f0)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Verifying credentials…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Session expired message
  if (sessionExpired) {
    return <Navigate to="/" state={{ from: location, reason: 'session_expired' }} replace />;
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Auth state integrity check
  if (!user.uid || (!user.email && !user.displayName)) {
    console.error('[Security] Invalid auth state detected — forcing re-login');
    logout();
    return <Navigate to="/" state={{ from: location, reason: 'invalid_auth' }} replace />;
  }

  // 1. Strict requiredRoles guard
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(role)) {
      const roleName = getRoleDisplayName(role);
      const defaultRoute = getDefaultRouteForRole(role);
      const noticeMsg = `Role Boundary Guard: Logged in as "${roleName}". Access to "${location.pathname}" is restricted to designated personnel.`;
      console.warn(`[Security RBAC] ${noticeMsg}`);
      try {
        sessionStorage.setItem('ner_role_violation_notice', JSON.stringify({
          attemptedPath: location.pathname,
          userRole: role,
          roleName,
          timestamp: Date.now(),
        }));
      } catch (e) {}
      return <Navigate to={defaultRoute} replace />;
    }
  }

  // 2. Path-level role enforcement against unauthorized domains
  const currentPath = location.pathname;
  if (!isRouteAllowedForRole(role, currentPath)) {
    const roleName = getRoleDisplayName(role);
    const defaultRoute = getDefaultRouteForRole(role);
    const noticeMsg = `Role Boundary Guard: Path "${currentPath}" is not accessible by "${roleName}".`;
    console.warn(`[Security RBAC] ${noticeMsg}`);
    try {
      sessionStorage.setItem('ner_role_violation_notice', JSON.stringify({
        attemptedPath: currentPath,
        userRole: role,
        roleName,
        timestamp: Date.now(),
      }));
    } catch (e) {}
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;
