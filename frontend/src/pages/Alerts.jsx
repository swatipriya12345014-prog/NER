import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, AlertTriangle, Shield, CheckCircle2, Volume2, VolumeX, 
  Radio, MapPin, Clock, ArrowRight, ExternalLink, Send, Plus, X, Search
} from 'lucide-react';
import { OPERATIONAL_ALERTS } from '../services/googleDirectionsService';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(OPERATIONAL_ALERTS.map(a => ({
    ...a,
    acknowledged: false,
    escortDispatched: false
  })));
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // New Broadcast Form State
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    severity: 'Critical',
    message: '',
    targetCorridor: 'NH-13 (Kameng & Tawang)'
  });

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || a.severity.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const handleAcknowledge = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const handleDispatchEscort = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, escortDispatched: true } : a));
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastData.title) return;

    const newAlert = {
      id: `alt-live-${Date.now()}`,
      title: broadcastData.title,
      severity: broadcastData.severity,
      message: broadcastData.message,
      time: 'Just Now',
      lat: 26.50,
      lng: 92.50,
      acknowledged: false,
      escortDispatched: false
    };

    setAlerts([newAlert, ...alerts]);
    setShowBroadcastModal(false);
    setBroadcastSuccess(`Emergency Broadcast sent across ${broadcastData.targetCorridor}!`);
    setTimeout(() => setBroadcastSuccess(''), 5000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Bell size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Centralized Operational Alert Dispatch
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Emergency broadcast system pushing live road blockage warnings, flash flood telemetry, and convoy advisories to all relief units.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              audioEnabled 
                ? 'bg-slate-800 border-slate-700 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Audio Siren Chime on Incoming Critical Alerts"
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">{audioEnabled ? 'Audio Chime ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <Radio size={15} />
            <span>Broadcast Alert</span>
          </button>
        </div>
      </div>

      {broadcastSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-pulse">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{broadcastSuccess}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Critical Incidents</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500">
            {alerts.filter(a => a.severity === 'Critical').length}
          </div>
          <p className="text-[10px] text-rose-400/80">Immediate diversion needed</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Warning Advisories</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {alerts.filter(a => a.severity === 'Warning' || a.severity === 'High').length}
          </div>
          <p className="text-[10px] text-amber-400/80">Speed restriction & caution</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Acknowledged Convoys</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {alerts.filter(a => a.acknowledged).length} / {alerts.length}
          </div>
          <p className="text-[10px] text-emerald-400/80">Fleet confirmation received</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Broadcast Relays</span>
            <Radio size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">8 Channels</div>
          <p className="text-[10px] text-cyan-400/80">4G + LoRa 865MHz Mesh</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts, messages, highway stretches..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {['all', 'critical', 'warning'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-md capitalize font-semibold cursor-pointer transition-colors ${
                severityFilter === sev
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {filteredAlerts.map((alt) => (
          <div
            key={alt.id}
            className={`p-5 rounded-2xl border transition-all shadow-xl space-y-3 ${
              alt.severity === 'Critical'
                ? 'bg-slate-900/90 border-rose-900/60 hover:border-rose-700'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className={`w-3 h-3 rounded-full ${
                  alt.severity === 'Critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                }`} />
                <h3 className="font-bold text-base text-white">{alt.title}</h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  alt.severity === 'Critical' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {alt.severity}
                </span>
                <span className="text-slate-500 text-xs font-mono">{alt.time}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {alt.message}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center space-x-3 text-slate-400">
                {alt.acknowledged ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 size={14} />
                    <span>Acknowledged by Driver Fleet</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center space-x-1">
                    <Clock size={14} />
                    <span>Awaiting Fleet Acknowledgment</span>
                  </span>
                )}

                {alt.escortDispatched && (
                  <span className="text-blue-400 font-bold flex items-center space-x-1">
                    <Shield size={14} />
                    <span>SDRF Pilot Escort Dispatched</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!alt.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alt.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    Acknowledge
                  </button>
                )}

                {!alt.escortDispatched && (
                  <button
                    onClick={() => handleDispatchEscort(alt.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    Dispatch Pilot Escort
                  </button>
                )}

                <button
                  onClick={() => navigate('/live-map')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <span>Locate on Map</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full p-5 rounded-2xl shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <Radio size={16} className="text-rose-400" />
                <span>Broadcast Emergency Fleet Alert</span>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alert Headline</label>
                <input
                  type="text"
                  required
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  placeholder="e.g. FLASH FLOOD WARNING: Sonapur Tunnel Bypass"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severity</label>
                  <select
                    value={broadcastData.severity}
                    onChange={(e) => setBroadcastData({ ...broadcastData, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Critical">Critical (Siren Alarm)</option>
                    <option value="Warning">Warning (Advisory)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Corridor</label>
                  <select
                    value={broadcastData.targetCorridor}
                    onChange={(e) => setBroadcastData({ ...broadcastData, targetCorridor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500 text-[11px]"
                  >
                    <option value="NH-13 (Kameng & Tawang)">NH-13 (Kameng & Tawang)</option>
                    <option value="NH-29 (Dimapur - Kohima)">NH-29 (Dimapur - Kohima)</option>
                    <option value="NH-06 (Shillong - Silchar)">NH-06 (Shillong - Silchar)</option>
                    <option value="NH-10 (Teesta Valley Sikkim)">NH-10 (Teesta Valley)</option>
                    <option value="All North East Fleet">All North East Fleet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Broadcast Dispatch Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  placeholder="Detail speed limits, safe bypass coordinates, and escort instructions..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow"
                >
                  Transmit Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
