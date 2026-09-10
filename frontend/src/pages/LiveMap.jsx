import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Truck, 
  Radio, 
  Layers, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Navigation, 
  Activity,
  Wind,
  Thermometer,
  Eye,
  Info,
  ExternalLink,
  RefreshCw,
  Globe2,
  ShieldCheck,
  Building2,
  Cpu,
  Lock,
  ArrowRight,
  Database
} from 'lucide-react';

const BHARAT_MAPS_URL = "https://mapservice.gov.in/gismapserviceMVC";

const NER_STATES = [
  {
    id: 'AR',
    name: 'Arunachal Pradesh',
    capital: 'Itanagar',
    riskLevel: 'High',
    riskColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
    svgPath: 'M 310 40 L 460 30 L 510 90 L 470 140 L 360 120 L 330 90 Z',
    labelPos: { x: 400, y: 85 },
    activeConvoys: 3,
    incidents: 2,
    meshNodes: 4,
    passability: 'Caution (Sela Pass Debris)',
    weather: 'Heavy Monsoonal Rain • 16°C'
  },
  {
    id: 'AS',
    name: 'Assam',
    capital: 'Dispur / Guwahati',
    riskLevel: 'Moderate',
    riskColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
    svgPath: 'M 190 125 L 340 120 L 410 135 L 430 180 L 320 185 L 260 170 L 190 155 Z',
    labelPos: { x: 280, y: 150 },
    activeConvoys: 7,
    incidents: 1,
    meshNodes: 8,
    passability: 'Clear (NH-27 Arterial Open)',
    weather: 'Overcast • 28°C'
  },
  {
    id: 'ML',
    name: 'Meghalaya',
    capital: 'Shillong',
    riskLevel: 'High',
    riskColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
    svgPath: 'M 190 165 L 290 170 L 290 215 L 180 205 Z',
    labelPos: { x: 235, y: 195 },
    activeConvoys: 2,
    incidents: 1,
    meshNodes: 3,
    passability: 'Waterlogged at Lumshnong (NH-06)',
    weather: 'Dense Fog & Rain • 19°C'
  },
  {
    id: 'NL',
    name: 'Nagaland',
    capital: 'Kohima',
    riskLevel: 'Moderate',
    riskColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
    svgPath: 'M 410 140 L 465 150 L 440 230 L 395 210 Z',
    labelPos: { x: 425, y: 185 },
    activeConvoys: 2,
    incidents: 0,
    meshNodes: 3,
    passability: 'Passable (NH-02)',
    weather: 'Light Drizzle • 21°C'
  },
  {
    id: 'MN',
    name: 'Manipur',
    capital: 'Imphal',
    riskLevel: 'High',
    riskColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
    svgPath: 'M 390 215 L 435 235 L 420 310 L 375 285 Z',
    labelPos: { x: 405, y: 260 },
    activeConvoys: 3,
    incidents: 2,
    meshNodes: 4,
    passability: 'High Caution (Mudslide Patrol Active)',
    weather: 'Humid & Overcast • 24°C'
  },
  {
    id: 'MZ',
    name: 'Mizoram',
    capital: 'Aizawl',
    riskLevel: 'Low',
    riskColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    svgPath: 'M 345 270 L 380 280 L 360 380 L 320 350 Z',
    labelPos: { x: 350, y: 325 },
    activeConvoys: 1,
    incidents: 0,
    meshNodes: 3,
    passability: 'Clear (NH-54 Clear)',
    weather: 'Clear Skies • 22°C'
  },
  {
    id: 'TR',
    name: 'Tripura',
    capital: 'Agartala',
    riskLevel: 'Low',
    riskColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    svgPath: 'M 280 230 L 325 240 L 315 310 L 275 290 Z',
    labelPos: { x: 298, y: 270 },
    activeConvoys: 2,
    incidents: 0,
    meshNodes: 2,
    passability: 'Clear (NH-08 Transit Normal)',
    weather: 'Humid • 30°C'
  },
  {
    id: 'SK',
    name: 'Sikkim',
    capital: 'Gangtok',
    riskLevel: 'Moderate',
    riskColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
    svgPath: 'M 70 70 L 125 65 L 120 120 L 65 115 Z',
    labelPos: { x: 95, y: 95 },
    activeConvoys: 1,
    incidents: 1,
    meshNodes: 2,
    passability: 'NH-10 Single-lane Traffic at Teesta',
    weather: 'Chilly • 14°C'
  }
];

const HIGHWAY_CORRIDORS = [
  { id: 'NH-27', name: 'East-West Arterial Corridor', d: 'M 195 145 Q 260 148 335 140 T 425 155', color: '#38bdf8' },
  { id: 'NH-13', name: 'Trans-Arunachal Highway', d: 'M 310 135 L 360 95 L 420 65', color: '#f59e0b' },
  { id: 'NH-06', name: 'Shillong-Silchar Mountain Pass', d: 'M 250 175 L 285 210 L 340 235', color: '#ef4444' },
  { id: 'NH-02', name: 'Kohima-Imphal Lifeline', d: 'M 425 175 L 415 220 L 400 270', color: '#10b981' }
];

