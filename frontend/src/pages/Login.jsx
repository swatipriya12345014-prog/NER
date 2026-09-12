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

const ROLE_CARDS = [
  {
    id: 'driver',
    title: 'Emergency Driver',
    subtitle: 'Highland Fleet & Convoy Pilot',
    badge: 'CONVOY PILOT',
    accentColor: 'emerald',
    icon: Truck,
    gradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    btnBg: 'bg-white hover:bg-emerald-50 text-slate-900 border-emerald-300',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    headerIconColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
    glow: 'hover:shadow-[0_0_35px_rgba(16,185,129,0.18)]',
    description: 'Vehicle telematics, offline mountain highway caches, rockfall alerts & one-touch SOS.',
    features: [
      'Live 3D NavIC GPS & Bearing Guide',
      'Zero-Network Offline Route Cache',
      'Emergency SOS & Relief Shuttles',
      'Mountain Fuel & Tank Range Math'
    ],
    actionTitle: 'Sign in as Driver',
    dashboardRoute: '/driver-dashboard',
    targetPortal: 'Driver Problem & Navigation Portal'
  },
  {
    id: 'field_officer',
    title: 'Field Officer',
    subtitle: 'Ground Disaster Assessment',
    badge: 'GROUND COMMAND',
    accentColor: 'amber',
    icon: Users,
    gradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    border: 'border-amber-500/30 hover:border-amber-400',
    btnBg: 'bg-white hover:bg-amber-50 text-slate-900 border-amber-300',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    headerIconColor: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
    glow: 'hover:shadow-[0_0_35px_rgba(245,158,11,0.18)]',
    description: 'Landslide intake, bridge inspection logs, Sela & Sonapur pass monitoring & ground dispatches.',
    features: [
      'Live Road Blockage Intake Form',
      'Sinking Zone & Bridge Verifier',
      'Forward Unit Dispatch & Routing',
      'Offline Incident Reporting Queue'
    ],
    actionTitle: 'Sign in as Field Officer',
    dashboardRoute: '/field-officer',
    targetPortal: 'Field Officer Ground Command'
  },
  {
    id: 'logistics_manager',
    title: 'Logistics Manager',
    subtitle: 'Regional Relief HQ & Supply Chains',
    badge: 'HQ DISPATCH',
    accentColor: 'cyan',
    icon: Building,
    gradient: 'from-cyan-950/40 via-slate-900 to-slate-950',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    btnBg: 'bg-white hover:bg-cyan-50 text-slate-900 border-cyan-300',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    headerIconColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50',
    glow: 'hover:shadow-[0_0_35px_rgba(6,182,212,0.18)]',
    description: 'Interstate relief convoys, oxygen/plasma manifests, monsoon risk analysis & depot stockpiles.',
    features: [
      'Interstate Convoy Fleet Allocator',
      'Cold-Chain & Oxygen Manifests',
      'Dynamic Monsoon & Risk Scoring',
      'State-Level Depot Stock Matrix'
    ],
    actionTitle: 'Sign in as Manager',
    dashboardRoute: '/manager-dashboard',
    targetPortal: 'Logistics Command & Fleet Operations'
  },
  {
    id: 'admin',
    title: 'Administrator',
    subtitle: 'Sovereign Directorate & Governance',
    badge: 'DIRECTORATE',
    accentColor: 'purple',
    icon: Shield,
    gradient: 'from-purple-950/40 via-slate-900 to-slate-950',
    border: 'border-purple-500/30 hover:border-purple-400',
    btnBg: 'bg-white hover:bg-purple-50 text-slate-900 border-purple-300',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    headerIconColor: 'text-purple-400 bg-purple-950/60 border-purple-700/50',
    glow: 'hover:shadow-[0_0_35px_rgba(168,85,247,0.18)]',
    description: 'Zero-trust role governance, LoRa hardware mesh telemetry, Supabase sync & cryptographic keys.',
    features: [
      'Zero-Trust RBAC Role Governance',
      'Hardware LoRa Mesh Gateways',
      'MoRTH VAHAN & Supabase Sync',
      'Audit Logs & Sovereign Crypto'
    ],
    actionTitle: 'Sign in as Admin',
    dashboardRoute: '/admin-dashboard',
    targetPortal: 'Executive Governance & System Directorate'
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
        return '/driver-dashboard';
      case 'field_officer':
        return '/field-officer';
      case 'logistics_manager':
        return '/manager-dashboard';
      default:
        return '/admin-dashboard';
    }
  };

  const handleRoleGoogleSignIn = async (roleId) => {
    setErrorMsg('');
    setSelectedRole(roleId);
    setSubmittingRole(roleId);

    try {
      const res = await loginWithGoogle(roleId);
      if (res?.needAccountSelection) {
        setShowAccountChooser(true);
      } else if (res?.success) {
        navigate(getDashboardRoute(roleId));
      }
    } catch (err) {
      console.error('Google Sign-in Exception for role', roleId, err);
      setErrorMsg(err.message || `Google sign-in encountered an issue for ${roleId}.`);
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleAccountChosen = (account) => {
    selectGoogleAccount(account, selectedRole);
    setShowAccountChooser(false);
    navigate(getDashboardRoute(selectedRole));
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

      {/* 4 INDIVIDUAL GOOGLE SIGN-IN ROLE CARDS (GRID) */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span>Select Individual Role to Continue with Google</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAccountChooser(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline decoration-dotted cursor-pointer flex items-center space-x-1"
          >
            <UserCheck size={13} />
            <span>Choose from Authorized Accounts</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {ROLE_CARDS.map((role) => {
            const Icon = role.icon;
            const isCurrentSubmitting = submittingRole === role.id;

            return (
              <div
                key={role.id}
                className={`group relative rounded-2xl bg-gradient-to-b ${role.gradient} border ${role.border} p-5 flex flex-col justify-between transition-all duration-300 ${role.glow} hover:-translate-y-1 shadow-lg`}
              >
                {/* Top Role Header */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${role.headerIconColor} shadow-inner`}>
                      <Icon size={22} />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${role.badgeBg} tracking-wide`}>
                      {role.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mb-3">
                    {role.subtitle}
                  </p>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-4 min-h-[38px]">
                    {role.description}
                  </p>

                  {/* Bullet Highlights */}
                  <div className="space-y-1.5 mb-5 border-t border-slate-800/80 pt-3">
                    {role.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                        <CheckCircle2 size={12} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Role Google Sign In Button */}
                <div className="mt-auto space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleRoleGoogleSignIn(role.id)}
                    disabled={isCurrentSubmitting}
                    className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 ${role.btnBg}`}
                  >
                    {isCurrentSubmitting ? (
                      <div className="w-full flex items-center justify-center space-x-2 py-0.5">
                        <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-800">Authorizing {role.title}...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <GoogleIcon />
                          <div className="flex flex-col text-left leading-tight min-w-0">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Google OAuth</span>
                            <span className="text-xs font-bold text-slate-900 truncate">{role.actionTitle}</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 flex-shrink-0 ml-1" />
                      </>
                    )}
                  </button>

                  <div className="text-[10px] text-center text-slate-400 flex items-center justify-center space-x-1">
                    <ArrowRight size={10} className="text-slate-500" />
                    <span className="truncate">{role.targetPortal}</span>
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
