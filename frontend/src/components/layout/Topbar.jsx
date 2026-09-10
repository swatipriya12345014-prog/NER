import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Search, User, Menu, Wifi, Shield, LogOut, ChevronDown, 
  HelpCircle, X, Sparkles, Navigation, Fuel, Route, AlertTriangle, 
  Radio, Compass, CheckCircle2, ArrowRight, ExternalLink, BookOpen,
  Globe, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { REGIONAL_HUBS } from '../../services/fuelRouteService';
import { OPERATIONAL_ALERTS, OPERATIONAL_BLOCKED_ROADS } from '../../services/googleDirectionsService';

// Searchable entity catalog
const SEARCHABLE_ENTITIES = [
  // Vehicles
  { id: 'v1', type: 'vehicle', title: 'Highland Rapid Ambulance 01', subtitle: 'Plate: AS-01-EV-4421 • Driver: Tashi Namgyal', path: '/vehicles', meta: 'Fuel: 48L (68.6%) • Cruising: 313.8 km' },
  { id: 'v2', type: 'vehicle', title: 'Mountain Blood Express 02', subtitle: 'Plate: ML-05-BX-1092 • Driver: Biren Das', path: '/vehicles', meta: 'Fuel: 18L (32.7%) • Critical Low Fuel' },
  { id: 'v3', type: 'vehicle', title: 'Brahmaputra Heavy Supply 03', subtitle: 'Plate: AS-01-TR-9904 • Driver: Hemen Bora', path: '/vehicles', meta: 'Fuel: 142L (78.9%) • Cruising: 681.6 km' },
  { id: 'v4', type: 'vehicle', title: 'Tawang High-Altitude 4x4', subtitle: 'Plate: AR-02-AT-5511 • Driver: Lobsang Dorjee', path: '/vehicles', meta: 'Fuel: 64L (80.0%) • Cruising: 396.8 km' },
  { id: 'v5', type: 'vehicle', title: 'Barapani Emergency Patrol', subtitle: 'Plate: ML-01-EP-8833 • Driver: Wanbiang Dkhar', path: '/vehicles', meta: 'Fuel: 42L (76.4%) • Cruising: 386.4 km' },
  { id: 'v6', type: 'vehicle', title: 'Silchar Valley Relief Carrier', subtitle: 'Plate: AS-11-RC-3320 • Driver: Rahmat Ali', path: '/vehicles', meta: 'Fuel: 95L (67.9%) • Cruising: 532.0 km' },
  // Hubs
  ...REGIONAL_HUBS.map(h => ({
    id: `hub-${h.id}`,
    type: 'hub',
    title: h.name,
    subtitle: `${h.state} • Elevation: ${h.elevation_m}m`,
    path: '/live-map',
    meta: `Type: ${h.type} • Coordinates: ${h.lat.toFixed(2)}, ${h.lng.toFixed(2)}`
  })),
  // Hazards & Blockages
  ...OPERATIONAL_BLOCKED_ROADS.map(b => ({
    id: `blk-${b.id}`,
    type: 'hazard',
    title: b.name,
    subtitle: `Location: ${b.location} • Highway: ${b.id}`,
    path: '/incidents',
    meta: `Status: ${b.status} • Diversion: ${b.diversion}`
  })),
  // Shipments
  { id: 'sh-1', type: 'shipment', title: 'Emergency Blood Plasma (O-Negative)', subtitle: 'From: Guwahati Central ➔ To: Tawang Border Base', path: '/shipments', meta: 'Cold-Chain: -4.2°C • Priority: Urgent' },
  { id: 'sh-2', type: 'shipment', title: 'Portable Medical Oxygen Concentrators (40 Units)', subtitle: 'From: Guwahati Central ➔ To: Silchar Valley Depot', path: '/shipments', meta: 'Priority: High • Status: Dispatched' },
  { id: 'sh-3', type: 'shipment', title: 'Polyvalent Snake Antivenom Vials (250 Doses)', subtitle: 'From: Tezpur Airforce Base ➔ To: Zunheboto Mountain Outpost', path: '/shipments', meta: 'Cold-Chain: +3.8°C • Priority: High' }
];

