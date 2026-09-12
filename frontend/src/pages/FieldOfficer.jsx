import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, AlertTriangle, MapPin, Camera, Navigation, CheckCircle2,
  Clock, Radio, Send, RefreshCw, Plus, ArrowUpRight, Truck, Phone,
  Activity, Check, AlertOctagon, Layers, Mountain, CloudRain,
  Wrench, FileText, CheckSquare, Eye, ExternalLink, Satellite
} from 'lucide-react';
import { OPERATIONAL_BLOCKED_ROADS } from '../services/googleDirectionsService';

// Mountain Sector Landslide Vulnerability Ratings
const SECTOR_VULNERABILITY = [
  {
    sector: 'Sector 1: Sela Pass Corridor',
    highway: 'NH-13 (Arunachal Pradesh)',
    elevation: '13,700 ft',
    riskLevel: 'CRITICAL',
    riskScore: 88,
    clearingUnit: 'BRO Project Vartak (Tenga Base)',
    heavyMachinery: '3 JCBs, 2 Rock Breakers active',
    lastInspection: '42 mins ago'
  },
  {
    sector: 'Sector 2: Lumshnong Karst Valley',
    highway: 'NH-06 (Meghalaya Plateau)',
    elevation: '4,200 ft',
    riskLevel: 'HIGH',
    riskScore: 74,
    clearingUnit: 'Meghalaya PWD & NHAI Taskforce',
    heavyMachinery: '2 Bull-dozers deployed',
    lastInspection: '1h 15m ago'
  },
  {
    sector: 'Sector 3: Dima Hasao Hill Pass',
    highway: 'NH-27 (Assam)',
    elevation: '3,100 ft',
    riskLevel: 'MODERATE',
    riskScore: 52,
    clearingUnit: 'SDRF Quick Response Unit 4',
    heavyMachinery: '1 Excavator on standby',
    lastInspection: '2h 10m ago'
  },
  {
    sector: 'Sector 4: Kohima Ridge Slopes',
    highway: 'NH-29 (Nagaland)',
    elevation: '4,738 ft',
    riskLevel: 'HIGH',
    riskScore: 68,
    clearingUnit: 'BRO Project Sewak (Dimapur base)',
    heavyMachinery: '2 Graders operating',
    lastInspection: '55 mins ago'
  }
];

