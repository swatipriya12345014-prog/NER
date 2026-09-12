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
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleAccountChooserModal from '../components/auth/GoogleAccountChooserModal';

const GoogleIcon = () => (
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
  title: 'System Administrator & Sovereign Directorate',
  subtitle: 'Central Command Authority • Full Zero-Trust Access Governance • LoRa Mesh Gateways',
  badge: 'CENTRAL DIRECTORATE • FULL SYSTEM ACCESS',
  icon: Shield,
  features: [
    'Zero-Trust RBAC Governance & Cryptographic Overrides',
    'Hardware LoRa Mesh Telemetry & Gateway Routing',
    'MoRTH VAHAN & Supabase Dual-Engine Replication',
    'Sovereign Security Audit Logs & Emergency Dispatch'
  ],
  actionTitle: 'Sign in as Administrator with Google',
  dashboardRoute: '/admin-dashboard',
  targetPortal: 'Executive Directorate Command Center'
};

const COMPACT_ROLE_CARDS = [
  {
    id: 'normal_driver',
    title: 'Normal Driver',
    subtitle: 'Commercial Freight, Trucks & Cabs',
    badge: 'GOOGLE ONLY',
    accentColor: 'emerald',
    icon: Truck,
    gradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    btnBg: 'bg-white hover:bg-emerald-50 text-slate-900 border-emerald-300',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    headerIconColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
    glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]',
    actionTitle: 'Sign in as Driver',
    dashboardRoute: '/driver-dashboard',
    targetPortal: 'Commercial Driver Cockpit'
  },
  {
    id: 'emergency_driver',
    title: 'Convoy Pilot',
    subtitle: 'Oxygen Tankers & Medical 4x4',
    badge: 'OFFICIAL CONVOY',
    accentColor: 'teal',
    icon: Compass,
    gradient: 'from-teal-950/40 via-slate-900 to-slate-950',
    border: 'border-teal-500/30 hover:border-teal-400',
    btnBg: 'bg-white hover:bg-teal-50 text-slate-900 border-teal-300',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    headerIconColor: 'text-teal-400 bg-teal-950/60 border-teal-700/50',
    glow: 'hover:shadow-[0_0_25px_rgba(20,184,166,0.18)]',
    actionTitle: 'Sign in as Pilot',
    dashboardRoute: '/driver-dashboard',
    targetPortal: 'Emergency Tactical Cockpit'
  },
  {
    id: 'field_officer',
    title: 'Field Officer',
    subtitle: 'Landslides & Sinking Zones',
    badge: 'GROUND COMMAND',
    accentColor: 'amber',
    icon: Users,
    gradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    border: 'border-amber-500/30 hover:border-amber-400',
    btnBg: 'bg-white hover:bg-amber-50 text-slate-900 border-amber-300',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    headerIconColor: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
    glow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.18)]',
    actionTitle: 'Sign in as Officer',
    dashboardRoute: '/field-officer',
    targetPortal: 'Field Ground Command'
  },
  {
    id: 'logistics_manager',
    title: 'Logistics Manager',
    subtitle: 'Regional Depots & Supply Chains',
    badge: 'HQ DISPATCH',
    accentColor: 'cyan',
    icon: Building,
    gradient: 'from-cyan-950/40 via-slate-900 to-slate-950',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    btnBg: 'bg-white hover:bg-cyan-50 text-slate-900 border-cyan-300',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    headerIconColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50',
    glow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.18)]',
    actionTitle: 'Sign in as Manager',
    dashboardRoute: '/manager-dashboard',
    targetPortal: 'HQ Logistics Command'
  }
];

