import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, AlertTriangle, ShieldAlert, Network,
  Clock, MapPin, Zap, CloudRain, Shield, Activity,
  ArrowUpRight, Fuel, Route, Sparkles, Navigation,
  Radio, CheckCircle2, RefreshCw, Layers, Bell, ExternalLink,
  ChevronRight, Thermometer, Wind, Eye
} from 'lucide-react';
import { 
  OPERATIONAL_BLOCKED_ROADS, 
  OPERATIONAL_ALERTS, 
  OPERATIONAL_SHIPMENT_ROUTES 
} from '../services/googleDirectionsService';
import { REGIONAL_HUBS } from '../services/fuelRouteService';

// Real Highland Weather Telemetry Across Key Passes
const WEATHER_STATIONS = [
  { city: 'Guwahati', state: 'Assam', temp: 28, condition: 'Light Rain', rainMm: 3.2, windKmh: 8, risk: 'Low', color: 'emerald' },
  { city: 'Shillong', state: 'Meghalaya', temp: 17, condition: 'Monsoon Torrential', rainMm: 44.6, windKmh: 24, risk: 'High', color: 'amber' },
  { city: 'Tawang', state: 'Arunachal', temp: 8, condition: 'Debris & Dense Fog', rainMm: 18.0, windKmh: 16, risk: 'Critical', color: 'rose' },
  { city: 'Gangtok', state: 'Sikkim', temp: 13, condition: 'Silt Inundation', rainMm: 22.4, windKmh: 12, risk: 'Moderate', color: 'amber' },
  { city: 'Imphal', state: 'Manipur', temp: 24, condition: 'Clear Corridors', rainMm: 0.0, windKmh: 6, risk: 'Low', color: 'emerald' },
  { city: 'Kohima', state: 'Nagaland', temp: 19, condition: 'Intermittent Drizzle', rainMm: 8.5, windKmh: 10, risk: 'Moderate', color: 'amber' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState(WEATHER_STATIONS[0]);

  // Live KPI Summary
  const kpis = [
    {
      title: 'Active Fleet Vehicles',
      val: '14 / 16',
      sub: '92% Active Deployment',
      icon: Truck,
      color: 'blue',
      route: '/vehicles'
    },
    {
      title: 'Critical Relief Shipments',
      val: '8 Active',
      sub: '100% Cold-Chain Maintained',
      icon: Package,
      color: 'emerald',
      route: '/shipments'
    },
    {
      title: 'Active Road Hazards',
      val: '3 Blockages',
      sub: 'BRO Escort & Clear En Route',
      icon: AlertTriangle,
      color: 'rose',
      route: '/incidents'
    },
    {
      title: 'Avg Highland Route Risk',
      val: '62 / 100',
      sub: 'Monsoon Terrain Active',
      icon: ShieldAlert,
      color: 'amber',
      route: '/risk-analysis'
    },
    {
      title: 'LIFELINE MESH Nodes',
      val: '18 / 18',
      sub: '100% Signal • DTN Enabled',
      icon: Network,
      color: 'cyan',
      route: '/mesh'
    },
    {
      title: 'Active Dispatch Alerts',
      val: '4 Real-time',
      sub: '2 Critical Safety Notices',
      icon: Bell,
      color: 'purple',
      route: '/alerts'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Mission Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>ALL 8 NORTH EASTERN STATES MONITORED</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
              STATION: GHY-HQ-01
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NER-LIFELINE Central Operations Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Autonomous logistics, dynamic monsoon risk routing, cold-chain temperature preservation, and blackout-resilient LoRa DTN mesh coordination.
          </p>
        </div>

        {/* Quick Tactical Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/live-map')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center space-x-2 transition-all cursor-pointer hover:scale-105"
          >
            <Navigation size={15} />
            <span>Launch Live Map</span>
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="px-3.5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Bell size={15} className="animate-bounce text-rose-400" />
            <span>Emergency Siren</span>
          </button>
          <button
            onClick={() => navigate('/mesh')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Network size={15} className="text-cyan-400" />
            <span>MESH Ping</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.title}
              onClick={() => navigate(k.route)}
              className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-${k.color}-500/10 border border-${k.color}-500/20 text-${k.color}-400 group-hover:scale-110 transition-transform`}>
                  <Icon size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold text-white tracking-tight">{k.val}</div>
                <div className="text-xs font-semibold text-slate-300 mt-0.5">{k.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">{k.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Regional Quick View & Live Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* NER Regional Strategic Map Preview */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Route size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">North Eastern Strategic Highway Corridors</h2>
                <p className="text-xs text-slate-400">Real-time connectivity across the 8 Sister States</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/live-map')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Screen Live Map</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Interactive SVG Network Map */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 relative overflow-hidden">
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Click any strategic hub to route from that location:</span>
            </div>

            <svg viewBox="0 0 500 240" className="w-full h-56 sm:h-64 select-none">
              <defs>
                <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Highway Inter-Hub Lines */}
              <line x1="120" y1="130" x2="170" y2="170" stroke="#334155" strokeWidth="2" strokeDasharray="3,3" />
              <line x1="120" y1="130" x2="230" y2="70" stroke="#10b981" strokeWidth="2.5" />
              <line x1="230" y1="70" x2="340" y2="50" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4,2" />
              <line x1="120" y1="130" x2="290" y2="140" stroke="#3b82f6" strokeWidth="2.5" />
              <line x1="290" y1="140" x2="330" y2="155" stroke="#3b82f6" strokeWidth="2.5" />
              <line x1="330" y1="155" x2="350" y2="195" stroke="#3b82f6" strokeWidth="2.5" />
              <line x1="170" y1="170" x2="250" y2="210" stroke="#334155" strokeWidth="2" />
              <line x1="250" y1="210" x2="280" y2="225" stroke="#334155" strokeWidth="2" />

              {/* Hub Nodes */}
              {[
                { name: 'Guwahati (GHY Hub)', x: 120, y: 130, hubId: 'guwahati', isMain: true },
                { name: 'Shillong (NH-06)', x: 170, y: 170, hubId: 'shillong' },
                { name: 'Tezpur Base', x: 230, y: 70, hubId: 'tezpur' },
                { name: 'Tawang (Sela Pass)', x: 340, y: 50, hubId: 'tawang', isBlocked: true },
                { name: 'Dimapur Transshipment', x: 290, y: 140, hubId: 'dimapur' },
                { name: 'Kohima Relief Camp', x: 330, y: 155, hubId: 'kohima' },
                { name: 'Imphal Valley Base', x: 350, y: 195, hubId: 'imphal' },
                { name: 'Silchar Railhead', x: 250, y: 210, hubId: 'silchar' },
                { name: 'Aizawl Depot', x: 280, y: 225, hubId: 'aizawl' },
              ].map((h) => (
                <g
                  key={h.name}
                  className="cursor-pointer group"
                  onClick={() => navigate(`/live-map?origin=${h.hubId}`)}
                >
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.isMain ? 8 : 6}
                    fill={h.isBlocked ? '#f43f5e' : h.isMain ? '#3b82f6' : '#10b981'}
                    className="transition-transform group-hover:scale-125"
                  />
                  {h.isBlocked && (
                    <circle cx={h.x} cy={h.y} r="12" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping" />
                  )}
                  <text
                    x={h.x}
                    y={h.y - 10}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="9"
                    fontWeight="bold"
                    className="pointer-events-none drop-shadow group-hover:fill-white"
                  >
                    {h.name}
                  </text>
                </g>
              ))}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850 text-[10px] text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span>Major Hub</span></span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>Operational Highway</span></span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span><span>Blockage / Escort</span></span>
              </div>
              <span className="font-mono text-slate-500">Click any point to launch AI router</span>
            </div>
          </div>
        </div>

        {/* Regional Monsoon & Highland Weather Telemetry */}
        <div className="lg:col-span-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <CloudRain size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Monsoon & Weather Radar</h3>
                  <p className="text-[11px] text-slate-400">Terrain Precipitation Feeds</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Live IMD
              </span>
            </div>

            {/* Selected City Focus Card */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white">{selectedCity.city}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({selectedCity.state})</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold bg-${selectedCity.color}-500/20 text-${selectedCity.color}-400 border border-${selectedCity.color}-500/40`}>
                  {selectedCity.risk} Risk
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-white">{selectedCity.temp}°C</span>
                <span className="text-xs text-slate-300 font-medium">{selectedCity.condition}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
                <div className="flex items-center space-x-1">
                  <CloudRain size={11} className="text-blue-400" />
                  <span>Rain: <strong className="text-white">{selectedCity.rainMm} mm/h</strong></span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wind size={11} className="text-cyan-400" />
                  <span>Wind: <strong className="text-white">{selectedCity.windKmh} km/h</strong></span>
                </div>
              </div>
            </div>

            {/* Station List Selector */}
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {WEATHER_STATIONS.map((st) => (
                <button
                  key={st.city}
                  onClick={() => setSelectedCity(st)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedCity.city === st.city
                      ? 'bg-blue-600/20 border-blue-500/60 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-semibold">{st.city}</span>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-slate-400">{st.temp}°C</span>
                    <span className={`w-2 h-2 rounded-full bg-${st.color}-400`}></span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Radar Refresh: 60s</span>
            <button
              onClick={() => navigate('/risk-analysis')}
              className="text-blue-400 hover:text-blue-300 font-bold"
            >
              Full Risk Matrix →
            </button>
          </div>
        </div>
      </div>

      {/* Critical Relief Shipments & Live Blockages Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Emergency Shipments Table */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Package size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Highland Medical Shipments</h3>
                <p className="text-xs text-slate-400">Cold-chain monitoring & live ETAs</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/shipments')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({OPERATIONAL_SHIPMENT_ROUTES.length})</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2.5">
            {OPERATIONAL_SHIPMENT_ROUTES.slice(0, 4).map((sh) => (
              <div
                key={sh.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-xs text-white">{sh.id}</span>
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {sh.category}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono flex items-center space-x-1">
                      <Thermometer size={10} />
                      <span>{sh.temperature}</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {sh.origin} → <strong className="text-white">{sh.destination}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Carrier: {sh.vehicle} • Driver: {sh.driver}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">ETA: {sh.eta}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Status: {sh.status}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/live-map?vehicle=${sh.vehicle}`)}
                    className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[10px] font-bold cursor-pointer transition-all"
                  >
                    Track on Live Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Field Incidents & Blockages Feed */}
        <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Road Hazards</h3>
                  <p className="text-xs text-slate-400">Field Incident & Obstruction Feeds</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
              >
                <span>Full Feed</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {OPERATIONAL_BLOCKED_ROADS.map((blk) => (
                <div
                  key={blk.id}
                  className="p-3 rounded-xl bg-slate-950 border border-rose-900/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-rose-400 flex items-center space-x-1">
                      <AlertTriangle size={12} />
                      <span>{blk.highway} • {blk.location}</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {blk.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {blk.reason}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Clearing: <strong className="text-slate-300">{blk.clearingAuthority}</strong></span>
                    <span>Est: <strong className="text-amber-400">{blk.estimatedClearance}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => navigate('/live-map')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-white flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Navigation size={14} className="text-blue-400" />
              <span>Inspect Hazards on Live Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
