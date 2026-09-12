import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Truck, 
  Building, 
  Activity, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  UserCheck, 
  ArrowRight, 
  Lock, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Radio,
  Compass,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import nerMountainBg from '../assets/ner-mountain-bg.jpg';
import GoogleAccountChooserModal from '../components/auth/GoogleAccountChooserModal';

const GoogleIcon = ({ invert = false }) => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
);

const ADMIN_ROLE = {
  id: 'admin',
  title: 'Sovereign Directorate & Apex Administration',
  subtitle: 'Apex Command Authority • Zero-Trust Access Governance • LoRa Mesh Telemetry Gateways',
  badge: 'APEX GOVERNANCE • CENTRAL DIRECTORATE',
  icon: Shield,
  features: [
    'Zero-Trust RBAC Governance & Cryptographic Overrides',
    'Hardware LoRa Mesh Telemetry & Gateway Routing',
    'MoRTH VAHAN & Supabase Dual-Engine Replication',
    'Sovereign Security Audit Logs & Emergency Dispatch'
  ],
  actionTitle: 'Authenticate Administrator (Google SSO)',
  dashboardRoute: '/admin-dashboard',
  targetPortal: 'Apex Directorate Command Console'
};

const COMPACT_ROLE_CARDS = [
  {
    id: 'normal_driver',
    title: 'Commercial Fleet Operator',
    subtitle: 'Interstate Freight, Heavy Cargo & Transit',
    badge: 'COMMERCIAL SSO',
    accentColor: 'emerald',
    icon: Truck,
    gradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    lightBorder: 'border-emerald-200 hover:border-emerald-400',
    btnBg: 'bg-white hover:bg-emerald-50 text-slate-900 border-emerald-300',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    lightBadgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerIconColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
    lightHeaderIconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]',
    actionTitle: 'Authorize Fleet Operator',
    dashboardRoute: '/driver-dashboard',
    targetPortal: 'Commercial Telemetry Terminal'
  },
  {
    id: 'emergency_driver',
    title: 'Critical Relief Convoy Pilot',
    subtitle: 'Cryogenic Oxygen, Blood Plasma & Tactical 4x4',
    badge: 'PRIORITY CONVOY',
    accentColor: 'teal',
    icon: Compass,
    gradient: 'from-teal-950/40 via-slate-900 to-slate-950',
    border: 'border-teal-500/30 hover:border-teal-400',
    lightBorder: 'border-teal-200 hover:border-teal-400',
    btnBg: 'bg-white hover:bg-teal-50 text-slate-900 border-teal-300',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    lightBadgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
    headerIconColor: 'text-teal-400 bg-teal-950/60 border-teal-700/50',
    lightHeaderIconColor: 'text-teal-700 bg-teal-50 border-teal-200',
    glow: 'hover:shadow-[0_0_25px_rgba(20,184,166,0.18)]',
    actionTitle: 'Authorize Convoy Pilot',
    dashboardRoute: '/driver-dashboard',
    targetPortal: 'Tactical Convoy Cockpit'
  },
  {
    id: 'field_officer',
    title: 'Disaster Reconnaissance Officer',
    subtitle: 'Geological Hazard & Sinking Zone Assessment',
    badge: 'TACTICAL RECON',
    accentColor: 'amber',
    icon: Users,
    gradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    border: 'border-amber-500/30 hover:border-amber-400',
    lightBorder: 'border-amber-200 hover:border-amber-400',
    btnBg: 'bg-white hover:bg-amber-50 text-slate-900 border-amber-300',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    lightBadgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    headerIconColor: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
    lightHeaderIconColor: 'text-amber-700 bg-amber-50 border-amber-200',
    glow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.18)]',
    actionTitle: 'Authorize Recon Officer',
    dashboardRoute: '/field-officer',
    targetPortal: 'Ground Assessment Terminal'
  },
  {
    id: 'logistics_manager',
    title: 'Regional Logistics Director',
    subtitle: 'Strategic Depots & Interstate Allocations',
    badge: 'CENTRAL DISPATCH',
    accentColor: 'cyan',
    icon: Building,
    gradient: 'from-cyan-950/40 via-slate-900 to-slate-950',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    lightBorder: 'border-cyan-200 hover:border-cyan-400',
    btnBg: 'bg-white hover:bg-cyan-50 text-slate-900 border-cyan-300',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    lightBadgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    headerIconColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50',
    lightHeaderIconColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    glow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.18)]',
    actionTitle: 'Authorize Logistics Director',
    dashboardRoute: '/manager-dashboard',
    targetPortal: 'Supply Chain Command Terminal'
  }
];

