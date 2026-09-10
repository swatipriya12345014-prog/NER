import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Truck, Building, Activity, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, isFirebaseConfigured, authError } = useAuth();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getDashboardRoute = (targetRole) => {
    switch (targetRole) {
      case 'admin':
        return '/admin-dashboard';
      case 'driver':
        return '/driver-dashboard';
      case 'field_officer':
        return '/field-officer';
      case 'logistics_manager':
        return '/shipments';
      default:
        return '/admin-dashboard';
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle(role);
      navigate(getDashboardRoute(role));
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing.');
      } else {
        setErrorMsg(err.message || 'Google sign-in failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password, role);
      navigate(getDashboardRoute(role));
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { id: 'admin', label: 'Administrator', icon: <Shield size={18} /> },
    { id: 'logistics_manager', label: 'Logistics Manager', icon: <Building size={18} /> },
    { id: 'field_officer', label: 'Field Officer', icon: <Users size={18} /> },
    { id: 'driver', label: 'Driver', icon: <Truck size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="flex justify-center mb-4">
          <div className="bg-slate-800/80 p-4 rounded-full border border-slate-600 shadow-xl backdrop-blur-sm">
            <Activity className="text-blue-400 animate-pulse" size={44} />
          </div>
        </div>
        <h2 className="text-center text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          NER-LIFELINE
        </h2>
        <p className="mt-2 text-center text-xs text-blue-300 font-semibold tracking-wider uppercase">
          Department of Smart Logistics & Accessibility
        </p>
        <p className="mt-1 text-center text-xs text-slate-400 max-w-xs mx-auto">
          AI-Driven Emergency Response & Logistics Platform
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:px-10 border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400"></div>

          {/* Firebase Status Badge */}
          <div className="mb-5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-xs">
            <span className="text-slate-400">Auth Engine:</span>
            {isFirebaseConfigured ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <CheckCircle2 size={13} />
                <span>Firebase Live</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 font-medium" title="Configure VITE_FIREBASE_API_KEY in .env for live project">
                <span>Demo OAuth Ready</span>
              </span>
            )}
          </div>

          {(errorMsg || authError) && (
            <div className="mb-5 flex items-start space-x-2 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg || authError}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
              Select Operational Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {roleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 border rounded-xl text-xs font-semibold transition-all ${
                    role === opt.id
                      ? 'bg-blue-600/25 border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Google OAuth Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-slate-600 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {/* Google SVG Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.32 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isSubmitting ? 'Authenticating...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-medium">or official credentials</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${role}@ner-lifeline.gov.in`}
                className="block w-full px-3.5 py-2.5 border border-slate-600 rounded-lg bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1">
                Security Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 border border-slate-600 rounded-lg bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Verifying...' : 'Authorize Access'}
            </button>
          </form>

          <div className="mt-5 text-center text-[11px] text-slate-500 border-t border-slate-700/60 pt-3">
            NER-LIFELINE Gov Protocol • OAuth 2.0 via Firebase
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
