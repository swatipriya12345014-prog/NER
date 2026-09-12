import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, BarChart3, AlertTriangle,
  MapPin, ArrowUpRight, Navigation, Bell,
  ChevronRight, Clock, CheckCircle2, RefreshCw,
  TrendingUp, Boxes, Route, Activity,
  Fuel, Shield, ArrowRight, Layers,
  ExternalLink, Thermometer, CircleDot
} from 'lucide-react';
import {
  OPERATIONAL_SHIPMENT_ROUTES,
  OPERATIONAL_BLOCKED_ROADS,
  OPERATIONAL_ALERTS
} from '../services/googleDirectionsService';
import { REGIONAL_HUBS, FALLBACK_FLEET_VEHICLES } from '../services/fuelRouteService';

// Manager-specific Supply Chain KPIs
const SUPPLY_CHAIN_KPIS = [
  {
    title: 'Active Relief Shipments',
    val: '12',
    sub: '8 In-Transit • 4 Staging',
    icon: Package,
    color: 'amber',
    route: '/shipments',
    trend: '+3 today'
  },
  {
    title: 'Fleet Utilization',
    val: '87.5%',
    sub: '14 of 16 vehicles deployed',
    icon: Truck,
    color: 'blue',
    route: '/vehicles',
    trend: '↑ 12% vs yesterday'
  },
  {
    title: 'Delivery Completion Rate',
    val: '94.2%',
    sub: '33 of 35 consignments delivered on-time',
    icon: CheckCircle2,
    color: 'emerald',
    route: '/analytics',
    trend: '↑ 2.1% this week'
  },
  {
    title: 'Supply Chain Alerts',
    val: '4 Active',
    sub: '2 Critical • 1 High • 1 Medium',
    icon: AlertTriangle,
    color: 'rose',
    route: '/alerts',
    trend: '↓ 2 resolved today'
  }
];

// Shipment Pipeline Status Categories
const PIPELINE_STATUS = [
  { label: 'Staging', count: 4, color: 'slate', icon: Boxes },
  { label: 'In-Transit', count: 8, color: 'amber', icon: Truck },
  { label: 'At Checkpoint', count: 2, color: 'blue', icon: Shield },
  { label: 'Delivered', count: 33, color: 'emerald', icon: CheckCircle2 },
  { label: 'Delayed', count: 2, color: 'rose', icon: AlertTriangle },
];

// Recent Logistics Activity Feed
const RECENT_ACTIVITY = [
  {
    id: 'act-1',
    action: 'Shipment NER-MED-8492 cleared Bomdila checkpoint',
    detail: 'Cold-chain integrity verified at -4.2°C • Driver: Tsering Dorjee',
    time: '12 min ago',
    type: 'transit',
    color: 'emerald'
  },
  {
    id: 'act-2',
    action: 'Fleet Vehicle AS-11-RC-3320 refueled at Silchar Hub',
    detail: '70L diesel topped off • Range extended to 458 km',
    time: '28 min ago',
    type: 'fuel',
    color: 'blue'
  },
  {
    id: 'act-3',
    action: 'Route diversion activated for NH-13 convoy',
    detail: 'Sela Pass landslide bypass via BCT corridor • +45 min ETA impact',
    time: '42 min ago',
    type: 'alert',
    color: 'amber'
  },
  {
    id: 'act-4',
    action: 'Shipment SHP-NER-7712 delivered to Kohima Ridge',
    detail: '250 snake antivenom vials received by District Medical Officer',
    time: '1h 15m ago',
    type: 'delivered',
    color: 'emerald'
  },
  {
    id: 'act-5',
    action: 'New relief consignment staged at Guwahati Central',
    detail: '40 portable oxygen concentrators • Priority: HIGH • Dest: Silchar Valley',
    time: '1h 40m ago',
    type: 'staging',
    color: 'slate'
  }
];