const ACTIVE_CONVOYS = [
  { id: 'CV-101', name: 'Convoy Alpha (Plasma & Vaccines)', state: 'AR', x: 350, y: 105, temp: '3.8°C', priority: 'Critical' },
  { id: 'CV-102', name: 'Convoy Beta (Disaster Rations)', state: 'ML', x: 270, y: 190, temp: 'Ambient', priority: 'High' },
  { id: 'CV-103', name: 'Convoy Gamma (Surgical Kits)', state: 'MN', x: 405, y: 245, temp: '4.2°C', priority: 'Critical' },
  { id: 'CV-104', name: 'Convoy Delta (Water Filters)', state: 'AS', x: 260, y: 145, temp: 'Ambient', priority: 'Normal' },
];

const HAZARDS = [
  { id: 'HZ-01', title: 'Active Landslide Warning', state: 'AR', x: 365, y: 90, severity: 'High' },
  { id: 'HZ-02', title: 'Waterlogged Causeway', state: 'ML', x: 280, y: 205, severity: 'Caution' },
  { id: 'HZ-03', title: 'Teesta River Mud Deposit', state: 'SK', x: 105, y: 110, severity: 'Caution' },
];

const LiveMap = () => {
  // Defaults to the interactive Vector Radar so the user never sees a broken iframe error
  const [mapEngine, setMapEngine] = useState('vector');
  const [selectedState, setSelectedState] = useState(NER_STATES[0]);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showConvoys, setShowConvoys] = useState(true);
  const [showHazards, setShowHazards] = useState(true);

  const openBharatMaps = () => {
    window.open(BHARAT_MAPS_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Engine Switcher */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={12} />
              <span>National Informatics Centre (NIC) • Bharat Maps</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Radio size={12} />
              <span>Zero Leaflet / 100% Offline Resilient</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            NER Tactical Live Geospatial Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official Government of India GIS Integration and disaster-resilient mountain corridor radar for the 8 North Eastern states.
          </p>
        </div>

        {/* Engine Switcher Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setMapEngine('vector')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              mapEngine === 'vector'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu size={14} />
            <span>Tactical Vector Radar</span>
          </button>
          <button
            onClick={() => setMapEngine('bharatmaps')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              mapEngine === 'bharatmaps'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 size={14} />
            <span>Bharat Maps (NIC Gov)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Interactive Offline-Resilient Tactical Vector Radar */}
      {mapEngine === 'vector' && (
        <div className="space-y-6">
          {/* Layer Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Layers size={15} className="text-blue-400" />
              <span>8 NORTH EASTERN STATES VECTOR RADAR</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowCorridors(!showCorridors)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  showCorridors ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                <Navigation size={13} />
                <span>Corridors</span>
              </button>
              <button
                onClick={() => setShowConvoys(!showConvoys)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  showConvoys ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                <Truck size={13} />
                <span>Convoys ({ACTIVE_CONVOYS.length})</span>
              </button>
              <button
                onClick={() => setShowHazards(!showHazards)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  showHazards ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                <AlertTriangle size={13} />
                <span>Hazards ({HAZARDS.length})</span>
              </button>
            </div>
          </div>

          {/* Radar Grid & Side Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Vector SVG Map Viewport */}
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select a state to inspect relief operations
                </span>
                <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Critical Risk</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Caution</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Passable</span>
                  </span>
                </div>
              </div>

              <div className="w-full aspect-[4/3] bg-slate-950/70 rounded-xl border border-slate-800/80 relative flex items-center justify-center p-2">
                <svg
                  viewBox="0 0 560 420"
                  className="w-full h-full select-none"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(30,58,138,0.25))' }}
                >
                  <defs>
                    <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                    </pattern>
                  </defs>
                  <rect width="560" height="420" fill="url(#radarGrid)" />

                  {/* State Polygons */}
                  {NER_STATES.map((state) => {
                    const isSelected = selectedState?.id === state.id;
                    return (
                      <g key={state.id} className="cursor-pointer transition-all" onClick={() => setSelectedState(state)}>
                        <path
                          d={state.svgPath}
                          fill={isSelected ? '#1e3a8a' : '#0f172a'}
                          stroke={isSelected ? '#60a5fa' : '#334155'}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="hover:fill-blue-950/80 transition-colors"
                        />
                        <text
                          x={state.labelPos.x}
                          y={state.labelPos.y}
                          fill={isSelected ? '#93c5fd' : '#94a3b8'}
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none tracking-wider uppercase"
                        >
                          {state.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Highway Corridors */}
                  {showCorridors &&
                    HIGHWAY_CORRIDORS.map((corridor) => (
                      <path
                        key={corridor.id}
                        d={corridor.d}
                        fill="none"
                        stroke={corridor.color}
                        strokeWidth="2.5"
                        strokeDasharray="4 3"
                        className="opacity-80"
                      />
                    ))}

                  {/* Active Convoys */}
                  {showConvoys &&
                    ACTIVE_CONVOYS.map((convoy) => (
                      <g key={convoy.id} className="cursor-pointer" transform={`translate(${convoy.x}, ${convoy.y})`}>
                        <circle r="7" fill="#10b981" className="animate-ping opacity-60" />
                        <circle r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                        <text x="7" y="-5" fill="#34d399" fontSize="8" fontWeight="bold">
                          {convoy.id}
                        </text>
                      </g>
                    ))}

                  {/* Active Hazards */}
                  {showHazards &&
                    HAZARDS.map((hz) => (
                      <g key={hz.id} transform={`translate(${hz.x}, ${hz.y})`}>
                        <polygon points="0,-7 6,5 -6,5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
                      </g>
                    ))}
                </svg>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 text-center">
                Click any of the 8 states above to inspect regional road risks, cold-chain assets, and telemetry.
              </div>
            </div>

            {/* State Telemetry & Corridor Inspector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">State Corridor Telemetry</span>
                    <h3 className="text-xl font-bold text-white">{selectedState.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${selectedState.riskColor}`}>
                    {selectedState.riskLevel} Risk
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <MapPin size={13} className="text-blue-400" />
                      <span>Administrative Capital:</span>
                    </span>
                    <span className="font-semibold text-white">{selectedState.capital}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Navigation size={13} className="text-emerald-400" />
                      <span>Highway Passability:</span>
                    </span>
                    <span className="font-semibold text-slate-200 text-right max-w-[170px] truncate">
                      {selectedState.passability}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Wind size={13} className="text-cyan-400" />
                      <span>Terrain Meteorology:</span>
                    </span>
                    <span className="font-semibold text-slate-200">{selectedState.weather}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 text-center">
                      <span className="block text-slate-400 text-[10px]">Active Convoys</span>
                      <span className="text-lg font-bold text-emerald-400">{selectedState.activeConvoys}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 text-center">
                      <span className="block text-slate-400 text-[10px]">Hazard Alerts</span>
                      <span className="text-lg font-bold text-rose-400">{selectedState.incidents}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 text-center">
                      <span className="block text-slate-400 text-[10px]">Mesh Relays</span>
                      <span className="text-lg font-bold text-blue-400">{selectedState.meshNodes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Convoy Monitor in Selected State */}
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Truck size={14} className="text-emerald-400" />
                  <span>Active Relief Vehicles ({selectedState.name})</span>
                </h4>

                <div className="space-y-2">
                  {ACTIVE_CONVOYS.filter((c) => c.state === selectedState.id).length > 0 ? (
                    ACTIVE_CONVOYS.filter((c) => c.state === selectedState.id).map((convoy) => (
                      <div key={convoy.id} className="p-3 bg-slate-900/70 border border-slate-700 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{convoy.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                            {convoy.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Vehicle ID: {convoy.id}</span>
                          <span className="flex items-center space-x-1 text-blue-300">
                            <Thermometer size={12} />
                            <span>{convoy.temp}</span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                      No active convoys currently in this regional sector.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Bharat Maps Sovereign Gateway (Official NIC / MeitY Portal) */}
      {mapEngine === 'bharatmaps' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header with Security Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Official Sovereign GIS Gateway (NIC / MeitY)
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Bharat Maps (National Portal of Map Services)
                </h2>
                <p className="text-xs text-slate-400">
                  Direct government service gateway: <code className="text-blue-300">https://mapservice.gov.in/gismapserviceMVC</code>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={openBharatMaps}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg hover:shadow-blue-500/25 cursor-pointer"
                >
                  <span>Launch Official Portal</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* Why iframe refuses to connect explanation box */}
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <Lock size={15} />
                <span>Why Mapservice.gov.in Cannot Be Embedded in an Iframe:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                The official Government of India server (<code className="text-amber-200">mapservice.gov.in</code>) enforces a strict security policy called <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">X-Frame-Options: SAMEORIGIN</code>. All modern web browsers are mandated to block embedding government pages inside foreign website iframes to prevent clickjacking.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={openBharatMaps}
                  className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <span>Open Live Portal in Dedicated Window</span>
                  <ExternalLink size={12} />
                </button>
                <button
                  onClick={() => setMapEngine('vector')}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <span>Use Built-in Tactical Vector Radar</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Government Service Architecture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                  <Database size={16} />
                  <span>Sovereign Data Sources</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  NICMAPS base services integrate 1:50,000 scale geospatial ground truth from the <strong>Survey of India (SOI)</strong>, <strong>ISRO Bhuvan satellite imagery</strong>, and Forest Survey of India.
                </p>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <Building2 size={16} />
                  <span>Participating Ministries</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Powers mission-mode projects for the Ministry of Electronics & IT (MeitY), Ministry of Rural Development (MoRD), and Ministry of Agriculture & Farmers Welfare.
                </p>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                  <Radio size={16} />
                  <span>SIH Smart Logistics Fit</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Zero paid third-party API limits, complying with strict sovereign data governance requirements for emergency and disaster relief routing in the North Eastern Region.
                </p>
              </div>
            </div>

            {/* Direct State GIS Quick Links */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                North Eastern Region Sector Direct Links:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NER_STATES.map((st) => (
                  <a
                    key={st.id}
                    href={`${BHARAT_MAPS_URL}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <span>{st.name}</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