const Login = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, selectGoogleAccount, loginWithEmail, authError, saveFirebaseConfig } = useAuth();
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  
  const [selectedRole, setSelectedRole] = useState('driver');
  const [submittingRole, setSubmittingRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // In-app config state for Firebase
  const [cfgApiKey, setCfgApiKey] = useState('');
  const [cfgAuthDomain, setCfgAuthDomain] = useState('');
  const [cfgProjectId, setCfgProjectId] = useState('');

  const getDashboardRoute = (targetRole) => {
    switch (targetRole) {
      case 'admin':
        return '/admin-dashboard';
      case 'driver':
      case 'normal_driver':
      case 'emergency_driver':
        return '/driver-dashboard';
      case 'field_officer':
        return '/field-officer';
      case 'logistics_manager':
        return '/manager-dashboard';
      default:
        return '/driver-dashboard';
    }
  };

  const handleRoleGoogleSignIn = async (roleId) => {
    setErrorMsg('');
    const effectiveRole = (roleId === 'normal_driver' || roleId === 'emergency_driver') ? 'driver' : roleId;
    setSelectedRole(roleId);
    setSubmittingRole(roleId);

    try {
      const res = await loginWithGoogle(effectiveRole);
      if (res?.needAccountSelection) {
        setShowAccountChooser(true);
      } else if (res?.success) {
        navigate(getDashboardRoute(effectiveRole));
      }
    } catch (err) {
      console.error('Google Sign-in Exception for role', roleId, err);
      setErrorMsg(err.message || `Google sign-in encountered an issue for ${roleId}.`);
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleAccountChosen = (account) => {
    const effectiveRole = (selectedRole === 'normal_driver' || selectedRole === 'emergency_driver') ? 'driver' : selectedRole;
    selectGoogleAccount(account, effectiveRole);
    setShowAccountChooser(false);
    navigate(getDashboardRoute(effectiveRole));
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmittingEmail(true);
    try {
      await loginWithEmail(email, password, selectedRole);
      navigate(getDashboardRoute(selectedRole));
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (!cfgApiKey || !cfgProjectId) return;
    saveFirebaseConfig({
      apiKey: cfgApiKey.trim(),
      authDomain: cfgAuthDomain.trim() || `${cfgProjectId.trim()}.firebaseapp.com`,
      projectId: cfgProjectId.trim(),
    });
    setShowConfigModal(false);
  };

  return (
    <div 
      className={`min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-100'
      }`}
      style={{
        backgroundImage: `url(${nerMountainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Atmospheric overlay: split into color base + gradient fade for proper layering */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
          isDark ? 'bg-slate-950/60' : 'bg-white/50'
        }`} 
      />
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 backdrop-blur-[1.5px] ${
          isDark 
            ? 'bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/75' 
            : 'bg-gradient-to-b from-white/70 via-slate-100/45 to-white/70'
        }`} 
      />

      {/* Ambient glow accents (above overlay, below content) */}
      <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-[1] animate-pulse ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/15'}`} />
      <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none z-[1] ${isDark ? 'bg-purple-600/15' : 'bg-purple-400/10'}`} />

      {/* Top Utility Bar: NavIC Status & Light/Dark Theme Switcher */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 mb-4 relative z-20">
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className={`font-mono font-bold tracking-wider text-[11px] sm:text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            NAVIC L5 TELEMETRY • MISSION ACTIVE
          </span>
        </div>

        {/* Theme Switcher Toggle Pill */}
        <div className={`flex items-center p-1 rounded-full border shadow-lg backdrop-blur-md transition-all ${
          isDark 
            ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/60' 
            : 'bg-white/95 border-slate-300 shadow-slate-300/60'
        }`}>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isDark 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Dark Mode (Night Telemetry)"
          >
            <Moon size={13} className={isDark ? 'text-cyan-200' : 'text-slate-500'} />
            <span>Dark Tactical</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              !isDark 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
            title="Light Mode (Daytime Navigation)"
          >
            <Sun size={13} className={!isDark ? 'text-amber-100' : 'text-slate-400'} />
            <span>Light Alpine</span>
          </button>
        </div>
      </div>

      {/* Google Account Selection Modal */}
      <GoogleAccountChooserModal
        isOpen={showAccountChooser}
        onClose={() => setShowAccountChooser(false)}
        onSelectAccount={handleAccountChosen}
        selectedRole={selectedRole}
      />

      {/* Firebase Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center space-x-2 text-blue-400">
                <Key size={18} />
                <h3 className="font-bold text-sm">Firebase Live Credentials</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-3 mb-4 leading-relaxed">
              Firebase keys from <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 border border-slate-800">.env</code> are active. You can customize them if needed:
            </p>
            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">API Key</label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={cfgApiKey}
                  onChange={(e) => setCfgApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project ID</label>
                <input
                  type="text"
                  required
                  placeholder="ner-l-b0ef4"
                  value={cfgProjectId}
                  onChange={(e) => setCfgProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Auth Domain (optional)</label>
                <input
                  type="text"
                  placeholder="ner-l-b0ef4.firebaseapp.com"
                  value={cfgAuthDomain}
                  onChange={(e) => setCfgAuthDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-xs text-white cursor-pointer"
                >
                  Save & Reload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="w-full max-w-6xl mx-auto text-center mb-6 relative z-10">
        <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-inner mb-3 transition-colors ${
          isDark 
            ? 'bg-blue-950/80 border border-blue-600/40 text-blue-300' 
            : 'bg-blue-50/90 border border-blue-300 text-blue-950 shadow-sm'
        }`}>
          <Activity size={14} className="animate-pulse text-blue-500" />
          <span>GOVERNMENT OF INDIA • MINISTRY OF ROAD TRANSPORT & HIGHWAYS • NDMA</span>
        </div>
        
        <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md transition-colors ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          NER-LIFELINE
        </h1>
        <p className={`mt-1 text-sm sm:text-base font-bold max-w-2xl mx-auto transition-colors ${
          isDark ? 'text-blue-300' : 'text-blue-800'
        }`}>
          Autonomous Resilient Logistics & High-Risk Mountain Route Navigation Infrastructure
        </p>
        <p className={`mt-1 text-xs max-w-xl mx-auto transition-colors ${
          isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
        }`}>
          Sovereign Multi-Agency Mission Console for Emergency Logistics, Terrain Vulnerability Assessment, and Inter-State Convoy Coordination across the North Eastern Region.
        </p>
      </div>

      {/* Global Error Banner */}
      {(errorMsg || authError) && (
        <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-red-950/80 border border-red-800/80 text-red-200 rounded-2xl text-xs shadow-xl space-y-2.5 relative z-10">
          <div className="flex items-start space-x-2.5">
            <AlertCircle size={18} className="flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-300">Identity Provider & Authentication Exception</p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{errorMsg || authError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountChooser(true)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-900/60 hover:bg-red-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-red-700/60"
          >
            <UserCheck size={14} />
            <span>Open Enterprise Directory (IdP) for {selectedRole.toUpperCase().replace('_', ' ')}</span>
          </button>
        </div>
      )}

      {/* 1. PRIMARY: LARGE PROMINENT ADMINISTRATOR SOVEREIGN DIRECTORATE HERO (BIG) */}
      <div className="w-full max-w-6xl mx-auto mb-8 relative z-10">
        <div className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden transition-all duration-300 backdrop-blur-md ${
          isDark
            ? 'bg-gradient-to-r from-purple-950/85 via-slate-900/90 to-indigo-950/85 border-2 border-purple-500/60 shadow-[0_0_60px_rgba(168,85,247,0.25)]'
            : 'bg-gradient-to-r from-purple-50/85 via-white/88 to-indigo-50/85 border-2 border-purple-400/80 shadow-[0_15px_45px_rgba(147,51,234,0.15)]'
        }`}>
          {/* Ambient Glows */}
          <div className={`absolute -right-10 -bottom-10 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
            isDark ? 'bg-purple-600/15' : 'bg-purple-300/30'
          }`} />
          <div className={`absolute -left-10 -top-10 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            isDark ? 'bg-indigo-600/15' : 'bg-indigo-300/30'
          }`} />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-5 max-w-3xl">
              <div className={`p-4 sm:p-5 border-2 rounded-3xl flex-shrink-0 shadow-xl transition-colors ${
                isDark 
                  ? 'bg-purple-500/20 border-purple-400/60 text-purple-300 shadow-purple-500/30' 
                  : 'bg-purple-100 border-purple-400 text-purple-800 shadow-purple-200'
              }`}>
                <Shield size={44} className="animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-black px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white tracking-widest uppercase shadow-md flex items-center space-x-1.5">
                    <Sparkles size={13} className="text-yellow-300" />
                    <span>APEX GOVERNANCE • CENTRAL DIRECTORATE</span>
                  </span>
                  <span className={`text-xs font-semibold flex items-center space-x-1 ${
                    isDark ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    <span>Sovereign Directorate & Strategic Command Authority</span>
                  </span>
                </div>

                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Sovereign Directorate & Apex Command Console
                </h2>
                <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Supreme administrative authority for North Eastern emergency logistics infrastructure: orchestrate multi-jurisdictional fleet dispatches, enforce zero-trust RBAC protocols, monitor resilient LoRa hardware mesh telemetry, supervise MoRTH VAHAN & Supabase replication, and audit cryptographic security registers.
                </p>

                {/* Key Admin Capability Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 text-xs">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border shadow-sm ${
                    isDark 
                      ? 'bg-slate-950/80 border-purple-500/30 text-slate-200' 
                      : 'bg-white/90 border-purple-200 text-slate-800'
                  }`}>
                    <Shield size={14} className="text-purple-500 flex-shrink-0" />
                    <span className="font-semibold truncate">Zero-Trust RBAC Policy</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border shadow-sm ${
                    isDark 
                      ? 'bg-slate-950/80 border-purple-500/30 text-slate-200' 
                      : 'bg-white/90 border-purple-200 text-slate-800'
                  }`}>
                    <Radio size={14} className="text-cyan-500 flex-shrink-0" />
                    <span className="font-semibold truncate">Resilient LoRa Gateways</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border shadow-sm ${
                    isDark 
                      ? 'bg-slate-950/80 border-purple-500/30 text-slate-200' 
                      : 'bg-white/90 border-purple-200 text-slate-800'
                  }`}>
                    <Activity size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="font-semibold truncate">VAHAN & Supabase Sync</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border shadow-sm ${
                    isDark 
                      ? 'bg-slate-950/80 border-purple-500/30 text-slate-200' 
                      : 'bg-white/90 border-purple-200 text-slate-800'
                  }`}>
                    <Key size={14} className="text-amber-500 flex-shrink-0" />
                    <span className="font-semibold truncate">Cryptographic Registry</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Admin Google Sign In Button */}
            <div className="w-full lg:w-auto flex flex-col items-center lg:items-end flex-shrink-0 space-y-2.5">
              <button
                type="button"
                onClick={() => handleRoleGoogleSignIn(ADMIN_ROLE.id)}
                disabled={submittingRole === ADMIN_ROLE.id}
                className={`w-full sm:w-auto px-8 py-4 sm:py-5 font-black text-sm sm:text-base rounded-2xl shadow-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98] cursor-pointer group ${
                  isDark
                    ? 'bg-white hover:bg-purple-50 text-slate-950 border-2 border-purple-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.4)]'
                    : 'bg-purple-950 hover:bg-purple-900 text-white border-2 border-purple-900 hover:shadow-[0_10px_30px_rgba(88,28,135,0.3)]'
                }`}
              >
                {submittingRole === ADMIN_ROLE.id ? (
                  <div className="flex items-center space-x-2 py-0.5">
                    <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-slate-900' : 'border-white'}`} />
                    <span>Authorizing Apex Directorate...</span>
                  </div>
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="tracking-wide">{ADMIN_ROLE.actionTitle}</span>
                    <ArrowRight size={18} className={`group-hover:translate-x-1 transition-transform ${isDark ? 'text-slate-900' : 'text-white'}`} />
                  </>
                )}
              </button>

              <span className={`text-xs font-medium text-center lg:text-right ${
                isDark ? 'text-purple-300/90' : 'text-purple-900'
              }`}>
                Instant Enterprise SSO • Establishes Sovereign Directorate Session
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY: COMPACT FIELD, FLEET & CIVILIAN OPERATIONAL LOGINS (REST SMALL) */}
      <div className="w-full max-w-6xl mx-auto mb-8 relative z-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <Radio size={13} className="text-blue-500 animate-pulse" />
            <span>Tactical Field Reconnaissance, Relief Convoys & Commercial Terminals</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountChooser(true)}
            className={`text-xs underline decoration-dotted cursor-pointer flex items-center space-x-1 ${
              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <UserCheck size={12} />
            <span>Enterprise Identity Directory (IdP)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {COMPACT_ROLE_CARDS.map((role) => {
            const Icon = role.icon;
            const isCurrentSubmitting = submittingRole === role.id;

            return (
              <div
                key={role.id}
                className={`group relative rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-md ${
                  isDark
                    ? `bg-gradient-to-b ${role.gradient} border ${role.border} ${role.glow}`
                    : `bg-white/90 backdrop-blur-sm border ${role.lightBorder} shadow-slate-200/50 hover:shadow-lg`
                }`}
              >
                {/* Top Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg border ${
                      isDark ? role.headerIconColor : role.lightHeaderIconColor
                    }`}>
                      <Icon size={16} />
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide ${
                      isDark ? role.badgeBg : role.lightBadgeBg
                    }`}>
                      {role.badge}
                    </span>
                  </div>

                  <h3 className={`text-sm font-bold transition-colors ${
                    isDark ? 'text-white group-hover:text-blue-300' : 'text-slate-900 group-hover:text-blue-600'
                  }`}>
                    {role.title}
                  </h3>
                  <p className={`text-[11px] line-clamp-1 mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {role.subtitle}
                  </p>
                </div>

                {/* Compact Button */}
                <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => handleRoleGoogleSignIn(role.id)}
                    disabled={isCurrentSubmitting}
                    className={`w-full flex items-center justify-between py-2 px-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 ${
                      isDark
                        ? role.btnBg
                        : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:shadow-md'
                    }`}
                  >
                    {isCurrentSubmitting ? (
                      <div className="w-full flex items-center justify-center space-x-1.5 py-0.5">
                        <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-slate-700' : 'border-white'}`} />
                        <span className={`text-[11px] font-bold ${isDark ? 'text-slate-800' : 'text-white'}`}>Authenticating...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <GoogleIcon />
                          <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-900' : 'text-white'}`}>{role.actionTitle}</span>
                        </div>
                        <ArrowRight size={13} className={`flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} />
                      </>
                    )}
                  </button>

                  <div className={`text-[9px] text-center mt-1.5 truncate ${
                    isDark ? 'text-slate-500' : 'text-slate-500 font-medium'
                  }`}>
                    {role.targetPortal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALTERNATIVE OFFICIAL EMAIL & PASSWORD LOGIN (COLLAPSIBLE) */}
      <div className="w-full max-w-2xl mx-auto mb-6 relative z-10">
        <div className={`rounded-2xl overflow-hidden shadow-xl transition-colors ${
          isDark 
            ? 'bg-slate-900/90 border border-slate-800' 
            : 'bg-white/95 border border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className={`w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-transparent ${
              isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Lock size={15} className="text-blue-500" />
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  National Informatics Centre (NIC) / Departmental Directory (.gov.in)
                </p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  For commissioned officers authenticating via Gov-Domain Enterprise LDAP Directory
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>{showEmailForm ? 'Hide Directory Form' : 'Expand Directory Form'}</span>
              {showEmailForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showEmailForm && (
            <div className={`p-5 border-t ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/70'
            }`}>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assigned Mission Designation
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 ${
                        isDark 
                          ? 'bg-slate-900 border border-slate-700 text-white' 
                          : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="driver">Critical Relief Convoy Pilot</option>
                      <option value="field_officer">Disaster Reconnaissance Field Officer</option>
                      <option value="logistics_manager">Regional Emergency Logistics Director</option>
                      <option value="admin">Sovereign Directorate System Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Official Enterprise Email (.gov.in)
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`${selectedRole}@ner-lifeline.gov.in`}
                        className={`w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 ${
                          isDark 
                            ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500' 
                            : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cryptographic Passphrase / Security Token
                  </label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 ${
                        isDark 
                          ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500' 
                          : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Direct routing to {getDashboardRoute(selectedRole)}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingEmail}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingEmail ? 'Authenticating...' : `Authorize Session as ${selectedRole.toUpperCase().replace('_', ' ')}`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer Security Badges & Protocols */}
      <div className={`w-full max-w-6xl mx-auto border-t pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2 relative z-10 ${
        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-300 text-slate-600 font-medium'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Compass size={12} className="text-blue-500" />
            <span>Sovereign Indian GIS (Bharat Maps & NIC)</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Radio size={12} className="text-emerald-500" />
            <span>NavIC L5 / AIS-140 Compliant</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>Zero-Trust Role Isolation Active</span>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className={`underline cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Firebase Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
