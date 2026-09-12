import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Truck, Thermometer, Clock, MapPin, CheckCircle2, 
  AlertTriangle, Shield, Search, Filter, Plus, ArrowRight, 
  ExternalLink, Snowflake, HeartPulse, RefreshCw, X
} from 'lucide-react';
import { OPERATIONAL_SHIPMENT_ROUTES } from '../services/googleDirectionsService';
import { REGIONAL_HUBS } from '../services/fuelRouteService';

// Comprehensive Highland Relief Shipments Database
const INITIAL_SHIPMENTS = [
  {
    id: 'SHP-NER-8821',
    cargo: 'Emergency Blood Plasma (O-Negative)',
    category: 'Critical Medical',
    priority: 'Urgent',
    status: 'In-Transit',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Tawang Border Relief Center (Arunachal Pradesh)',
    vehicle: 'Highland Rapid Ambulance 01 (AS-01-EV-4421)',
    driver: 'Tashi Namgyal',
    coldChainTemp: '-4.2°C',
    coldChainStatus: 'Optimal',
    departureTime: '10 Sep 2026, 06:30 AM',
    estimatedArrival: '10 Sep 2026, 06:23 PM',
    distanceKm: 418.4,
    notes: 'Cold-chain priority vaccine/plasma container. Fortified detour via NH-15.'
  },
  {
    id: 'SHP-NER-9904',
    cargo: 'Portable Medical Oxygen Concentrators (40 Units)',
    category: 'Respiratory Equipment',
    priority: 'High',
    status: 'In-Transit',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Silchar Valley Relief Depot (Assam)',
    vehicle: 'Silchar Valley Relief Carrier (AS-11-RC-3320)',
    driver: 'Rahmat Ali',
    coldChainTemp: 'Ambient (21°C)',
    coldChainStatus: 'N/A',
    departureTime: '10 Sep 2026, 08:15 AM',
    estimatedArrival: '10 Sep 2026, 04:30 PM',
    distanceKm: 215.4,
    notes: 'Hospital replenishment for Barak Valley. Diverting away from Lumshnong flood zone.'
  },
  {
    id: 'SHP-NER-7712',
    cargo: 'Polyvalent Snake Antivenom Vials (250 Doses)',
    category: 'Critical Medical',
    priority: 'High',
    status: 'In-Transit',
    origin: 'Tezpur Airforce Relief Base (Assam)',
    destination: 'Zunheboto Mountain Outpost (Nagaland)',
    vehicle: 'Mountain Blood Express 02 (ML-05-BX-1092)',
    driver: 'Biren Das',
    coldChainTemp: '+3.8°C',
    coldChainStatus: 'Optimal',
    departureTime: '10 Sep 2026, 09:00 AM',
    estimatedArrival: '10 Sep 2026, 05:45 PM',
    distanceKm: 285.0,
    notes: 'Urgent anti-snake venom replenishment following heavy valley rains.'
  },
  {
    id: 'SHP-NER-6540',
    cargo: 'Highland Water Purification Tablets & Electrolytes',
    category: 'Disaster Relief',
    priority: 'Normal',
    status: 'Out for Delivery',
    origin: 'Shillong Highland Base (Meghalaya)',
    destination: 'Mairang Sub-Division Depot (Meghalaya)',
    vehicle: 'Barapani Emergency Patrol (ML-01-EP-8833)',
    driver: 'Wanbiang Dkhar',
    coldChainTemp: 'Ambient',
    coldChainStatus: 'N/A',
    departureTime: '10 Sep 2026, 11:00 AM',
    estimatedArrival: '10 Sep 2026, 01:30 PM',
    distanceKm: 48.0,
    notes: 'Supplying flood-affected rural villages along Umiam basin.'
  },
  {
    id: 'SHP-NER-5519',
    cargo: 'Emergency Orthopedic Trauma Kits (150 Kits)',
    category: 'Critical Medical',
    priority: 'High',
    status: 'Delivered',
    origin: 'Dimapur Regional Logistics Hub (Nagaland)',
    destination: 'Kohima Ridge Relief Outpost (Nagaland)',
    vehicle: 'Brahmaputra Heavy Supply 03 (AS-01-TR-9904)',
    driver: 'Hemen Bora',
    coldChainTemp: 'Ambient',
    coldChainStatus: 'N/A',
    departureTime: '09 Sep 2026, 02:00 PM',
    estimatedArrival: '09 Sep 2026, 05:15 PM',
    distanceKm: 74.0,
    notes: 'Successfully delivered to Naga Hospital Authority Kohima.'
  },
  {
    id: 'SHP-NER-4402',
    cargo: 'Pediatric Vaccines (Measles & Polio)',
    category: 'Cold-Chain Vaccines',
    priority: 'Urgent',
    status: 'Delivered',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Imphal Valley Relief Station (Manipur)',
    vehicle: 'Tawang High-Altitude 4x4 (AR-02-AT-5511)',
    driver: 'Lobsang Dorjee',
    coldChainTemp: '+2.4°C',
    coldChainStatus: 'Optimal',
    departureTime: '09 Sep 2026, 05:00 AM',
    estimatedArrival: '09 Sep 2026, 06:30 PM',
    distanceKm: 489.0,
    notes: 'Delivered with zero cold-chain excursion.'
  }
];

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewDispatchModal, setShowNewDispatchModal] = useState(false);

  // New Dispatch Form State
  const [newDispatch, setNewDispatch] = useState({
    cargo: '',
    category: 'Critical Medical',
    priority: 'Urgent',
    origin: REGIONAL_HUBS[0]?.name || 'Guwahati Central Depot (Assam)',
    destination: REGIONAL_HUBS[2]?.name || 'Tawang Border Relief Center (Arunachal Pradesh)',
    vehicle: 'Highland Rapid Ambulance 01 (AS-01-EV-4421)',
    coldChain: true,
    notes: ''
  });

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = 
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cargo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'cold-chain' ? s.coldChainStatus === 'Optimal' : s.category.toLowerCase().includes(categoryFilter.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status.toLowerCase().replace(/\s+/g, '-') === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateDispatch = (e) => {
    e.preventDefault();
    if (!newDispatch.cargo) return;

    const item = {
      id: `SHP-NER-${Math.floor(1000 + Math.random() * 9000)}`,
      cargo: newDispatch.cargo,
      category: newDispatch.category,
      priority: newDispatch.priority,
      status: 'In-Transit',
      origin: newDispatch.origin,
      destination: newDispatch.destination,
      vehicle: newDispatch.vehicle,
      driver: 'Field Driver Assigned',
      coldChainTemp: newDispatch.coldChain ? '-3.5°C' : 'Ambient',
      coldChainStatus: newDispatch.coldChain ? 'Optimal' : 'N/A',
      departureTime: 'Just Now',
      estimatedArrival: 'Calculating via AI Router...',
      distanceKm: 240,
      notes: newDispatch.notes || 'Emergency highland corridor dispatch.'
    };

    setShipments([item, ...shipments]);
    setShowNewDispatchModal(false);
    setNewDispatch({
      cargo: '',
      category: 'Critical Medical',
      priority: 'Urgent',
      origin: REGIONAL_HUBS[0]?.name,
      destination: REGIONAL_HUBS[2]?.name,
      vehicle: 'Highland Rapid Ambulance 01 (AS-01-EV-4421)',
      coldChain: true,
      notes: ''
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Package size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Critical Highland Relief Shipments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time cold-chain tracking, medical supplies, and humanitarian transport corridors across the 8 North Eastern states.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => navigate('/live-map')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 font-bold text-xs text-slate-200 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>Live Map Corridors</span>
            <ExternalLink size={13} />
          </button>
          <button
            onClick={() => setShowNewDispatchModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>New Emergency Dispatch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up stagger-1">
        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Shipments</span>
            <Package size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{shipments.length}</div>
          <p className="text-[10px] text-slate-500">Across 8 NER regional hubs</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active In-Transit</span>
            <Truck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {shipments.filter(s => s.status === 'In-Transit' || s.status === 'Out for Delivery').length}
          </div>
          <p className="text-[10px] text-emerald-400/80">Continuous GPS tracked</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cold-Chain Monitored</span>
            <Snowflake size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {shipments.filter(s => s.coldChainStatus === 'Optimal').length}
          </div>
          <p className="text-[10px] text-cyan-400/80">Zero temperature excursions</p>
        </div>

        <div className="glass-card-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Urgent Medical</span>
            <HeartPulse size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {shipments.filter(s => s.priority === 'Urgent').length}
          </div>
          <p className="text-[10px] text-rose-400/80">Highest convoy priority</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cargo, ID, destination, vehicle..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['all', 'critical medical', 'cold-chain', 'disaster relief'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md capitalize font-semibold cursor-pointer transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="in-transit">In-Transit</option>
            <option value="out-for-delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Shipments Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredShipments.map((s) => (
          <div
            key={s.id}
            className="glass-card-interactive p-4 rounded-xl space-y-3 animate-fade-in"
          >
            {/* Top row: ID & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-400 text-xs">{s.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  s.priority === 'Urgent' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {s.priority} Priority
                </span>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                s.status === 'In-Transit' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : s.status === 'Delivered'
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              }`}>
                ● {s.status}
              </span>
            </div>

            {/* Cargo name */}
            <div>
              <h3 className="font-bold text-sm text-white">{s.cargo}</h3>
              <p className="text-[11px] text-slate-400">{s.category}</p>
            </div>

            {/* Route corridor */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 text-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400">Origin:</span>
                <span className="font-medium text-white truncate">{s.origin}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-slate-400">Destination:</span>
                <span className="font-medium text-white truncate">{s.destination}</span>
              </div>
            </div>

            {/* Telemetry metadata: Temperature & Vehicle */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-slate-500 flex items-center space-x-1">
                  <Snowflake size={12} className="text-cyan-400" />
                  <span>Cold-Chain Temp</span>
                </div>
                <div className="font-mono font-bold text-cyan-300 mt-0.5">
                  {s.coldChainTemp}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-slate-500 flex items-center space-x-1">
                  <Truck size={12} className="text-blue-400" />
                  <span>Assigned Vehicle</span>
                </div>
                <div className="font-bold text-slate-200 truncate mt-0.5">
                  {s.vehicle.split('(')[0]}
                </div>
              </div>
            </div>

            {/* Notes */}
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              "{s.notes}"
            </p>

            {/* Footer action */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                ETA: {s.estimatedArrival} ({s.distanceKm} km)
              </span>
              <button
                onClick={() => navigate(`/live-map?track=true&query=${encodeURIComponent(s.vehicle)}`)}
                className="btn-press px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer"
              >
                <span>Track on Live Map</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Dispatch Modal */}
      {showNewDispatchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full p-5 rounded-2xl shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <Plus size={16} className="text-blue-400" />
                <span>Create Emergency Dispatch Order</span>
              </div>
              <button
                onClick={() => setShowNewDispatchModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cargo Item / Medical Supplies</label>
                <input
                  type="text"
                  required
                  value={newDispatch.cargo}
                  onChange={(e) => setNewDispatch({ ...newDispatch, cargo: e.target.value })}
                  placeholder="e.g. O-Negative Blood Plasma, Insulin Vials, Oxygen Tanks"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newDispatch.category}
                    onChange={(e) => setNewDispatch({ ...newDispatch, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Critical Medical">Critical Medical</option>
                    <option value="Cold-Chain Vaccines">Cold-Chain Vaccines</option>
                    <option value="Respiratory Equipment">Respiratory Equipment</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Convoy Priority</label>
                  <select
                    value={newDispatch.priority}
                    onChange={(e) => setNewDispatch({ ...newDispatch, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Urgent">Urgent (Immediate Siren)</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Origin Hub</label>
                  <select
                    value={newDispatch.origin}
                    onChange={(e) => setNewDispatch({ ...newDispatch, origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
                  >
                    {REGIONAL_HUBS.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destination Hub</label>
                  <select
                    value={newDispatch.destination}
                    onChange={(e) => setNewDispatch({ ...newDispatch, destination: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
                  >
                    {REGIONAL_HUBS.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="cold-chain-chk"
                  checked={newDispatch.coldChain}
                  onChange={(e) => setNewDispatch({ ...newDispatch, coldChain: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="cold-chain-chk" className="text-slate-300 font-medium cursor-pointer">
                  Requires Active Cold-Chain Temperature Telemetry (-4°C to +4°C)
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewDispatchModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors shadow"
                >
                  Dispatch Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
