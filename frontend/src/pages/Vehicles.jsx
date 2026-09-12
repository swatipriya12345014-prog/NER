import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Fuel,
  Gauge,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Zap,
  Radio,
  Search,
  RefreshCw,
  Compass,
  ArrowRight,
  TrendingDown,
  Info,
  MapPin,
  Clock,
  BatteryCharging,
  Crosshair
} from 'lucide-react';
import { fetchVehicles } from '../services/fuelRouteService';

const Vehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fuelFilter, setFuelFilter] = useState('all');

  const loadVehicles = async () => {
    setLoading(true);
    const data = await fetchVehicles();
    setVehicles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[\s-]/g, '');
    const cleanPlate = (v.license_plate || '').toLowerCase().replace(/[\s-]/g, '');

    const matchesSearch =
      !q ||
      v.name?.toLowerCase().includes(q) ||
      v.license_plate?.toLowerCase().includes(q) ||
      cleanPlate.includes(cleanQ) ||
      v.vehicle_type?.toLowerCase().includes(q) ||
      v.assigned_driver?.toLowerCase().includes(q) ||
      v.current_location?.toLowerCase().includes(q) ||
      v.current_road?.toLowerCase().includes(q) ||
      v.destination?.toLowerCase().includes(q) ||
      v.cargo_manifest?.toLowerCase().includes(q) ||
      v.state?.toLowerCase().includes(q) ||
      v.rto_city?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      v.status?.toLowerCase() === statusFilter.toLowerCase() ||
      (statusFilter === 'en route' && (v.is_in_transit || v.status?.toLowerCase() === 'en route'));

    const matchesFuel =
      fuelFilter === 'all' ||
      (fuelFilter === 'critical' && v.fuel_percentage < 30) ||
      (fuelFilter === 'low' && v.fuel_percentage >= 30 && v.fuel_percentage < 50) ||
      (fuelFilter === 'optimal' && v.fuel_percentage >= 50);

    return matchesSearch && matchesStatus && matchesFuel;
  });

  // Calculate fleet aggregate stats
  const totalFuelLitres = vehicles.reduce((acc, v) => acc + (v.current_fuel_litres || 0), 0);
  const totalCapacityLitres = vehicles.reduce((acc, v) => acc + (v.fuel_capacity_litres || 0), 0);
  const avgFuelPercentage = totalCapacityLitres > 0 ? ((totalFuelLitres / totalCapacityLitres) * 100).toFixed(1) : 0;
  const criticalFuelCount = vehicles.filter((v) => v.fuel_percentage < 30).length;
  const totalRemainingRange = vehicles.reduce((acc, v) => acc + (v.remaining_range_km || 0), 0);
  const inTransitCount = vehicles.filter((v) => v.is_in_transit || v.status === 'En Route').length;

  const handlePlanRoute = (vehicleId) => {
    navigate(`/live-map?vehicle=${encodeURIComponent(vehicleId)}&autoRoute=true`);
  };

  const handleTrackVehicle = (vehicle) => {
    const identifier = vehicle.license_plate || vehicle.id;
    navigate(`/live-map?vehicle=${encodeURIComponent(identifier)}&track=true`);
  };

  const getFuelColorClass = (pct) => {
    if (pct < 30) return { bar: 'bg-rose-500', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    if (pct < 55) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Fuel size={13} className="animate-pulse" />
              <span>FLEET FUEL TELEMETRY & LOGISTICS ACCESSIBILITY</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Radio size={12} className="animate-pulse text-emerald-400" />
              <span>Real-Time Mesh Connected</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            Emergency Fleet & Fuel Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time monitoring of vehicle fuel reserves, high-altitude fuel burn rates, mountain gradient multipliers, and AI route feasibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadVehicles}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Fleet</span>
          </button>
          <button
            onClick={() => navigate('/live-map?track=true')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center space-x-2 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Crosshair size={14} className="animate-spin-slow" />
            <span>Track Vehicles in Transit ({inTransitCount})</span>
          </button>
          <button
            onClick={() => navigate('/live-map?autoRoute=true')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Navigation size={14} />
            <span>Launch AI Route Engine</span>
          </button>
        </div>
      </div>

      {/* Fleet KPI Fuel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Vehicles */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Truck size={22} />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fleet Status</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white">{vehicles.length}</div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">Highland Relief Vehicles</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>All 8 NER State Sectors Deployed</span>
            </div>
          </div>
        </div>

        {/* Total Fleet Fuel In Tanks */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Fuel size={22} />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">On-Board Fuel</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-400">
              {totalFuelLitres.toFixed(0)} <span className="text-lg text-slate-400 font-bold">/ {totalCapacityLitres} L</span>
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">Fleet Fuel Tank Average ({avgFuelPercentage}%)</div>
            {/* Progress bar */}
            <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden border border-slate-700">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, avgFuelPercentage))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Critical Low Fuel Warnings */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <AlertTriangle size={22} />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fuel Warnings</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-400">{criticalFuelCount}</div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">Vehicles in Critical Reserve</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {criticalFuelCount > 0 ? 'Refueling required before mountain ascent' : 'All vehicle reserves adequate'}
            </div>
          </div>
        </div>

        {/* Total Safe Cruising Range */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Gauge size={22} />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terrain Range</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-300">
              {totalRemainingRange.toFixed(0)} <span className="text-lg text-slate-400 font-bold">km</span>
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">Combined Mountain Range</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Adjusted for 8-15% highland gradient burn
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle, driver, plate, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            {['all', 'active', 'en route'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Fuel Level Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-[10px] text-slate-500 px-2 font-bold uppercase">Fuel:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'critical', label: '<30% Critical' },
              { id: 'low', label: '30-50%' },
              { id: 'optimal', label: '>50% Optimal' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFuelFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  fuelFilter === f.id ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const fuelColors = getFuelColorClass(vehicle.fuel_percentage);

          return (
            <div
              key={vehicle.id}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl hover:border-slate-600 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-black text-blue-300 px-2.5 py-0.5 bg-blue-500/15 rounded-md border border-blue-500/30">
                        {vehicle.license_plate}
                      </span>
                      {vehicle.state && (
                        <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 bg-slate-700/50 rounded">
                          {vehicle.state}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      {vehicle.name}
                    </h3>
                    <p className="text-xs text-slate-400">{vehicle.vehicle_type}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${fuelColors.badge}`}>
                      {vehicle.fuel_status}
                    </span>
                    {(vehicle.is_in_transit || vehicle.status === 'En Route') && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>IN TRANSIT ({vehicle.speed_kmh || 35} km/h)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Fuel Meter Gauge */}
                <div className="mt-4 p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-300">
                      <Fuel size={14} className={fuelColors.text} />
                      <span className="font-semibold">Fuel Tank Level</span>
                    </div>
                    <span className={`font-mono font-bold ${fuelColors.text}`}>
                      {vehicle.current_fuel_litres} L / {vehicle.fuel_capacity_litres} L ({vehicle.fuel_percentage}%)
                    </span>
                  </div>

                  {/* Visual Fuel Bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${fuelColors.bar}`}
                      style={{ width: `${Math.min(100, Math.max(0, vehicle.fuel_percentage))}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                    <div>
                      <span className="block text-[10px] text-slate-500">CONSUMPTION:</span>
                      <span className="font-semibold text-slate-200">{vehicle.fuel_consumption_km_per_l} km/L base</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">TERRAIN BURN:</span>
                      <span className="font-semibold text-amber-300">{vehicle.effective_km_per_l} km/L ({vehicle.terrain_multiplier}x)</span>
                    </div>
                  </div>
                </div>

                {/* Logistics & Location Details */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Gauge size={13} className="text-indigo-400" />
                      <span>Remaining Range:</span>
                    </span>
                    <span className="font-bold text-white font-mono">{vehicle.remaining_range_km} km</span>
                  </div>

                  {vehicle.current_road && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Compass size={13} className="text-amber-400" />
                        <span>Corridor:</span>
                      </span>
                      <span className="font-medium text-amber-300 text-right truncate max-w-[170px]">{vehicle.current_road}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <MapPin size={13} className="text-emerald-400" />
                      <span>{vehicle.is_in_transit ? 'Live Position:' : 'Staged Location:'}</span>
                    </span>
                    <span className="font-medium text-slate-200 text-right truncate max-w-[170px]">{vehicle.current_location}</span>
                  </div>

                  {vehicle.destination && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Navigation size={13} className="text-blue-400" />
                        <span>Destination:</span>
                      </span>
                      <span className="font-medium text-blue-300 text-right truncate max-w-[170px]">{vehicle.destination}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Shield size={13} className="text-blue-400" />
                      <span>Driver:</span>
                    </span>
                    <span className="font-medium text-slate-200">
                      {vehicle.assigned_driver} {vehicle.driver_phone ? `(${vehicle.driver_phone})` : ''}
                    </span>
                  </div>

                  {vehicle.cargo_manifest && (
                    <div className="mt-2 text-[11px] p-2 rounded-lg bg-slate-900/70 border border-slate-700/60 text-slate-300">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Emergency Cargo Manifest:</span>
                      <span className="text-emerald-300 font-medium block truncate">{vehicle.cargo_manifest}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                <button
                  onClick={() => handleTrackVehicle(vehicle)}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer border border-emerald-400/30"
                >
                  <Crosshair size={13} className="animate-spin-slow text-white" />
                  <span>Track Live Map</span>
                </button>
                <button
                  onClick={() => handlePlanRoute(vehicle.id)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>AI Route</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Vehicles;
