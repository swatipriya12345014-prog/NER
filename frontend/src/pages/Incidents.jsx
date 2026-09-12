import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Shield, MapPin, Clock, Truck, Plus, 
  Search, Filter, ExternalLink, ArrowRight, CheckCircle2, 
  AlertOctagon, CloudRain, HardHat, RefreshCw, X, Eye
} from 'lucide-react';
import { 
  OPERATIONAL_BLOCKED_ROADS, 
  OPERATIONAL_RISKY_ROADS, 
  OPERATIONAL_ALERTS 
} from '../services/googleDirectionsService';

const INITIAL_INCIDENTS = [
  {
    id: 'INC-NER-101',
    title: 'NH-13 Sela Pass Landslide & Snow Slump',
    type: 'Landslide',
    severity: 'Critical',
    status: 'Road Blocked',
    highway: 'NH-13 (Trans-Arunachal Highway)',
    state: 'Arunachal Pradesh',
    location: 'Sela Pass Ridge (Elevation 4,170m)',
    coordinates: '27.502° N, 92.103° E',
    clearingAuthority: 'Border Roads Organisation (Project Vartak)',
    clearingEta: '10 Sep 2026, 18:00 IST',
    diversionRoute: 'Divert convoys through NH-15 Chariduar - Bhalukpong corridor.',
    reportedBy: 'Field Officer Dorjee (Sela Outpost)',
    reportedTime: '2 hours ago',
    description: 'Massive debris flow following continuous 140mm rainfall over high-altitude ridge. Heavy earthmovers deployed.'
  },
  {
    id: 'INC-NER-102',
    title: 'NH-29 Chumukedima Rockslide & Road Subsidence',
    type: 'Rockfall',
    severity: 'Critical',
    status: 'Road Blocked',
    highway: 'NH-29 (Dimapur - Kohima Highway)',
    state: 'Nagaland',
    location: 'Chumukedima Gorge km 14',
    coordinates: '25.792° N, 93.762° E',
    clearingAuthority: 'Nagaland PWD & SDRF Heavy Machinery',
    clearingEta: '11 Sep 2026, 09:30 IST',
    diversionRoute: 'Strict diversion via Old Chumukedima Military Ghat road for vehicles < 3.5T.',
    reportedBy: 'Inspector K. Angami (Dimapur Traffic)',
    reportedTime: '4 hours ago',
    description: 'Boulders obstructing both lanes. Blasting and rock clearance underway by engineering regiment.'
  },
  {
    id: 'INC-NER-103',
    title: 'NH-06 Lumshnong Coal Belt Flash Flood & Causeway Overflow',
    type: 'Flash Flood',
    severity: 'High',
    status: 'Partial Lane Open',
    highway: 'NH-06 (Shillong - Silchar Highway)',
    state: 'Meghalaya',
    location: 'Lumshnong Causeway (East Jaintia Hills)',
    coordinates: '25.183° N, 92.378° E',
    clearingAuthority: 'Meghalaya SDRF Team 04',
    clearingEta: '10 Sep 2026, 16:00 IST',
    diversionRoute: 'Single-file convoy escort only. 4x4 relief ambulances prioritized.',
    reportedBy: 'Sub-Inspector M. Marak (Khliehriat)',
    reportedTime: '5 hours ago',
    description: 'Lubha river tributary overflowed causeway by 0.6m. Water receding slowly. Pilot vehicles piloting essential fuel convoys.'
  },
  {
    id: 'INC-NER-104',
    title: 'NH-10 Teesta Valley Active Slump & Soil Erosion',
    type: 'Mudslide',
    severity: 'High',
    status: 'Single Lane Controlled',
    highway: 'NH-10 (Siliguri - Gangtok Highway)',
    state: 'Sikkim',
    location: 'Birik Dara Stretch',
    coordinates: '26.982° N, 88.423° E',
    clearingAuthority: 'Border Roads Organisation (Project Swastik)',
    clearingEta: '10 Sep 2026, 20:00 IST',
    diversionRoute: 'Divert light relief vehicles via Lava - Algarah mountain bypass.',
    reportedBy: 'Havildar P. Lepcha (Rangpo Checkpost)',
    reportedTime: '6 hours ago',
    description: 'Active riverbank cutting triggered minor road subsidence. Heavy vehicles temporarily restricted.'
  },
  {
    id: 'INC-NER-105',
    title: 'Barapani Lake Causeway Monsoonal Debris',
    type: 'Flooding',
    severity: 'Warning',
    status: 'Cleared - Caution Advised',
    highway: 'NH-106 (Guwahati - Shillong Expressway)',
    state: 'Meghalaya',
    location: 'Umiam Dam Bypass km 32',
    coordinates: '25.654° N, 91.892° E',
    clearingAuthority: 'NHIDCL Maintenance Patrol',
    clearingEta: 'Cleared',
    diversionRoute: 'Expressway open. Maintain speed under 40 km/h due to wet asphalt.',
    reportedBy: 'Logistics Scout B. Syiem',
    reportedTime: '8 hours ago',
    description: 'Drainage overflow cleared. Surface mud cleaned by water tenders.'
  }
];

