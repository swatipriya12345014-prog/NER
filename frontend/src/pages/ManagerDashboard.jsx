import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, Thermometer, Clock, MapPin, CheckCircle2,
  AlertTriangle, Shield, Search, Filter, Plus, ArrowRight,
  ExternalLink, Snowflake, HeartPulse, RefreshCw, X, Box,
  TrendingUp, BarChart3, AlertOctagon, Radio, ArrowUpRight,
  Users, Building, Check, ChevronRight, Navigation, Layers
} from 'lucide-react';
import { REGIONAL_HUBS } from '../services/fuelRouteService';
import { OPERATIONAL_BLOCKED_ROADS } from '../services/googleDirectionsService';

// Regional Logistics Hub Inventories
const REGIONAL_DEPOT_INVENTORIES = [
  {
    id: 'hub-guwahati',
    name: 'Guwahati Central Depot',
    state: 'Assam',
    type: 'Primary Central Distribution Hub',
    capacityUsed: 78,
    criticalSupplies: [
      { item: 'Cold-Chain Vaccines & Blood Plasma', units: '3,200 vials', status: 'Optimal', color: 'emerald' },
      { item: 'Medical Oxygen Concentrators (10L)', units: '142 units', status: 'Optimal', color: 'emerald' },
      { item: 'SDRF High-Calorie Ration Packs', units: '18,500 packs', status: 'Optimal', color: 'emerald' },
      { item: 'Polyvalent Snake Antivenom', units: '450 doses', status: 'Moderate', color: 'amber' }
    ]
  },
  {
    id: 'hub-shillong',
    name: 'Shillong Highland Depot',
    state: 'Meghalaya',
    type: 'Hill Sector Staging Base',
    capacityUsed: 84,
    criticalSupplies: [
      { item: 'Cold-Chain Vaccines & Blood Plasma', units: '480 vials', status: 'Low Stock', color: 'rose' },
      { item: 'Water Purification Tablets', units: '25,000 tabs', status: 'Optimal', color: 'emerald' },
      { item: 'High-Altitude Cold Weather Suits', units: '210 kits', status: 'Optimal', color: 'emerald' },
      { item: 'Medical Oxygen Concentrators (10L)', units: '28 units', status: 'Moderate', color: 'amber' }
    ]
  },
  {
    id: 'hub-silchar',
    name: 'Silchar Valley Depot',
    state: 'Assam / Barak Valley',
    type: 'Riverine Transit Hub',
    capacityUsed: 91,
    criticalSupplies: [
      { item: 'Medical Oxygen Concentrators (10L)', units: '12 units', status: 'Critical Low', color: 'rose' },
      { item: 'Trauma Surgical Kits', units: '95 sets', status: 'Optimal', color: 'emerald' },
      { item: 'Highland Rations', units: '6,400 packs', status: 'Optimal', color: 'emerald' },
      { item: 'Inflatable Rescue Boats', units: '8 units', status: 'Optimal', color: 'emerald' }
    ]
  },
  {
    id: 'hub-tawang',
    name: 'Tawang Mountain Base',
    state: 'Arunachal Pradesh',
    type: 'High-Altitude Border Staging Post (10,000 ft)',
    capacityUsed: 62,
    criticalSupplies: [
      { item: 'Portable Hyperbaric O2 Chambers', units: '6 units', status: 'Optimal', color: 'emerald' },
      { item: 'Cryo-Preserved Blood Plasma (O-Neg)', units: '45 bags', status: 'Low Stock', color: 'rose' },
      { item: 'High-Altitude Snow Chains & De-icer', units: '80 sets', status: 'Optimal', color: 'emerald' },
      { item: 'Emergency High-Calorie MREs', units: '3,800 units', status: 'Optimal', color: 'emerald' }
    ]
  }
];