// Depot Inventory Summary
const DEPOT_INVENTORY = [
  { hub: 'Guwahati Central', state: 'Assam', stockLevel: 92, shipmentsPending: 3, status: 'Optimal' },
  { hub: 'Shillong Highland', state: 'Meghalaya', stockLevel: 78, shipmentsPending: 2, status: 'Adequate' },
  { hub: 'Silchar Staging', state: 'Assam', stockLevel: 45, shipmentsPending: 4, status: 'Low' },
  { hub: 'Tawang Border', state: 'Arunachal', stockLevel: 31, shipmentsPending: 1, status: 'Critical' },
  { hub: 'Imphal Station', state: 'Manipur', stockLevel: 67, shipmentsPending: 2, status: 'Adequate' },
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Manager Welcome Header — Amber/Gold Identity */}
      <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-900 border border-amber-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>LOGISTICS OPERATIONS MANAGER</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Supply Chain Command • NER-LIFELINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Logistics Operations Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Real-time supply chain monitoring, fleet allocation, shipment tracking, and delivery performance analytics across all 8 North Eastern states.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/shipments')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-xl shadow-amber-900/30 flex items-center space-x-2.5 transition-all cursor-pointer btn-press"
          >
            <Package size={18} />
            <span>Manage Shipments</span>
          </button>
          <button
            onClick={() => navigate('/vehicles')}
            className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-bold text-sm shadow-lg flex items-center space-x-2 transition-all cursor-pointer btn-press"
          >
            <Truck size={17} />
            <span>Fleet Status</span>
          </button>
          <button
            onClick={handleRefresh}
            className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 text-slate-300 shadow-md transition-all cursor-pointer btn-press"
            title="Refresh Supply Chain Data"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Supply Chain KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUPPLY_CHAIN_KPIS.map((k, idx) => {
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
              <div className="mt-2 pt-2 border-t border-slate-800">
                <span className={`text-[10px] font-bold text-${k.color}-400`}>{k.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Supply Chain Pipeline Visual */}
      <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in-up stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Route size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Supply Chain Pipeline</h2>
              <p className="text-xs text-slate-400">Live consignment status across all logistics stages</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/analytics')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer btn-press"
          >
            <span>Full Analytics</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PIPELINE_STATUS.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors text-center space-y-2"
              >
                <div className={`mx-auto p-2.5 rounded-xl bg-${stage.color}-500/10 border border-${stage.color}-500/20 text-${stage.color}-400 w-fit`}>
                  <Icon size={20} />
                </div>
                <div className="text-2xl font-black text-white">{stage.count}</div>
                <div className={`text-xs font-bold text-${stage.color}-400`}>{stage.label}</div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Progress Bar */}
        <div className="pt-2">
          <div className="flex items-center text-[10px] text-slate-400 font-bold mb-1.5 justify-between">
            <span>Pipeline Flow</span>
            <span>49 Total Consignments</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
            <div className="bg-slate-600 h-full" style={{ width: '8.2%' }} title="Staging: 4"></div>
            <div className="bg-amber-500 h-full" style={{ width: '16.3%' }} title="In-Transit: 8"></div>
            <div className="bg-blue-500 h-full" style={{ width: '4.1%' }} title="At Checkpoint: 2"></div>
            <div className="bg-emerald-500 h-full" style={{ width: '67.3%' }} title="Delivered: 33"></div>
            <div className="bg-rose-500 h-full" style={{ width: '4.1%' }} title="Delayed: 2"></div>
          </div>
        </div>
      </div>

      {/* 4. Split: Active Shipments + Depot Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Shipments Feed */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Package size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Priority Shipments In-Transit</h3>
                <p className="text-xs text-slate-400">Cold-chain & critical cargo monitoring</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/shipments')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>All Shipments</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {OPERATIONAL_SHIPMENT_ROUTES.map((sh) => (
              <div
                key={sh.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-xs text-white">{sh.tracking_id || sh.id}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {sh.cargo?.split(' ')[0] || sh.priority}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-semibold">
                    {sh.origin} ➔ <strong className="text-white">{sh.destination}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>Vehicle: <strong className="text-slate-300 font-mono">{sh.vehicle_plate || sh.vehicle}</strong></span>
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
                    onClick={() => navigate('/live-map')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <Navigation size={12} />
                    <span>Track</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Additional static shipments to fill the view */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-extrabold text-xs text-white">NER-REL-5571</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Tarpaulins
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-semibold">
                  Guwahati Central ➔ <strong className="text-white">Kohima Ridge Outpost</strong>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                  <span>Vehicle: <strong className="text-slate-300 font-mono">NL-07-RB-2210</strong></span>
                  <span>•</span>
                  <span>Driver: Kevi Zashümo</span>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-900">
                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-white block">ETA: 2h 50m</span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>In Transit</span>
                  </span>
                </div>
                <button
                  onClick={() => navigate('/live-map')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                >
                  <Navigation size={12} />
                  <span>Track</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Depot Inventory + Activity */}
        <div className="lg:col-span-5 space-y-4">
          {/* Depot Inventory Levels */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Depot Stock Levels</h4>
                  <p className="text-[10px] text-slate-400">Regional hub inventory readiness</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {DEPOT_INVENTORY.map((depot) => (
                <div key={depot.hub} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{depot.hub}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{depot.state}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      depot.status === 'Optimal' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      depot.status === 'Adequate' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      depot.status === 'Low' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {depot.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          depot.stockLevel >= 80 ? 'bg-emerald-500' :
                          depot.stockLevel >= 60 ? 'bg-blue-500' :
                          depot.stockLevel >= 40 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${depot.stockLevel}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-300 w-10 text-right">{depot.stockLevel}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <span>{depot.shipmentsPending} shipments pending dispatch</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Recent Activity</h4>
                  <p className="text-[10px] text-slate-400">Latest logistics events</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {RECENT_ACTIVITY.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <CircleDot size={10} className={`text-${act.color}-400 flex-shrink-0 mt-0.5`} />
                      <span className="text-xs font-bold text-white leading-snug">{act.action}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap flex-shrink-0">{act.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed pl-4">{act.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Fleet Allocation Quick View */}
      <div className="glass-card rounded-2xl p-5 shadow-xl space-y-3 animate-fade-in-up stagger-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Fleet Allocation Overview</h2>
              <p className="text-xs text-slate-400">Vehicle deployment across regional depots</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/vehicles')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer btn-press"
          >
            <span>Full Fleet Registry</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {FALLBACK_FLEET_VEHICLES.slice(0, 4).map((veh) => (
            <div
              key={veh.id}
              className="p-4 rounded-xl glass-card-interactive cursor-pointer group shadow-md space-y-3"
              onClick={() => navigate('/vehicles')}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {veh.license_plate || veh.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  veh.status === 'In Transit' || veh.is_in_transit
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                }`}>
                  {veh.status || (veh.is_in_transit ? 'In Transit' : 'Standby')}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                  {veh.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  {veh.current_location} • {veh.vehicle_type}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Fuel size={12} className="text-amber-400" />
                  <span className="font-mono">{veh.fuel_percentage}%</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono">{veh.remaining_range_km} km range</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Active Supply Chain Disruptions */}
      {OPERATIONAL_BLOCKED_ROADS.length > 0 && (
        <div className="bg-slate-900/95 border border-rose-900/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supply Chain Disruptions</h3>
                <p className="text-xs text-slate-400">Active road blockages affecting shipment routes</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>All Alerts</span>
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
                    onClick={() => navigate('/live-map')}
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-0.5"
                  >
                    <span>View Impact</span>
                    <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