export default function Incidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);

  // Form State
  const [newIncident, setNewIncident] = useState({
    title: '',
    type: 'Landslide',
    severity: 'Critical',
    highway: 'NH-13',
    state: 'Arunachal Pradesh',
    location: '',
    coordinates: '',
    diversionRoute: '',
    description: ''
  });

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.highway.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || i.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || i.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesState = stateFilter === 'all' || i.state.toLowerCase() === stateFilter.toLowerCase();

    return matchesSearch && matchesType && matchesSeverity && matchesState;
  });

  const handleCreateIncident = (e) => {
    e.preventDefault();
    if (!newIncident.title) return;

    const item = {
      id: `INC-NER-${Math.floor(200 + Math.random() * 800)}`,
      title: newIncident.title,
      type: newIncident.type,
      severity: newIncident.severity,
      status: 'Road Blocked',
      highway: newIncident.highway,
      state: newIncident.state,
      location: newIncident.location || 'Highland Corridor',
      coordinates: newIncident.coordinates || '26.50° N, 92.50° E',
      clearingAuthority: 'BRO / State Disaster Management Forces',
      clearingEta: 'Under Assessment',
      diversionRoute: newIncident.diversionRoute || 'Awaiting official bypass survey.',
      reportedBy: 'Field Officer (Radio Report)',
      reportedTime: 'Just Now',
      description: newIncident.description || 'Emergency field incident report logged via command console.'
    };

    setIncidents([item, ...incidents]);
    setShowNewIncidentModal(false);
    setNewIncident({
      title: '',
      type: 'Landslide',
      severity: 'Critical',
      highway: 'NH-13',
      state: 'Arunachal Pradesh',
      location: '',
      coordinates: '',
      diversionRoute: '',
      description: ''
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Field Incident & Disaster Road Hazard Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time telemetry on active landslides, river causeway overflows, and mountain rockfalls blocking Indian National Highways.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => navigate('/live-map')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 font-bold text-xs text-slate-200 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>Hazard Map</span>
            <ExternalLink size={13} />
          </button>
          <button
            onClick={() => setShowNewIncidentModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Report Field Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up stagger-1">
        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Active Incidents</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">{incidents.length}</div>
          <p className="text-[10px] text-slate-500">Live monitored across NER</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Highways Blocked</span>
            <AlertOctagon size={16} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-500">
            {incidents.filter(i => i.status === 'Road Blocked').length}
          </div>
          <p className="text-[10px] text-red-400/80">Diversion corridors required</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>River Flooding / Causeways</span>
            <CloudRain size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {incidents.filter(i => i.type === 'Flash Flood' || i.type === 'Flooding').length}
          </div>
          <p className="text-[10px] text-cyan-400/80">Active monsoonal rivers</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>BRO / SDRF Heavy Units</span>
            <HardHat size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            4 Clearing Regiments
          </div>
          <p className="text-[10px] text-amber-400/80">Earthmovers deployed</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident, National Highway, location, reporter..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="warning">Warning</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Hazard Types</option>
            <option value="landslide">Landslides</option>
            <option value="rockfall">Rockfalls</option>
            <option value="flood">Flash Floods</option>
            <option value="mudslide">Mudslides</option>
          </select>

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All 8 States</option>
            <option value="arunachal pradesh">Arunachal Pradesh</option>
            <option value="nagaland">Nagaland</option>
            <option value="meghalaya">Meghalaya</option>
            <option value="sikkim">Sikkim</option>
            <option value="assam">Assam</option>
            <option value="manipur">Manipur</option>
          </select>
        </div>
      </div>

      {/* Incident Cards Feed */}
      <div className="space-y-4">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className="glass-card-interactive p-5 rounded-2xl space-y-3.5 animate-fade-in"
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className={`w-3 h-3 rounded-full ${
                  inc.severity === 'Critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                }`} />
                <span className="font-mono text-xs text-slate-400 font-bold">{inc.id}</span>
                <span className="text-slate-600">•</span>
                <h3 className="font-bold text-base text-white">{inc.title}</h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  inc.severity === 'Critical' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : inc.severity === 'High'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {inc.severity} Severity
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  inc.status === 'Road Blocked' 
                    ? 'bg-red-950 text-red-300 border border-red-800' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  ⛔ {inc.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {inc.description}
            </p>

            {/* Grid Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Highway & Location</div>
                <div className="font-bold text-white truncate">{inc.highway}</div>
                <div className="text-[11px] text-slate-400">{inc.location}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">State & Coordinates</div>
                <div className="font-bold text-cyan-300">{inc.state}</div>
                <div className="text-[11px] font-mono text-slate-400">{inc.coordinates}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Clearing Authority</div>
                <div className="font-bold text-amber-300 truncate">{inc.clearingAuthority}</div>
                <div className="text-[11px] text-slate-400">ETA: {inc.clearingEta}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Field Reporter</div>
                <div className="font-bold text-slate-200">{inc.reportedBy}</div>
                <div className="text-[11px] text-slate-500">Reported: {inc.reportedTime}</div>
              </div>
            </div>

            {/* Official Diversion Box */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs flex items-start space-x-2.5">
              <Shield size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-emerald-300">Official Recommended Diversion:</strong>{' '}
                <span className="text-emerald-100">{inc.diversionRoute}</span>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                LIFELINE Incident ID: {inc.id} • Verified by Disaster Control
              </span>
              <button
                onClick={() => navigate('/live-map')}
                className="btn-press px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <span>Inspect Hazard on Live Map</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Incident Modal */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full p-5 rounded-2xl shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <Plus size={16} className="text-rose-400" />
                <span>Log New Field Incident & Hazard</span>
              </div>
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Headline</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="e.g. NH-13 km 42 Fresh Landslide blocking passage"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hazard Type</label>
                  <select
                    value={newIncident.type}
                    onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Landslide">Landslide</option>
                    <option value="Rockfall">Rockfall</option>
                    <option value="Flash Flood">Flash Flood</option>
                    <option value="Mudslide">Mudslide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severity Level</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Critical">Critical (Complete Closure)</option>
                    <option value="High">High (Single Lane Hazard)</option>
                    <option value="Warning">Warning (Slow Traffic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">National Highway</label>
                  <input
                    type="text"
                    value={newIncident.highway}
                    onChange={(e) => setNewIncident({ ...newIncident, highway: e.target.value })}
                    placeholder="e.g. NH-13, NH-29, NH-06"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">State</label>
                  <select
                    value={newIncident.state}
                    onChange={(e) => setNewIncident({ ...newIncident, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Assam">Assam</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Tripura">Tripura</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Recommended Bypass Diversion</label>
                <input
                  type="text"
                  value={newIncident.diversionRoute}
                  onChange={(e) => setNewIncident({ ...newIncident, diversionRoute: e.target.value })}
                  placeholder="e.g. Reroute via Old Military Ghat road"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Observations & Details</label>
                <textarea
                  rows={3}
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Describe slope condition, rainfall intensity, and heavy machinery required..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewIncidentModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow"
                >
                  Publish Incident Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