// Initial Active Shipments Pipeline
const INITIAL_PIPELINE = [
  {
    id: 'SHP-NER-8821',
    cargo: 'Emergency Blood Plasma (O-Negative)',
    category: 'Critical Medical',
    priority: 'Urgent',
    pipelineStage: 'in_transit',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Tawang Border Relief Center (Arunachal Pradesh)',
    vehicle: 'Highland Rapid Ambulance 01 (AS-01-EV-4421)',
    driver: 'Tashi Namgyal',
    driverPhone: '+91 94350-11234',
    coldChainTemp: '-4.2°C',
    coldChainStatus: 'Optimal',
    progressPct: 62,
    eta: 'Today, 06:23 PM',
    routeCorridor: 'NH-13 via Bhalukpong & Sela Pass',
    diversionActive: false
  },
  {
    id: 'SHP-NER-9904',
    cargo: 'Portable Medical Oxygen Concentrators (40 Units)',
    category: 'Respiratory Equipment',
    priority: 'High',
    pipelineStage: 'at_risk',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Silchar Valley Relief Depot (Assam)',
    vehicle: 'Silchar Valley Relief Carrier (AS-11-RC-3320)',
    driver: 'Rahmat Ali',
    driverPhone: '+91 98640-55412',
    coldChainTemp: 'Ambient (21°C)',
    coldChainStatus: 'N/A',
    progressPct: 38,
    eta: 'Today, 07:15 PM (Delayed 45m)',
    routeCorridor: 'NH-06 Lumshnong Sector',
    diversionActive: true,
    diversionReason: 'Mudslide blocking Lumshnong pass. Reroute via bypass recommended.'
  },
  {
    id: 'SHP-NER-7712',
    cargo: 'Polyvalent Snake Antivenom Vials (250 Doses)',
    category: 'Critical Medical',
    priority: 'High',
    pipelineStage: 'in_transit',
    origin: 'Tezpur Airforce Relief Base (Assam)',
    destination: 'Zunheboto Mountain Outpost (Nagaland)',
    vehicle: 'Mountain Blood Express 02 (ML-05-BX-1092)',
    driver: 'Biren Das',
    driverPhone: '+91 94361-88901',
    coldChainTemp: '+3.8°C',
    coldChainStatus: 'Optimal',
    progressPct: 45,
    eta: 'Today, 05:45 PM',
    routeCorridor: 'NH-29 Dimapur ➔ Kohima bypass',
    diversionActive: false
  },
  {
    id: 'SHP-NER-4402',
    cargo: 'Pediatric Vaccines (Measles & Polio - 800 Vials)',
    category: 'Cold-Chain Vaccine',
    priority: 'Urgent',
    pipelineStage: 'pending_dispatch',
    origin: 'Guwahati Central Depot (Assam)',
    destination: 'Haflong Hill Station Clinic (Dima Hasao)',
    vehicle: 'Unassigned (Standby Unit Required)',
    driver: 'Pending Dispatch Assignment',
    driverPhone: 'N/A',
    coldChainTemp: '+4.0°C (Pre-cooled in Bay 3)',
    coldChainStatus: 'Optimal',
    progressPct: 0,
    eta: 'Requires 4x4 Escort',
    routeCorridor: 'NH-27 Lumding ➔ Haflong Pass',
    diversionActive: false
  },
  {
    id: 'SHP-NER-5519',
    cargo: 'Emergency Orthopedic Trauma Kits (150 Kits)',
    category: 'Critical Medical',
    priority: 'High',
    pipelineStage: 'delivered',
    origin: 'Dimapur Regional Logistics Hub (Nagaland)',
    destination: 'Kohima Ridge Relief Outpost (Nagaland)',
    vehicle: 'Brahmaputra Heavy Supply 03 (AS-01-TR-9904)',
    driver: 'Hemen Bora',
    driverPhone: '+91 97060-33214',
    coldChainTemp: 'Ambient',
    coldChainStatus: 'N/A',
    progressPct: 100,
    eta: 'Delivered (Verified by Naga Hospital)',
    routeCorridor: 'NH-29 Kohima Hill Climb',
    diversionActive: false
  }
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(INITIAL_PIPELINE);
  const [activeStageFilter, setActiveStageFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState(REGIONAL_DEPOT_INVENTORIES[0]);
  
  // New Dispatch Order Modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    cargo: '',
    category: 'Critical Medical',
    priority: 'Urgent',
    origin: 'Guwahati Central Depot',
    destination: 'Shillong Highland Depot',
    vehiclePlate: 'AS-01-EV-4421 (Highland Rapid Ambulance 01)',
    driverName: 'Tashi Namgyal (+91 94350-11234)',
    requiresColdChain: true,
    targetTemp: '-4°C'
  });

  // Reroute Approval Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered shipments
  const filteredShipments = pipeline.filter(item => {
    const matchesStage = activeStageFilter === 'ALL' || item.pipelineStage === activeStageFilter;
    const matchesQuery = item.cargo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesQuery;
  });

  // Handle Authorize Detour
  const handleAuthorizeDetour = (shipmentId) => {
    setPipeline(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return {
          ...s,
          pipelineStage: 'in_transit',
          diversionActive: false,
          eta: 'Reroute Approved (ETA Adjusted)',
          routeCorridor: `${s.routeCorridor} [Bypass Active - Cleared by BRO]`
        };
      }
      return s;
    }));
    showToast(`Detour authorization transmitted over satellite mesh for shipment ${shipmentId}!`);
  };

  // Handle Create Dispatch
  const handleCreateDispatch = (e) => {
    e.preventDefault();
    if (!dispatchForm.cargo.trim()) return;

    const newShipment = {
      id: `SHP-NER-${Math.floor(1000 + Math.random() * 9000)}`,
      cargo: dispatchForm.cargo,
      category: dispatchForm.category,
      priority: dispatchForm.priority,
      pipelineStage: 'in_transit',
      origin: dispatchForm.origin,
      destination: dispatchForm.destination,
      vehicle: dispatchForm.vehiclePlate,
      driver: dispatchForm.driverName.split('(')[0].trim(),
      driverPhone: '+91 98640-12990',
      coldChainTemp: dispatchForm.requiresColdChain ? dispatchForm.targetTemp : 'Ambient',
      coldChainStatus: 'Optimal',
      progressPct: 5,
      eta: 'Departed Bay • Calculating Live ETA',
      routeCorridor: 'Strategic Lifeline Highway',
      diversionActive: false
    };

    setPipeline([newShipment, ...pipeline]);
    setIsDispatchModalOpen(false);
    setDispatchForm({
      cargo: '',
      category: 'Critical Medical',
      priority: 'Urgent',
      origin: 'Guwahati Central Depot',
      destination: 'Shillong Highland Depot',
      vehiclePlate: 'AS-01-EV-4421 (Highland Rapid Ambulance 01)',
      driverName: 'Tashi Namgyal (+91 94350-11234)',
      requiresColdChain: true,
      targetTemp: '-4°C'
    });
    showToast(`New relief consignment ${newShipment.id} dispatched successfully!`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-amber-400 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Logistics Executive Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-500/30 p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Logistics Operations Manager
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Radio size={12} className="text-emerald-400 animate-pulse" /> Supply Chain Gateway Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Package className="text-amber-400" size={26} />
              NER Relief Supply Chain & Fleet Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time consignment dispatching, cold-chain compliance oversight, regional hill depot inventories, and dynamic convoy route diversion across 8 North Eastern states.
            </p>
          </div>

          {/* Quick Action Triggers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={16} />
              <span>Create Relief Dispatch</span>
            </button>
            <button
              onClick={() => navigate('/shipments')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Full Shipments Registry</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Key Executive Logistics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Active Convoys</span>
            <Truck size={16} className="text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {pipeline.filter(s => s.pipelineStage === 'in_transit' || s.pipelineStage === 'at_risk').length}
          </div>
          <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Check size={11} /> 100% Tracking Live
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Cold-Chain Status</span>
            <Snowflake size={16} className="text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            100%
          </div>
          <p className="text-[10px] text-cyan-300 font-semibold">
            0 Temperature Breaches
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">At-Risk Convoys</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            {pipeline.filter(s => s.pipelineStage === 'at_risk').length}
          </div>
          <p className="text-[10px] text-amber-400/90 font-semibold">
            Highland detour required
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Pending Orders</span>
            <Clock size={16} className="text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300">
            {pipeline.filter(s => s.pipelineStage === 'pending_dispatch').length}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Awaiting vehicle assignment
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Delivery SLA</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            97.8%
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Highland standard target
          </p>
        </div>
      </div>

      {/* Main Operational Section: Consignment Pipeline & Depot Stock Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Relief Supply Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            {/* Header & Stage Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Package className="text-amber-400" size={18} />
                <h2 className="font-extrabold text-white text-base">Consignment Pipeline & Reroute Approvals</h2>
              </div>
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'All Consignments' },
                  { id: 'in_transit', label: 'In Transit' },
                  { id: 'at_risk', label: 'At Risk / Blocked' },
                  { id: 'pending_dispatch', label: 'Pending Dispatch' },
                  { id: 'delivered', label: 'Delivered' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStageFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      activeStageFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-755'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by cargo name, recipient destination, or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Pipeline List */}
            <div className="space-y-3">
              {filteredShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className={`p-4 rounded-xl border transition-all ${
                    shipment.pipelineStage === 'at_risk'
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : shipment.pipelineStage === 'pending_dispatch'
                      ? 'bg-slate-950/60 border-purple-800/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-black text-amber-400">{shipment.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          shipment.priority === 'Urgent'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                            : 'bg-amber-950/80 text-amber-300 border-amber-700'
                        }`}>
                          {shipment.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {shipment.category}
                        </span>
                        {shipment.pipelineStage === 'at_risk' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-slate-950 flex items-center gap-1 animate-pulse">
                            <AlertOctagon size={11} /> Hazard Blockage Alert
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug">{shipment.cargo}</h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>From: <strong className="text-slate-200">{shipment.origin.split('(')[0]}</strong></span>
                        <span>➔</span>
                        <span>To: <strong className="text-slate-200">{shipment.destination.split('(')[0]}</strong></span>
                      </div>
                    </div>

                    {/* Cold Chain Badge */}
                    <div className="flex flex-col sm:items-end space-y-1 flex-shrink-0">
                      <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
                        <Snowflake size={13} className="text-cyan-400" />
                        <span className="font-mono font-bold text-cyan-300">{shipment.coldChainTemp}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">ETA: {shipment.eta}</span>
                    </div>
                  </div>

                  {/* Corridor & Driver Info */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Truck size={14} className="text-slate-500 flex-shrink-0" />
                      <span className="truncate">{shipment.vehicle}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users size={14} className="text-slate-500 flex-shrink-0" />
                      <span className="truncate">Driver: {shipment.driver}</span>
                    </div>
                  </div>

                  {/* At-Risk Warning Box & Reroute Approval Trigger */}
                  {shipment.diversionActive && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-950/60 border border-amber-600/60 text-xs space-y-2">
                      <div className="flex items-start space-x-2 text-amber-200">
                        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Highland Corridor Blocked:</strong> {shipment.diversionReason}
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          onClick={() => handleAuthorizeDetour(shipment.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                        >
                          <CheckCircle2 size={14} />
                          <span>Authorize Alternate Detour Bypass</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar for Active Shipments */}
                  {shipment.pipelineStage !== 'pending_dispatch' && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Delivery Transit Progress</span>
                        <span className="font-bold text-slate-200">{shipment.progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            shipment.pipelineStage === 'at_risk'
                              ? 'bg-amber-500'
                              : shipment.pipelineStage === 'delivered'
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                          style={{ width: `${shipment.progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Regional Hub Depot Inventory Capacity */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building className="text-blue-400" size={18} />
                <h2 className="font-extrabold text-white text-base">Regional Hill Depots</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Live Stock
              </span>
            </div>

            {/* Hub Selector Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {REGIONAL_DEPOT_INVENTORIES.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => setSelectedHub(hub)}
                  className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedHub.id === hub.id
                      ? 'bg-blue-950/60 border-blue-500 text-white font-bold ring-1 ring-blue-400/40'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <p className="font-bold truncate text-[11px] text-white">{hub.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{hub.state}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Cap: {hub.capacityUsed}%</span>
                    <span className={`w-2 h-2 rounded-full ${hub.capacityUsed > 85 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Depot Detail Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-white">{selectedHub.name}</h3>
                <p className="text-[11px] text-slate-400">{selectedHub.type}</p>
              </div>

              {/* Capacity Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Depot Floor Capacity Used</span>
                  <span className="font-bold text-white font-mono">{selectedHub.capacityUsed}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedHub.capacityUsed > 85
                        ? 'bg-rose-500'
                        : selectedHub.capacityUsed > 75
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${selectedHub.capacityUsed}%` }}
                  />
                </div>
              </div>

              {/* Critical Stocks List */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Critical Medical & Relief Stock
                </span>
                {selectedHub.criticalSupplies.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 text-xs"
                  >
                    <span className="text-slate-300 font-medium truncate max-w-[180px]">{item.item}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-[11px]">{item.units}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded ${
                        item.status === 'Optimal'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : item.status === 'Low Stock'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transfer Action */}
              <button
                onClick={() => showToast(`Stock balancing request initiated for ${selectedHub.name} via Central Depot!`)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Request Inter-Depot Stock Transfer</span>
              </button>
            </div>
          </div>

          {/* Quick Manager Navigation Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Logistics Navigation</h3>
            <div className="space-y-1.5">
              <button
                onClick={() => navigate('/vehicles')}
                className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Truck size={15} className="text-blue-400" />
                  <span>Fleet Vehicle Readiness</span>
                </div>
                <ChevronRight size={14} className="text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 size={15} className="text-amber-400" />
                  <span>Logistics Analytics & Bottlenecks</span>
                </div>
                <ChevronRight size={14} className="text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/live-map')}
                className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Navigation size={15} className="text-emerald-400" />
                  <span>Live Cargo Map Tracking</span>
                </div>
                <ChevronRight size={14} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create Relief Dispatch */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Package className="text-amber-400" size={20} />
                <h3 className="font-black text-base">Create Relief Shipment Dispatch</h3>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Consignment Cargo Description</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.cargo}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, cargo: e.target.value })}
                  placeholder="e.g. Cryo-preserved Blood Plasma (100 Units)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={dispatchForm.category}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Critical Medical">Critical Medical</option>
                    <option value="Cold-Chain Vaccine">Cold-Chain Vaccine</option>
                    <option value="Respiratory Equipment">Respiratory Equipment</option>
                    <option value="Disaster Relief Food/Water">Disaster Relief Food/Water</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Priority Level</label>
                  <select
                    value={dispatchForm.priority}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Urgent">Urgent (Emergency Siren)</option>
                    <option value="High">High (Same Day Delivery)</option>
                    <option value="Normal">Normal (Routine Supply)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Origin Depot</label>
                  <select
                    value={dispatchForm.origin}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Guwahati Central Depot">Guwahati Central Depot</option>
                    <option value="Tezpur Staging Base">Tezpur Staging Base</option>
                    <option value="Shillong Highland Depot">Shillong Highland Depot</option>
                    <option value="Dimapur Logistics Hub">Dimapur Logistics Hub</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Destination Target</label>
                  <select
                    value={dispatchForm.destination}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Tawang Border Relief Center">Tawang Border Relief Center</option>
                    <option value="Silchar Valley Relief Depot">Silchar Valley Relief Depot</option>
                    <option value="Shillong Highland Depot">Shillong Highland Depot</option>
                    <option value="Kohima Ridge Relief Outpost">Kohima Ridge Relief Outpost</option>
                    <option value="Haflong Hill Station Clinic">Haflong Hill Station Clinic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Vehicle & Driver</label>
                <select
                  value={dispatchForm.vehiclePlate}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, vehiclePlate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="AS-01-EV-4421 (Highland Rapid Ambulance 01)">
                    Highland Rapid Ambulance 01 (AS-01-EV-4421) • Driver: Tashi Namgyal
                  </option>
                  <option value="ML-05-BX-1092 (Mountain Blood Express 02)">
                    Mountain Blood Express 02 (ML-05-BX-1092) • Driver: Biren Das
                  </option>
                  <option value="AS-01-TR-9904 (Brahmaputra Heavy Supply 03)">
                    Brahmaputra Heavy Supply 03 (AS-01-TR-9904) • Driver: Hemen Bora
                  </option>
                  <option value="AR-02-AT-5511 (Tawang High-Altitude 4x4)">
                    Tawang High-Altitude 4x4 (AR-02-AT-5511) • Driver: Lobsang Dorjee
                  </option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dispatchForm.requiresColdChain}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, requiresColdChain: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Active Cold-Chain Storage Required</span>
                </label>
                {dispatchForm.requiresColdChain && (
                  <div className="flex items-center space-x-2 pt-1 text-xs">
                    <span className="text-slate-400">Target Temp:</span>
                    <input
                      type="text"
                      value={dispatchForm.targetTemp}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, targetTemp: e.target.value })}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-cyan-300 font-mono w-24"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirm Dispatch & Notify Driver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
