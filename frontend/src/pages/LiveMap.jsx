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
  Cpu
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
  // Map engine mode: 'bharatmaps' (NIC Gov Live) or 'vector' (Offline Resilient)
  const [mapEngine, setMapEngine] = useState('bharatmaps');
  const [selectedState, setSelectedState] = useState(NER_STATES[0]);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showConvoys, setShowConvoys] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleRefreshIframe = () => {
    setIframeLoaded(false);
    setIframeKey(Date.now());
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Engine Switcher */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={12} />
              <span>Gov of India • Bharat Maps (NIC)</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Radio size={12} />
              <span>Zero Leaflet / Free Sovereign GIS</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            NER Tactical Live Geospatial Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time geospatial intelligence via the National Informatics Centre (NIC) Map Service and offline mesh radar.
          </p>
        </div>

        {/* Engine Switcher Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setMapEngine('bharatmaps')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              mapEngine === 'bharatmaps'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 size={14} />
            <span>Bharat Maps (Live NIC)</span>
          </button>
          <button
            onClick={() => setMapEngine('vector')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              mapEngine === 'vector'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu size={14} />
            <span>Offline Tactical Radar</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Bharat Maps (NIC Government Live GIS Portal) */}
      {mapEngine === 'bharatmaps' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            {/* Top Toolbar for Bharat Maps */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Stream: mapservice.gov.in/gismapserviceMVC
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                  Survey of India 1:50k Reference
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefreshIframe}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
                  title="Reload Portal Stream"
                >
                  <RefreshCw size={13} />
                  <span>Reload</span>
                </button>
                <a
                  href={BHARAT_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink size={13} />
                  <span>Launch Official Portal</span>
                </a>
              </div>
            </div>

            {/* Embedded Live Map Viewport */}
            <div className="relative w-full h-[620px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-medium text-slate-300">
                    Connecting to National Portal of Map Services (Bharat Maps)...
                  </p>
                  <span className="text-[11px] text-slate-500">
                    National Informatics Centre (NIC) • MeitY, Government of India
                  </span>
                </div>
              )}

              <iframe
                key={iframeKey}
                src={BHARAT_MAPS_URL}
                title="Bharat Maps Government GIS Service"
                className="w-full h-full border-0"
                onLoad={() => setIframeLoaded(true)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"
              />

              {/* Overlay Fallback Card for Strict Browser Sandboxing */}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl backdrop-blur-md shadow-xl max-w-md text-xs space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={14} />
                  <span>National GIS Mission Integration</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Consuming Bharat Maps base layers (Roads, Railways, Waterways & Admin Boundaries). If your browser enforces strict intranet framing, click <span className="text-blue-400 font-semibold">Launch Official Portal</span> or toggle <span className="text-blue-400 font-semibold">Offline Tactical Radar</span>.
                </p>
              </div>
            </div>

            {/* Bharat Maps Service Info Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Sovereign Authority</span>
                <p className="text-white font-semibold">National Informatics Centre</p>
                <span className="text-[11px] text-slate-400">MeitY, Gov of India</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Base Data Sources</span>
                <p className="text-white font-semibold">Survey of India & ISRO</p>
                <span className="text-[11px] text-slate-400">1:50,000 Reference Scale</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">GIS Service Type</span>
                <p className="text-white font-semibold">NICMAPS Base Services</p>
                <span className="text-[11px] text-slate-400">WMS, WMTS & REST Tiles</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Resilience Mode</span>
                <p className="text-emerald-400 font-semibold">Zero Paid Limits</p>
                <span className="text-[11px] text-slate-400">SIH Certified Sovereign Stack</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Offline-Resilient Tactical Vector Radar */}
      {mapEngine === 'vector' && (
        <div className="space-y-6">
          {/* Layer Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Layers size={15} className="text-blue-400" />
              <span>OFFLINE EMERGENCY VECTOR RADAR (8 NER STATES)</span>
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
                Click on any of the 8 states to inspect road conditions, cold-chain assets, and telemetry.
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

              {/* Real-time Convoy Monitor */}
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
    </div>
  );
};

export default LiveMap;
