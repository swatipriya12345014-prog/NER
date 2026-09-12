import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, AlertTriangle, Network,
  MapPin, Shield, Activity, ArrowUpRight,
  Route, Sparkles, Navigation, Bell,
  ChevronRight, Thermometer, Wind, CloudRain,
  Clock, CheckCircle2, Radio, ExternalLink,
  ShieldCheck, RefreshCw, Layers, ArrowRight
} from 'lucide-react';
import { 
  OPERATIONAL_BLOCKED_ROADS, 
  OPERATIONAL_SHIPMENT_ROUTES 
} from '../services/googleDirectionsService';
import { REGIONAL_HUBS } from '../services/fuelRouteService';

// Strategic Highway Corridors for 1-Click Interactive Routing
const POPULAR_CORRIDORS = [
  {
    id: 'ghy-shl',
    originId: 'guwahati',
    destId: 'shillong',
    name: 'Guwahati ➔ Shillong Expressway',
    highway: 'NH-06',
    distance: '98 km',
    duration: '2h 15m',
    status: 'Clear & Passable',
    statusColor: 'emerald',
    riskScore: 28,
    desc: 'Primary lifeline connecting Assam plains to Meghalaya plateau.'
  },
  {
    id: 'tzp-twg',
    originId: 'tezpur',
    destId: 'tawang',
    name: 'Tezpur ➔ Tawang Highland Pass',
    highway: 'NH-13',
    distance: '320 km',
    duration: '7h 45m',
    status: 'Sela Pass Escort',
    statusColor: 'rose',
    riskScore: 78,
    desc: 'High-altitude strategic pass (13,700 ft) with active BRO clearance.'
  },
  {
    id: 'dmp-khm',
    originId: 'dimapur',
    destId: 'kohima',
    name: 'Dimapur ➔ Kohima Hill Road',
    highway: 'NH-29',
    distance: '74 km',
    duration: '2h 10m',
    status: 'Caution (Debris)',
    statusColor: 'amber',
    riskScore: 46,
    desc: 'Steep hill climb connecting Nagaland railhead to capital base.'
  },
  {
    id: 'slc-imp',
    originId: 'silchar',
    destId: 'imphal',
    name: 'Silchar ➔ Imphal Lifeline',
    highway: 'NH-37',
    distance: '258 km',
    duration: '6h 30m',
    status: 'Convoy Escort',
    statusColor: 'amber',
    riskScore: 58,
    desc: 'Critical medical supply line through Barak Valley to Manipur.'
  }
];

