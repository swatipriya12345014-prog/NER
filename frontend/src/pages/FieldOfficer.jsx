import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Camera,
  Navigation,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Truck,
  Phone
} from 'lucide-react';
import { OPERATIONAL_BLOCKED_ROADS } from '../services/googleDirectionsService';

export default function FieldOfficer() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState(OPERATIONAL_BLOCKED_ROADS);
  const [formData, setFormData] = useState({
    highway: 'NH-13 (Arunachal)',
    location: '',
    lat: '27.505',
    lng: '92.102',
    reason: '',
    severity: 'CRITICAL',
    clearingAuthority: 'BRO Project Vartak',
    diversionRoute: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4)
          }));
          showToast('GPS coordinates accurately captured!');
        },
        () => {
          showToast('GPS access simulated for Highland Sector.');
        }
      );
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const newInc = {
        id: `BLK-${Date.now().toString().slice(-4)}`,
        highway: formData.highway,
        location: formData.location || 'Highland Corridor Milepost',
        reason: formData.reason || 'Debris & Rockfall on carriageway',
        severity: formData.severity,
        lat: parseFloat(formData.lat) || 26.5,
        lng: parseFloat(formData.lng) || 92.5,
        clearingAuthority: formData.clearingAuthority,
        estimatedClearance: '3-4 hrs',
        diversionRoute: formData.diversionRoute || 'State Highway alternate pass'
      };
      setIncidents([newInc, ...incidents]);
      setSubmitting(false);
      setFormData({
        highway: 'NH-13 (Arunachal)',
        location: '',
        lat: '27.505',
        lng: '92.102',
        reason: '',
        severity: 'CRITICAL',
        clearingAuthority: 'BRO Project Vartak',
        diversionRoute: ''
      });
      showToast('Field Incident logged and broadcast over LoRa DTN!');
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Field Officer Banner */}
      <div className="bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border border-blue-800/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
              <Shield size={12} />
              <span>DISASTER RESPONSE FIELD OFFICER DISPATCH</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              UNIT: SDRF HIGHLAND RESCUE PATROL-03
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            Field Road Hazard & Clearing Center
          </h1>
          <p className="text-xs text-slate-400">
            Log active landslides, mudslides, or bridge washouts. Broadcasts immediate rerouting alerts to live convoy pilots.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/live-map')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl flex items-center space-x-2 cursor-pointer transition-all hover:scale-105"
          >
            <Navigation size={15} />
            <span>View Map Hazards</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form + Active Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Logging Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <AlertTriangle size={16} className="text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Log Field Incident</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Highway Corridor</label>
              <select
                value={formData.highway}
                onChange={(e) => setFormData({ ...formData, highway: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="NH-13 (Arunachal)">NH-13 (Sela Pass - Tawang Corridor)</option>
                <option value="NH-06 (Meghalaya)">NH-06 (Lumshnong Causeway)</option>
                <option value="NH-10 (Sikkim)">NH-10 (Teesta Valley Highway)</option>
                <option value="NH-29 (Nagaland)">NH-29 (Dimapur - Kohima Pass)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Exact Location / Marker</label>
              <input
                type="text"
                placeholder="e.g. Km Marker 142 near Bhalukpong"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold">GPS Coordinates</label>
                <button
                  type="button"
                  onClick={captureGPS}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                >
                  <MapPin size={11} />
                  <span>Capture Live GPS</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Hazard Details & Road Condition</label>
              <textarea
                rows={2}
                placeholder="Describe blockage, boulder size, water depth..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="CRITICAL">🔴 Critical (Total Blockage)</option>
                  <option value="HIGH">🟠 High (Single Lane Only)</option>
                  <option value="MODERATE">🟡 Moderate (Passable 4x4)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Clearing Authority</label>
                <select
                  value={formData.clearingAuthority}
                  onChange={(e) => setFormData({ ...formData, clearingAuthority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="BRO Project Vartak">BRO Project Vartak</option>
                  <option value="BRO Project Sewak">BRO Project Sewak</option>
                  <option value="SDRF Quick Clear">SDRF Emergency Unit</option>
                  <option value="NHIDCL Road Ops">NHIDCL Road Patrol</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Recommended Diversion Route</label>
              <input
                type="text"
                placeholder="e.g. Divert via Bhalukpong bypass SH-4"
                value={formData.diversionRoute}
                onChange={(e) => setFormData({ ...formData, diversionRoute: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{submitting ? 'Transmitting Over LoRa...' : 'Broadcast Hazard Alert'}</span>
            </button>
          </form>
        </div>

        {/* Active Reported Hazards & Clearing Progress */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Truck size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Field Hazards ({incidents.length})</h3>
                <p className="text-[11px] text-slate-400">Clearing teams dispatched & operational status</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Mesh Feed
            </span>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-white">{inc.highway}</span>
                    <span className="text-xs text-slate-400">• {inc.location}</span>
                  </div>
                  <span
                    className={`px-2 py-0.2 rounded text-[9px] font-black ${
                      inc.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {inc.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-snug">{inc.reason}</p>

                {inc.diversionRoute && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-[11px] text-emerald-300 flex items-center space-x-1.5">
                    <Navigation size={12} className="text-emerald-400 flex-shrink-0" />
                    <span>Diversion: <strong>{inc.diversionRoute}</strong></span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                  <span>Authority: <strong className="text-slate-300">{inc.clearingAuthority}</strong></span>
                  <span>Est. Clearance: <strong className="text-amber-400">{inc.estimatedClearance}</strong></span>
                  <button
                    onClick={() => navigate('/live-map')}
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View on Live Map</span>
                    <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
