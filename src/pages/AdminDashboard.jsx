import React from 'react';
import {
  Truck, Package, AlertTriangle, ShieldAlert, Network,
  Clock, MapPin, Circle, Zap, CloudRain, Eye, Loader, Database,
  ArrowUpRight
} from 'lucide-react';

// ─── Placeholder Card ───────────────────────────────────
const AwaitingData = ({ message = 'Awaiting API connection', icon }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      {icon || <Database size={22} className="text-gray-300" />}
    </div>
    <p className="text-sm font-medium text-gray-400">{message}</p>
    <p className="text-xs text-gray-300 mt-1">Data will populate from backend API</p>
  </div>
);

// ─── KPI Skeleton Card ──────────────────────────────────
const KPICardSkeleton = ({ title, icon: Icon, color }) => {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',    border: 'border-blue-200' },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',  border: 'border-amber-200' },
    red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-600',      border: 'border-red-200' },
    orange:  { bg: 'bg-orange-50',  icon: 'bg-orange-100 text-orange-600', border: 'border-orange-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200' },
  };
  const c = colorMap[color];

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div className={`${c.icon} p-2.5 rounded-lg`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-20 bg-gray-200/60 rounded animate-pulse"></div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <div className="h-3 w-32 bg-gray-200/40 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

// ─── Section Header ─────────────────────────────────────
const SectionHeader = ({ title, icon, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center space-x-2">
      {icon}
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    {action && (
      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 hover:underline">
        <span>{action}</span>
        <ArrowUpRight size={14} />
      </button>
    )}
  </div>
);

// ─── NER Map Placeholder (Structure Only) ───────────────
const NERMapPlaceholder = () => {
  const locations = [
    { name: 'Guwahati', x: 180, y: 140 },
    { name: 'Shillong', x: 210, y: 170 },
    { name: 'Itanagar', x: 260, y: 60 },
    { name: 'Kohima', x: 310, y: 150 },
    { name: 'Imphal', x: 330, y: 190 },
    { name: 'Aizawl', x: 280, y: 240 },
    { name: 'Agartala', x: 220, y: 250 },
    { name: 'Dimapur', x: 290, y: 130 },
    { name: 'Tezpur', x: 200, y: 100 },
    { name: 'Silchar', x: 240, y: 220 },
    { name: 'Gangtok', x: 120, y: 80 },
    { name: 'Dibrugarh', x: 260, y: 95 },
  ];

  const routes = [
    [0, 1], [0, 8], [0, 6], [8, 11], [11, 2], [7, 3], [3, 4],
    [4, 5], [1, 9], [9, 5], [9, 6], [0, 7], [8, 10],
  ];

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-bold text-sm">NER Route Network</h3>
        <p className="text-slate-400 text-xs mt-0.5">Vehicle and incident data will load from API</p>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
          <Loader size={10} className="text-slate-500 animate-spin" />
          <span className="text-[10px] text-slate-500 font-medium">Awaiting API</span>
        </div>
      </div>

      <svg viewBox="0 0 450 310" className="w-full h-64 sm:h-80">
        {/* Grid dots */}
        {Array.from({ length: 20 }).map((_, i) =>
          Array.from({ length: 14 }).map((_, j) => (
            <circle key={`${i}-${j}`} cx={i * 24 + 10} cy={j * 24 + 10} r="0.5" fill="#334155" />
          ))
        )}

        {/* Routes */}
        {routes.map(([a, b], i) => (
          <line
            key={i}
            x1={locations[a].x} y1={locations[a].y}
            x2={locations[b].x} y2={locations[b].y}
            stroke="#334155" strokeWidth="1.5" strokeDasharray="4 3"
          />
        ))}

        {/* Location markers (static, no live status) */}
        {locations.map((loc, i) => (
          <g key={i}>
            <circle cx={loc.x} cy={loc.y} r="4" fill="#475569" opacity="0.5" />
            <circle cx={loc.x} cy={loc.y} r="2" fill="#64748b" />
            <text x={loc.x} y={loc.y - 10} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">
              {loc.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 text-xs text-slate-500 border-t border-slate-700">
        <span>Vehicle positions and incidents will render from live API</span>
        <div className="flex items-center space-x-1">
          <Circle size={6} fill="#64748b" className="text-slate-500" />
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────
const AdminDashboard = () => {
  const kpiCards = [
    { title: 'Active Vehicles', icon: Truck, color: 'blue' },
    { title: 'Critical Shipments', icon: Package, color: 'amber' },
    { title: 'High Risk Roads', icon: ShieldAlert, color: 'red' },
    { title: 'Active Incidents', icon: AlertTriangle, color: 'orange' },
    { title: 'Mesh Nodes Online', icon: Network, color: 'emerald' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">NER-LIFELINE Regional Operations Dashboard</p>
        </div>
        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
          <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <Loader size={10} className="text-amber-500 animate-spin" />
            <span className="text-xs font-bold text-amber-700">CONNECTING TO API</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
            <Clock size={12} className="text-gray-500" />
            <span className="text-xs text-gray-600 font-medium">Awaiting sync</span>
          </div>
        </div>
      </div>

      {/* KPI Cards (Skeleton) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <KPICardSkeleton key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Map + Weather */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <NERMapPlaceholder />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="Weather Conditions"
            icon={<CloudRain size={18} className="text-blue-500" />}
          />
          <AwaitingData message="Weather data awaiting API" icon={<CloudRain size={22} className="text-gray-300" />} />
        </div>
      </div>

      {/* Alerts + Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="Recent Alerts"
            icon={<Zap size={18} className="text-amber-500" />}
            action="View All"
          />
          <AwaitingData message="Alert feed awaiting API" icon={<Zap size={22} className="text-gray-300" />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="Critical Shipments"
            icon={<Package size={18} className="text-blue-500" />}
            action="View All"
          />
          {/* Table header to show the structure */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-2 font-semibold">ID</th>
                  <th className="text-left py-2 font-semibold">Route</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                  <th className="text-left py-2 font-semibold">ETA</th>
                  <th className="text-left py-2 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3"><div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="py-3"><div className="h-4 w-28 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="py-3"><div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="py-3"><div className="h-4 w-12 bg-gray-100 rounded animate-pulse"></div></td>
                    <td className="py-3"><div className="h-2 w-20 bg-gray-100 rounded-full animate-pulse"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">Shipment data will load from backend API</p>
        </div>
      </div>

      {/* Incidents + Risky Roads + MESH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="Recent Incidents"
            icon={<AlertTriangle size={18} className="text-red-500" />}
            action="View All"
          />
          <AwaitingData message="Incident data awaiting API" icon={<AlertTriangle size={22} className="text-gray-300" />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="High Risk Roads"
            icon={<ShieldAlert size={18} className="text-red-500" />}
            action="View All"
          />
          <AwaitingData message="Risk analysis awaiting API" icon={<ShieldAlert size={22} className="text-gray-300" />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionHeader
            title="LIFELINE MESH"
            icon={<Network size={18} className="text-emerald-500" />}
            action="View Details"
          />
          <AwaitingData message="MESH node data awaiting API" icon={<Network size={22} className="text-gray-300" />} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