export default function Topbar({ onMenuToggle }) {
  const { user, role, logout } = useAuth();
  const { language, setLanguage, t, languagesList, soundAlertsEnabled, setSoundAlertsEnabled, playAlertChime } = useLanguage();
  const navigate = useNavigate();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showOperatorGuide, setShowOperatorGuide] = useState(false);

  const searchContainerRef = useRef(null);
  const langDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Autocomplete Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = SEARCHABLE_ENTITIES.filter(
      item => item.title.toLowerCase().includes(q) ||
              item.subtitle.toLowerCase().includes(q) ||
              item.meta.toLowerCase().includes(q)
    ).slice(0, 7);
    setSearchResults(matches);
  }, [searchQuery]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to focus search, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) input.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setDropdownOpen(false);
        setAlertsOpen(false);
        setLangDropdownOpen(false);
        setShowOperatorGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'Regional Admin';
      case 'driver': return 'Active Driver';
      case 'field_officer': return 'Field Officer';
      case 'logistics_manager': return 'Logistics Manager';
      default: return 'Authorized Officer';
    }
  };

  const getCategoryBadge = (type) => {
    switch (type) {
      case 'vehicle':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">🚗 VEHICLE</span>;
      case 'hub':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">🏢 LOGISTICS HUB</span>;
      case 'hazard':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">⛔ ROAD HAZARD</span>;
      case 'shipment':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">📦 SHIPMENT</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 shadow-lg select-none">
      {/* Left: Mobile menu toggle & Global Command Search */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>

        {/* Global Autocomplete Command Search */}
        <div ref={searchContainerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t('search_placeholder', 'Search vehicles, hubs, relief shipments... (Ctrl+K)')}
              className="pl-10 pr-16 py-1.5 border border-slate-700 rounded-full bg-slate-950 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 sm:w-72 lg:w-96 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs divide-y divide-slate-800 backdrop-blur-xl">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Quick Jump Results ({searchResults.length})</span>
                <span>Press Esc to close</span>
              </div>
              
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsSearchFocused(false);
                        setSearchQuery('');
                        navigate(item.path);
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-2 cursor-pointer group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          {getCategoryBadge(item.type)}
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.meta}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-500 group-hover:text-cyan-400 mt-1 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500">
                    No matching records found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Language Selector, Sound Chime, Quick Guide, Live Status, Alerts, User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Regional Language Selector */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Switch Regional Language (North East India)"
          >
            <Globe size={14} className="text-blue-400" />
            <span className="text-xs">{languagesList.find(l => l.id === language)?.flag || '🌐'}</span>
            <span className="hidden sm:inline font-medium">
              {languagesList.find(l => l.id === language)?.native || 'Language'}
            </span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs divide-y divide-slate-800">
              <div className="px-3 py-1.5 flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Regional Language</span>
                <span className="text-blue-400 font-mono">NE India</span>
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {languagesList.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLanguage(l.id);
                      playAlertChime('success');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                      language === l.id ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{l.flag}</span>
                      <div>
                        <div className="leading-tight font-semibold">{l.native}</div>
                        <div className="text-[10px] text-slate-400">{l.name} • {l.region}</div>
                      </div>
                    </div>
                    {language === l.id && <CheckCircle2 size={14} className="text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tactical Sound Alert Toggle */}
        <button
          onClick={() => {
            const nextState = !soundAlertsEnabled;
            setSoundAlertsEnabled(nextState);
            if (nextState) playAlertChime('alert');
          }}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            soundAlertsEnabled ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
          }`}
          title={soundAlertsEnabled ? 'Tactical Audio Alerts: ON (Click to Mute)' : 'Tactical Audio Alerts: MUTED (Click to Enable)'}
        >
          {soundAlertsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>

        {/* Operator Quick Guide Button */}
        <button
          onClick={() => setShowOperatorGuide(true)}
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Open Operator Guide & Quick Tour"
        >
          <BookOpen size={14} className="text-cyan-400" />
          <span>{t('operator_guide', 'Field Manual')}</span>
        </button>

        {/* System Online Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800/60 rounded-full">
          <Wifi size={13} className="text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-300">Systems Online</span>
        </div>

        {/* Operational Alerts Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Operational Alerts"
          >
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
          </button>

          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs divide-y divide-slate-800">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <AlertTriangle size={14} className="text-rose-400" />
                  <span>Highland Incident Alerts ({OPERATIONAL_ALERTS.length})</span>
                </span>
                <button
                  onClick={() => {
                    setAlertsOpen(false);
                    navigate('/alerts');
                  }}
                  className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                >
                  View All ➔
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                {OPERATIONAL_ALERTS.slice(0, 3).map((alt) => (
                  <div key={alt.id} className="p-2.5 hover:bg-slate-800/50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{alt.title}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                        alt.severity === 'Critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{alt.message}</p>
                    <div className="text-[9px] text-slate-500">{alt.time}</div>
                  </div>
                ))}
              </div>

              <div className="p-2 text-center">
                <button
                  onClick={() => {
                    setAlertsOpen(false);
                    navigate('/live-map');
                  }}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Inspect on Live Map
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div 
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
          title="Government Security Protocol Active • 256-Bit TLS End-to-End Encrypted"
        >
          <Shield size={18} />
        </div>

        <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 cursor-pointer hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-blue-500 object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={15} />}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.displayName || 'Dr. R. Sharma (Admin)'}
              </p>
              <p className="text-[10px] text-blue-400 font-medium">
                {getRoleLabel(role)}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs divide-y divide-slate-800">
              <div className="px-4 py-2.5">
                <p className="font-bold text-white truncate">
                  {user?.displayName || 'Regional Dispatch Commander'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'admin@ner-lifeline.gov.in'}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                  {getRoleLabel(role)}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setShowOperatorGuide(true);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <HelpCircle size={14} className="text-cyan-400" />
                  <span>How NER-LIFELINE Works</span>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <span>⚙️ System Preferences</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2 font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE OPERATOR GUIDE MODAL ("How NER-LIFELINE Works")
         ───────────────────────────────────────────────────────────── */}
      {showOperatorGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full p-5 rounded-2xl shadow-2xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    NER-LIFELINE Operator Guide & Tour
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Essential protocols for AI smart logistics across North East India
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOperatorGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4 Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-[11px]">
              {/* Feature 1: Dual Route Intelligence */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <Route size={16} />
                  <span>1. Safest vs Shortest Route</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  In mountainous North East India, the shortest route often passes dangerous landslide zones (e.g. Sela Pass or Sonapur). NER-LIFELINE cross-references live satellite rainfall & road blockages to recommend the <strong className="text-emerald-300">Safest Corridor</strong>.
                </p>
              </div>

              {/* Feature 2: AI Fuel Simulator */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <Fuel size={16} />
                  <span>2. Interactive Fuel "What-If"</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Before dispatching relief convoys, slide the vehicle fuel volume slider on the Live Map to test whether tanks can survive steep +3,200m elevation climbs without stranding in remote valleys.
                </p>
              </div>

              {/* Feature 3: Compass & Heading-Up Navigation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                  <Compass size={16} />
                  <span>3. Compass Heading-Up Mode</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Drivers and field officers can toggle between <strong className="text-cyan-300">North-Up</strong> (standard map) and <strong className="text-cyan-300">Heading-Up</strong> (map rotates continuously with the vehicle's compass azimuth sensor).
                </p>
              </div>

              {/* Feature 4: Offline LoRa Mesh DTN */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                  <Radio size={16} />
                  <span>4. Offline LoRa Mesh Resilience</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  When cellular networks go down during flash floods, emergency vehicles communicate over 865–867 MHz LoRa packets using Delay-Tolerant Store-and-Forward to route SOS distress signals.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">
                NER-LIFELINE • Developed for Smart India Hackathon
              </span>
              <button
                onClick={() => {
                  setShowOperatorGuide(false);
                  navigate('/live-map');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs cursor-pointer transition-colors shadow-lg"
              >
                Launch Live Tactical Map ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