export default function FieldOfficer() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState(
    OPERATIONAL_BLOCKED_ROADS.map(inc => ({
      ...inc,
      clearanceStatus: inc.status === 'BLOCKED' ? 'CREW_DISPATCHED' : 'IN_PROGRESS',
      evidencePhoto: true,
      verifiedByOfficer: true
    }))
  );

  const [formData, setFormData] = useState({
    highway: 'NH-13 (Arunachal)',
    location: '',
    lat: '27.505',
    lng: '92.102',
    reason: '',
    severity: 'CRITICAL',
    clearingAuthority: 'BRO Project Vartak',
    diversionRoute: '',
    photoAttached: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('INCIDENTS'); // 'INCIDENTS' | 'VULNERABILITY' | 'LORA_DTN'
  const [loraTransmitting, setLoraTransmitting] = useState(false);

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4)
          }));
          showToast('GPS coordinates accurately captured from field hardware!');
        },
        () => {
          setFormData((prev) => ({
            ...prev,
            lat: '27.3821',
            lng: '92.2145'
          }));
          showToast('Simulated tactical GPS locked for Kameng Sector (27.3821° N, 92.2145° E).');
        }
      );
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Field Officer Hazard Submission
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
        lat: parseFloat(formData.lat) || 27.505,
        lng: parseFloat(formData.lng) || 92.102,
        clearingAuthority: formData.clearingAuthority,
        estimatedClearance: '2-3 hrs',
        diversionRoute: formData.diversionRoute || 'Alternative state bypass route active',
        clearanceStatus: 'CREW_DISPATCHED',
        evidencePhoto: formData.photoAttached,
        verifiedByOfficer: true
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
        diversionRoute: '',
        photoAttached: false
      });
      showToast('Field Incident logged with GPS and broadcast to all convoy drivers over LoRa Mesh!');
    }, 700);
  };

  // Status Updater by Field Officer
  const handleUpdateClearanceStatus = (incId, newStatus, statusLabel) => {
    setIncidents(prev => prev.map(item => {
      if (item.id === incId) {
        return {
          ...item,
          clearanceStatus: newStatus,
          severity: newStatus === 'CLEARED' ? 'RESOLVED' : item.severity
        };
      }
      return item;
    }));
    showToast(`Hazard ${incId} updated to "${statusLabel}". Notified Central Command.`);
  };

  // Simulate LoRa DTN Mesh Broadcast
  const handleTransmitLoraPacket = () => {
    setLoraTransmitting(true);
    setTimeout(() => {
      setLoraTransmitting(false);
      showToast('LoRa DTN Packet (865 MHz) successfully broadcast across 6 mountain repeaters!');
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 border border-blue-400 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Field Officer Tactical Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-500/30 p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                <Shield size={12} />
                <span>Field Operations & Reconnaissance Console</span>
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Radio size={12} className="text-emerald-400 animate-pulse" /> Officer ID: FO-8821 • Sector: Kameng-Tawang Highland
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Activity className="text-blue-400" size={26} />
              Disaster Reconnaissance & Road Clearance Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time ground hazard logging, GPS obstacle tagging, BRO/SDRF clearance progress verification, and offline LoRa DTN mesh packets for mountain convoy pilots.
            </p>
          </div>

          {/* Quick Action Triggers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTransmitLoraPacket}
              disabled={loraTransmitting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-900/40 active:scale-95"
            >
              <Satellite size={15} className={loraTransmitting ? 'animate-spin' : ''} />
              <span>{loraTransmitting ? 'Broadcasting...' : 'Broadcast LoRa Beacon'}</span>
            </button>
            <button
              onClick={() => navigate('/live-map')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Navigation size={14} className="text-cyan-400" />
              <span>Open Tactical Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Field Operations KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Sector Blockages</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {incidents.filter(i => i.clearanceStatus !== 'CLEARED').length}
          </div>
          <p className="text-[10px] text-rose-400 font-semibold">
            {incidents.filter(i => i.severity === 'CRITICAL').length} Critical Pass Closures
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">BRO Units On Ground</span>
            <Truck size={16} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            8 Taskforces
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Project Vartak & Sewak active
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Heavy Earthmovers</span>
            <Wrench size={16} className="text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-300">
            14 Deployed
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            JCBs & Rock Breakers on pass
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Passes Monitored</span>
            <Mountain size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            6 Corridors
          </div>
          <p className="text-[10px] text-emerald-300 font-semibold">
            100% LoRa Mesh Coverage
          </p>
        </div>
      </div>

      {/* Main Grid: Incident Reporting Form + Active Ground Incidents Verification Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Incident Logging Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <AlertOctagon size={18} className="text-rose-400" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Log Recon Hazard</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              Live Field Mode
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Highway Pass Corridor</label>
              <select
                value={formData.highway}
                onChange={(e) => setFormData({ ...formData, highway: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="NH-13 (Arunachal)">NH-13 (Sela Pass - Tawang Strategic Corridor)</option>
                <option value="NH-06 (Meghalaya)">NH-06 (Lumshnong Causeway - Jaintia Hills)</option>
                <option value="NH-10 (Sikkim)">NH-10 (Teesta Valley Landslide Zone)</option>
                <option value="NH-29 (Nagaland)">NH-29 (Dimapur - Kohima Hill Pass)</option>
                <option value="NH-37 (Assam-Manipur)">NH-37 (Silchar - Imphal Lifeline)</option>
                <option value="NH-27 (Assam)">NH-27 (Dima Hasao Hill Section)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Milepost Marker & Landmark</label>
              <input
                type="text"
                placeholder="e.g. Km 82 north of Bhalukpong bridge"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Hazard Nature & Ground Debris Assessment</label>
              <textarea
                rows={2}
                placeholder="Boulder slide blocking full carriageway. Active mudflow. Water depth 0.8m..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Severity Rating</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="CRITICAL">🔴 Critical (Total Blockage)</option>
                  <option value="HIGH">🟠 High (1-Lane 4x4 Only)</option>
                  <option value="MODERATE">🟡 Moderate (Debris Caution)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Assigned Clearing Agency</label>
                <select
                  value={formData.clearingAuthority}
                  onChange={(e) => setFormData({ ...formData, clearingAuthority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="BRO Project Vartak">BRO Project Vartak</option>
                  <option value="BRO Project Sewak">BRO Project Sewak</option>
                  <option value="SDRF Emergency Unit">SDRF Emergency Unit</option>
                  <option value="NHIDCL Road Patrol">NHIDCL Road Patrol</option>
                  <option value="State PWD Division">State PWD Division</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Recommended Bypass / Diversion</label>
              <input
                type="text"
                placeholder="e.g. Divert medical convoys via Orang-Kalaktang-Shergaon road"
                value={formData.diversionRoute}
                onChange={(e) => setFormData({ ...formData, diversionRoute: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Photo Attachment Simulation */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera size={16} className="text-cyan-400" />
                <span className="text-slate-300 font-medium text-xs">Attach Field Evidence Photo</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, photoAttached: !prev.photoAttached }));
                  showToast(formData.photoAttached ? 'Evidence photo removed.' : 'Tactical terrain image captured and geo-stamped.');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  formData.photoAttached
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {formData.photoAttached ? '✓ Photo Attached' : '+ Capture Photo'}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{submitting ? 'Broadcasting Over LoRa Mesh...' : 'Log Hazard & Alert Drivers'}</span>
            </button>
          </form>
        </div>

        {/* Right Col (7 cols): Active Ground Hazards & Clearance Verification Board */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            {/* Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Ground Hazards & Clearance Board ({incidents.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Field officer verification & progress updates</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveTab('INCIDENTS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'INCIDENTS'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Hazards ({incidents.length})
                </button>
                <button
                  onClick={() => setActiveTab('VULNERABILITY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'VULNERABILITY'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pass Vulnerability
                </button>
              </div>
            </div>

            {/* View 1: Active Hazards Feed with Field Officer Actions */}
            {activeTab === 'INCIDENTS' && (
              <div className="space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      inc.clearanceStatus === 'CLEARED'
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : inc.severity === 'CRITICAL'
                        ? 'bg-slate-950 border-rose-800/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-extrabold text-xs text-white">{inc.highway}</span>
                          <span className="text-xs text-slate-400">• {inc.location}</span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : inc.severity === 'RESOLVED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {inc.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{inc.reason}</p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          inc.clearanceStatus === 'CLEARED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : inc.clearanceStatus === 'ONE_LANE_OPEN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}>
                          {inc.clearanceStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Diversion route */}
                    {inc.diversionRoute && (
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300 flex items-center space-x-1.5">
                        <Navigation size={13} className="text-cyan-400 flex-shrink-0" />
                        <span>Diversion: <strong>{inc.diversionRoute}</strong></span>
                      </div>
                    )}

                    {/* Field Officer Action Buttons: 1-Click Verification */}
                    <div className="mt-3 pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 space-x-3">
                        <span>Authority: <strong className="text-slate-300">{inc.clearingAuthority}</strong></span>
                        <span>Est: <strong className="text-amber-400">{inc.estimatedClearance}</strong></span>
                      </div>

                      {/* Field Status Update Triggers */}
                      <div className="flex items-center space-x-1.5">
                        {inc.clearanceStatus !== 'ONE_LANE_OPEN' && inc.clearanceStatus !== 'CLEARED' && (
                          <button
                            onClick={() => handleUpdateClearanceStatus(inc.id, 'ONE_LANE_OPEN', '1-Lane Open (4x4 Only)')}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Mark 1-Lane Open (4x4)
                          </button>
                        )}
                        {inc.clearanceStatus !== 'CLEARED' && (
                          <button
                            onClick={() => handleUpdateClearanceStatus(inc.id, 'CLEARED', 'Fully Cleared / Normal Traffic')}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Mark All Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View 2: Mountain Pass Landslide Vulnerability */}
            {activeTab === 'VULNERABILITY' && (
              <div className="space-y-3">
                {SECTOR_VULNERABILITY.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-white text-xs">{sec.sector}</h4>
                        <p className="text-[11px] text-slate-400">{sec.highway} • Alt: {sec.elevation}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        sec.riskLevel === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                          : sec.riskLevel === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        Risk Score: {sec.riskScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-900">
                      <div>
                        <span className="text-slate-500">Clearing Team: </span>
                        <strong className="text-slate-200">{sec.clearingUnit}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Equipment: </span>
                        <strong className="text-slate-200">{sec.heavyMachinery}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