// Highland Weather Telemetry Across Key Mountain Stations
const WEATHER_STATIONS = [
  { city: 'Guwahati', state: 'Assam', temp: 28, condition: 'Light Rain', rainMm: 3.2, windKmh: 8, status: 'Clear', color: 'emerald' },
  { city: 'Shillong', state: 'Meghalaya', temp: 17, condition: 'Monsoon Mist', rainMm: 44.6, windKmh: 24, status: 'Foggy', color: 'amber' },
  { city: 'Tawang', state: 'Arunachal', temp: 8, condition: 'Dense Fog', rainMm: 18.0, windKmh: 16, status: 'Severe', color: 'rose' },
  { city: 'Imphal', state: 'Manipur', temp: 24, condition: 'Clear Skies', rainMm: 0.0, windKmh: 6, status: 'Optimal', color: 'emerald' },
  { city: 'Kohima', state: 'Nagaland', temp: 19, condition: 'Drizzle', rainMm: 8.5, windKmh: 10, status: 'Moderate', color: 'amber' },
  { city: 'Gangtok', state: 'Sikkim', temp: 13, condition: 'Overcast', rainMm: 22.4, windKmh: 12, status: 'Moderate', color: 'amber' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedStation, setSelectedStation] = useState(WEATHER_STATIONS[0]);

  // Executive KPI Cards
  const kpis = [
    {
      title: 'Active Fleet Vehicles',
      val: '14 / 16',
      sub: '92% in service • 2 on standby',
      icon: Truck,
      color: 'blue',
      route: '/vehicles'
    },
    {
      title: 'Critical Relief Shipments',
      val: '8 In Transit',
      sub: '100% cold-chain preserved',
      icon: Package,
      color: 'emerald',
      route: '/shipments'
    },
    {
      title: 'Active Road Obstructions',
      val: '3 Hazards',
      sub: 'BRO clearance teams deployed',
      icon: AlertTriangle,
      color: 'rose',
      route: '/incidents'
    },
    {
      title: 'LIFELINE MESH Nodes',
      val: '18 / 18 Online',
      sub: '100% LoRa DTN blackout resilient',
      icon: Network,
      color: 'cyan',
      route: '/mesh'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcome & Primary Action Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ALL 8 STATES ONLINE</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Central Command • Guwahati HQ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NER-LIFELINE Smart Logistics Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            AI-powered highland route optimization, live vehicle telemetry, terrain risk tracking, and blackout-resilient disaster response.
          </p>
        </div>

        {/* Big, Clear CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/live-map')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-900/30 flex items-center space-x-2.5 transition-all cursor-pointer btn-press btn-glow-blue"
          >
            <Navigation size={18} />
            <span>Launch Live Interactive Map</span>
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="px-4 py-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-sm shadow-lg flex items-center space-x-2 transition-all cursor-pointer btn-press"
          >
            <Bell size={17} className="text-rose-400 animate-pulse" />
            <span>Emergency Alerts (4)</span>
          </button>
        </div>
      </div>

      {/* 2. Simple 3-Step Operations Guide ("How NER-LIFELINE Works") */}
      <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 border border-blue-800/40 rounded-2xl p-5 shadow-xl glass-card animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={15} className="text-amber-400 animate-pulse" />
              <span>Simple 3-Step Operations Guide</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              How NER-LIFELINE works in disaster and emergency logistics
            </h2>
          </div>
          <button
            onClick={() => navigate('/live-map')}
            className="self-start md:self-auto text-xs font-bold text-blue-300 hover:text-white bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-md btn-press"
          >
            <span>Open Interactive Map</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 transition-all glass-card-interactive">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-black">1</span>
              <span className="text-sm">Pick an Emergency Route</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Click any of the 4 Corridor cards below (e.g. Guwahati ➔ Shillong) or tap any two cities directly on the interactive Live Map.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 space-y-2 transition-all glass-card-interactive">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-black">2</span>
              <span className="text-sm">Inspect Real-time Fuel & Risks</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Our AI calculates vehicle fuel consumption under mountain terrain load and compares the Safest route vs Shortest route with fuel stop locations.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 rounded-xl p-4 space-y-2 transition-all glass-card-interactive">
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs font-black">3</span>
              <span className="text-sm">Blackout LoRa Resilience</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              When cellular networks go down in landslides, ESP32 nodes store-and-forward telemetry over 865 MHz mesh automatically.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={k.title}
              onClick={() => navigate(k.route)}
              className={`glass-card-interactive rounded-2xl p-5 cursor-pointer group shadow-xl flex flex-col justify-between animate-fade-in-up stagger-${idx + 1}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-${k.color}-500/10 border border-${k.color}-500/20 text-${k.color}-400 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
                <div className="flex items-center space-x-1 text-slate-500 group-hover:text-white transition-colors text-xs font-semibold">
                  <span>View</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-white tracking-tight">{k.val}</div>
                <div className="text-xs font-bold text-slate-300 mt-1">{k.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{k.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Interactive Quick Corridor Routing Bar */}
      <div className="glass-card rounded-2xl p-5 shadow-xl space-y-3 animate-fade-in-up stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Route size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1-Click Strategic Corridor Routing</h2>
              <p className="text-xs text-slate-400">Click any key highway corridor to route and inspect live conditions on the interactive map</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/live-map')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer btn-press"
          >
            <span>Custom Route Builder</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          {POPULAR_CORRIDORS.map((corridor, cIdx) => (
            <div
              key={corridor.id}
              onClick={() => navigate(`/live-map?origin=${corridor.originId}&dest=${corridor.destId}&autoRoute=true`)}
              className={`p-4 rounded-xl glass-card-interactive cursor-pointer group shadow-md flex flex-col justify-between space-y-3 animate-fade-in-up stagger-${cIdx + 1}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {corridor.highway}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-${corridor.statusColor}-500/20 text-${corridor.statusColor}-400 border border-${corridor.statusColor}-500/30`}>
                    {corridor.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors mt-2">
                  {corridor.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {corridor.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center space-x-2 font-mono">
                  <span>{corridor.distance}</span>
                  <span>•</span>
                  <span>{corridor.duration}</span>
                </div>
                <div className="text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                  <span>Route</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Active Relief Shipments & Live Road Hazards Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Medical & Relief Shipments */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Package size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Relief Shipments</h3>
                <p className="text-xs text-slate-400">Live cold-chain telemetry & highway transit</p>
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

          <div className="space-y-3">
            {OPERATIONAL_SHIPMENT_ROUTES.slice(0, 4).map((sh) => (
              <div
                key={sh.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-xs text-white">{sh.tracking_id || sh.id}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {sh.cargo || sh.category}
                    </span>
                    {sh.temperature && (
                      <span className="text-[10px] text-cyan-300 font-mono flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        <Thermometer size={10} />
                        <span>{sh.temperature}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-200 font-semibold">
                    {sh.origin} ➔ <strong className="text-white">{sh.destination}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>Vehicle: <strong className="text-slate-300 font-mono">{sh.vehicle}</strong></span>
                    <span>•</span>
                    <span>Driver: {sh.driver}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-900">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-white block">ETA: {sh.eta}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{sh.status}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/live-map?vehicle=${sh.vehicle}&autoRoute=true`)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <Navigation size={12} />
                    <span>Track on Map</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Mountain Hazards & Weather Feeds */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Road Hazards */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Road Hazards</h3>
                  <p className="text-xs text-slate-400">Landslide, rockfall & flood closures</p>
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

            <div className="space-y-2.5">
              {OPERATIONAL_BLOCKED_ROADS.map((blk) => (
                <div
                  key={blk.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-rose-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-rose-400 flex items-center space-x-1">
                      <AlertTriangle size={13} />
                      <span>{blk.highway} • {blk.name || blk.location}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {blk.status || 'CLOSED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {blk.reason}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900 font-medium">
                    <span>Clearing: <strong className="text-slate-200">{blk.clearing_eta || blk.estimatedClearance}</strong></span>
                    <button
                      onClick={() => navigate(`/live-map`)}
                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-0.5"
                    >
                      <span>Locate</span>
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highland Weather Radar Summary */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <CloudRain size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Monsoon & Weather Radar</h4>
                  <p className="text-[10px] text-slate-400">Highland Precipitation & Pass Visibility</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/risk-analysis')}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                Risk Matrix →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {WEATHER_STATIONS.slice(0, 6).map((st) => (
                <div
                  key={st.city}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1"
                >
                  <div className="text-xs font-bold text-white">{st.city}</div>
                  <div className="text-base font-black text-cyan-300">{st.temp}°C</div>
                  <div className={`text-[9px] font-semibold px-1.5 py-0.2 rounded inline-block bg-${st.color}-500/20 text-${st.color}-400`}>
                    {st.condition}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