const Login = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, selectGoogleAccount, loginWithEmail, authError, saveFirebaseConfig } = useAuth();
  
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-950 to-slate-950 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

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
      <div className="w-full max-w-6xl mx-auto text-center mb-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-600/40 text-blue-300 text-xs font-bold tracking-widest uppercase shadow-inner mb-3">
          <Activity size={14} className="animate-pulse text-blue-400" />
          <span>Government of India • Ministry of Road Transport & Highways & NDMA</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
          NER-LIFELINE
        </h1>
        <p className="mt-1 text-sm sm:text-base font-semibold text-blue-300 max-w-2xl mx-auto">
          AI-Powered Smart Logistics & Emergency Route Navigation System
        </p>
        <p className="mt-1 text-xs text-slate-400 max-w-xl mx-auto">
          Dedicated, role-isolated operational access for emergency crews across Assam, Arunachal Pradesh, Meghalaya, Sikkim, Nagaland, Manipur, Mizoram & Tripura.
        </p>
      </div>

      {/* Global Error Banner */}
      {(errorMsg || authError) && (
        <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-red-950/80 border border-red-800/80 text-red-200 rounded-2xl text-xs shadow-xl space-y-2.5">
          <div className="flex items-start space-x-2.5">
            <AlertCircle size={18} className="flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-300">Authentication Alert</p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{errorMsg || authError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountChooser(true)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-900/60 hover:bg-red-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-red-700/60"
          >
            <UserCheck size={14} />
            <span>Open Google Account Selector Directly for {selectedRole.toUpperCase().replace('_', ' ')}</span>
          </button>
        </div>
      )}

      {/* 1. PRIMARY: LARGE PROMINENT ADMINISTRATOR SOVEREIGN DIRECTORATE HERO (BIG) */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/95 via-slate-900 to-indigo-950/95 border-2 border-purple-500/60 p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.25)] overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-5 max-w-3xl">
              <div className="p-4 sm:p-5 bg-purple-500/20 border-2 border-purple-400/60 rounded-3xl text-purple-300 flex-shrink-0 shadow-xl shadow-purple-500/30">
                <Shield size={44} className="animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-black px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white tracking-widest uppercase shadow-md flex items-center space-x-1.5">
                    <Sparkles size={13} className="text-yellow-300" />
                    <span>PRIMARY ACCESS • SYSTEM ADMINISTRATOR</span>
                  </span>
                  <span className="text-xs text-purple-300 font-semibold flex items-center space-x-1">
                    <span>Sovereign Directorate & Full System Authority</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  System Administrator Command Portal
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Central sovereign governance console for North Eastern disaster logistics: oversee full-spectrum emergency fleet dispatches, zero-trust RBAC permissions, live LoRa mesh hardware telemetry, Supabase database replication, and cryptographic security overrides.
                </p>

                {/* Key Admin Capability Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 text-xs text-slate-200">
                  <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-purple-500/30 shadow-sm">
                    <Shield size={14} className="text-purple-400 flex-shrink-0" />
                    <span className="font-semibold truncate">Zero-Trust RBAC</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-purple-500/30 shadow-sm">
                    <Radio size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="font-semibold truncate">LoRa Mesh Control</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-purple-500/30 shadow-sm">
                    <Activity size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="font-semibold truncate">VAHAN & Supabase</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-purple-500/30 shadow-sm">
                    <Key size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="font-semibold truncate">Sovereign Crypto</span>
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
                className="w-full sm:w-auto px-8 py-4 sm:py-5 bg-white hover:bg-purple-50 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98] cursor-pointer border-2 border-purple-300 group hover:shadow-[0_0_35px_rgba(168,85,247,0.4)]"
              >
                {submittingRole === ADMIN_ROLE.id ? (
                  <div className="flex items-center space-x-2 py-0.5">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Authorizing Administrator...</span>
                  </div>
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="tracking-wide">{ADMIN_ROLE.actionTitle}</span>
                    <ArrowRight size={18} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <span className="text-xs text-purple-300/90 font-medium text-center lg:text-right">
                Instant 1-Tap Google Login • Opens Sovereign Admin Directorate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY: COMPACT FIELD, FLEET & CIVILIAN OPERATIONAL LOGINS (REST SMALL) */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Radio size={13} className="text-blue-400 animate-pulse" />
            <span>Field Operations, Convoy Pilots & Civilian Drivers (Quick Google Access)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountChooser(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline decoration-dotted cursor-pointer flex items-center space-x-1"
          >
            <UserCheck size={12} />
            <span>Authorized Accounts</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {COMPACT_ROLE_CARDS.map((role) => {
            const Icon = role.icon;
            const isCurrentSubmitting = submittingRole === role.id;

            return (
              <div
                key={role.id}
                className={`group relative rounded-xl bg-gradient-to-b ${role.gradient} border ${role.border} p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 ${role.glow} hover:-translate-y-0.5 shadow-md`}
              >
                {/* Top Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg border ${role.headerIconColor}`}>
                      <Icon size={16} />
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${role.badgeBg} tracking-wide`}>
                      {role.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                    {role.subtitle}
                  </p>
                </div>

                {/* Compact Button */}
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleRoleGoogleSignIn(role.id)}
                    disabled={isCurrentSubmitting}
                    className={`w-full flex items-center justify-between py-2 px-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 ${role.btnBg}`}
                  >
                    {isCurrentSubmitting ? (
                      <div className="w-full flex items-center justify-center space-x-1.5 py-0.5">
                        <div className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-bold text-slate-800">Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <GoogleIcon />
                          <span className="text-xs font-bold text-slate-900 truncate">{role.actionTitle}</span>
                        </div>
                        <ArrowRight size={13} className="text-slate-500 flex-shrink-0" />
                      </>
                    )}
                  </button>

                  <div className="text-[9px] text-center text-slate-500 mt-1.5 truncate">
                    {role.targetPortal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALTERNATIVE OFFICIAL EMAIL & PASSWORD LOGIN (COLLAPSIBLE) */}
      <div className="w-full max-w-2xl mx-auto mb-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer border-b border-transparent"
          >
            <div className="flex items-center space-x-2.5">
              <Lock size={15} className="text-blue-400" />
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Departmental Credentials Login (.gov.in)
                </p>
                <p className="text-[11px] text-slate-400">
                  For officers authenticating via official emergency service email & security password
                </p>
              </div>
            </div>
            <div className="text-slate-400 flex items-center space-x-1 text-xs">
              <span>{showEmailForm ? 'Hide Form' : 'Show Form'}</span>
              {showEmailForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showEmailForm && (
            <div className="p-5 border-t border-slate-800 bg-slate-950/60">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="driver">Emergency Driver (Convoy Pilot)</option>
                      <option value="field_officer">Disaster Response Field Officer</option>
                      <option value="logistics_manager">Emergency Logistics Manager</option>
                      <option value="admin">System & Security Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Official Email Address
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`${selectedRole}@ner-lifeline.gov.in`}
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Key / Password
                  </label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Direct access to {getDashboardRoute(selectedRole)}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingEmail}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingEmail ? 'Authenticating...' : `Authorize as ${selectedRole.toUpperCase().replace('_', ' ')}`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer Security Badges & Protocols */}
      <div className="w-full max-w-6xl mx-auto border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Compass size={12} className="text-blue-400" />
            <span>Sovereign Indian GIS (Bharat Maps & NIC)</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Radio size={12} className="text-emerald-400" />
            <span>NavIC L5 / AIS-140 Compliant</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>Zero-Trust Role Isolation Active</span>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Firebase Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
