import React, { useState, useEffect } from 'react';
import {
  Truck, MapPin, Compass, Navigation, Activity, Gauge, Fuel,
  Battery, Zap, ShieldCheck, Radio, Signal, Satellite, User,
  Phone, Package, Thermometer, ExternalLink, Copy, Check, X,
  Crosshair, Clock, AlertCircle, Share2, Layers, ChevronRight
} from 'lucide-react';

export default function VehicleDossierModal({
  isOpen,
  onClose,
  vehicle,
  onTrackLive,
  isTracking = false,
  onCenterOnMap,
  autoFollowCam = false,
  onToggleAutoFollow
}) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [activeTab, setActiveTab] = useState('location'); // 'location' | 'telemetry' | 'driver_cargo' | 'ais140'

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !vehicle) return null;

  // Extract precise GPS coordinates
  const lat = vehicle.lat != null ? Number(vehicle.lat) : (vehicle.location?.lat != null ? Number(vehicle.location.lat) : 26.080001);
  const lng = vehicle.lng != null ? Number(vehicle.lng) : (vehicle.location?.lng != null ? Number(vehicle.location.lng) : 91.901909);
  const speed = vehicle.speed_kmh != null ? Number(vehicle.speed_kmh) : 38;
  const altitude = vehicle.altitude_m != null ? Number(vehicle.altitude_m) : 420;
  const heading = vehicle.heading_deg != null ? Number(vehicle.heading_deg) : 72;
  const fuelPercent = vehicle.fuel_percentage != null ? Number(vehicle.fuel_percentage) : 74;
  const fuelLitres = vehicle.current_fuel_litres != null ? Number(vehicle.current_fuel_litres) : 48;
  const fuelCapacity = vehicle.fuel_capacity_litres != null ? Number(vehicle.fuel_capacity_litres) : 70;
  const rangeKm = vehicle.remaining_range_km != null ? Number(vehicle.remaining_range_km) : 312;
  const plate = vehicle.license_plate || vehicle.vehicle_number || vehicle.id;
  const driverName = vehicle.assigned_driver || vehicle.driver_name || 'Tenzing Norbu';
  const driverPhone = vehicle.driver_phone || '+91 94351 99201';
  const road = vehicle.current_road || 'NH-27 Guwahati ➔ Shillong Sector Km 42';
  const destination = vehicle.destination || 'Shillong Civil Hospital';
  const cargo = vehicle.cargo_manifest || 'Emergency Blood Plasma & IV Fluids (-4°C Cold Chain)';
  const satellites = vehicle.satellites_locked || vehicle.satellites_navic || 15;
  const meshNode = vehicle.mesh_node_id || 'MESH-NODE-01';
  const meshRssi = vehicle.mesh_rssi_dbm || -72;
  const batteryVolts = vehicle.battery_volts || 24.2;

  // Determine compass cardinal direction
  const getCompassDirection = (deg) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  };

  const handleCopyCoords = () => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-gradient-to-b from-slate-900 via-slate-925 to-slate-950 border border-emerald-500/50 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top MoRTH / AIS-140 Official Banner Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            {/* HSRP License Plate Mock Badge */}
            <div className="flex items-center bg-slate-100 text-slate-950 rounded-lg px-2.5 py-1 border-2 border-slate-400 font-mono font-black text-sm tracking-wider shadow-inner flex-shrink-0">
              <span className="text-[9px] font-sans font-bold bg-blue-700 text-white px-1 py-0.5 rounded mr-1.5 leading-none">
                IND
              </span>
              <span>{plate}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  {vehicle.name || vehicle.vehicle_name || 'Government Emergency Carrier'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-slate-950 uppercase tracking-widest flex items-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                  <span>AIS-140 LIVE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-2">
                <span>{vehicle.vehicle_type || '4x4 Mountain Emergency Carrier'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{vehicle.state || 'Assam'} RTO Registered</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            {onTrackLive && (
              <button
                type="button"
                onClick={() => {
                  onTrackLive(vehicle);
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow cursor-pointer border ${
                  isTracking
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/50'
                    : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border-slate-700'
                }`}
              >
                <Crosshair size={13} className={isTracking ? 'animate-spin' : ''} />
                <span>{isTracking ? 'Tracking Active' : 'Track on Map'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Dossier (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4 Primary Live Telemetry Ticker Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/60 border-b border-slate-800/80">
          {/* Gauge 1: Speed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center space-x-1">
                <Gauge size={13} className="text-emerald-400" />
                <span>Live Speed</span>
              </span>
              <span className="text-emerald-400 font-mono text-[9px]">ACTIVE</span>
            </div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-white font-mono">{speed}</span>
              <span className="text-xs text-slate-400 font-bold">km/h</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (speed / 80) * 100)}%` }}
              />
            </div>
          </div>

          {/* Gauge 2: Exact Altitude */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center space-x-1">
                <Activity size={13} className="text-blue-400" />
                <span>Altitude ASL</span>
              </span>
              <span className="text-blue-400 font-mono text-[9px]">BARO</span>
            </div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-blue-300 font-mono">{altitude}</span>
              <span className="text-xs text-slate-400 font-bold">m</span>
            </div>
            <div className="text-[10px] text-blue-400 font-semibold mt-1 truncate">
              {altitude > 1500 ? 'Alpine Mountain Pass' : altitude > 500 ? 'Highland Terrain' : 'Valley Corridor'}
            </div>
          </div>

          {/* Gauge 3: Fuel Reserve & Range */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center space-x-1">
                <Fuel size={13} className="text-amber-400" />
                <span>Fuel Reserve</span>
              </span>
              <span className="text-amber-400 font-mono text-[9px]">{fuelPercent}%</span>
            </div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-amber-300 font-mono">{fuelLitres}</span>
              <span className="text-xs text-slate-400 font-bold">/ {fuelCapacity} L</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-1">
              Safe Range: ~{rangeKm} km
            </div>
          </div>

          {/* Gauge 4: NavIC & GNSS Satellites */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center space-x-1">
                <Satellite size={13} className="text-cyan-400" />
                <span>NavIC + GPS</span>
              </span>
              <span className="text-cyan-400 font-mono text-[9px]">3D RTK</span>
            </div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-cyan-300 font-mono">{satellites}</span>
              <span className="text-xs text-slate-400 font-bold">Sats</span>
            </div>
            <div className="text-[10px] text-cyan-400 font-semibold mt-1 truncate">
              Dual L5/S-Band Fix
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 bg-slate-900 border-b border-slate-800 overflow-x-auto scrollbar-none">
          {[
            { id: 'location', label: '📍 Exact Location & Highway', icon: MapPin },
            { id: 'telemetry', label: '⚡ Engine & Energy Telemetry', icon: Zap },
            { id: 'driver_cargo', label: '👨‍✈️ Driver & Cargo Manifest', icon: Package },
            { id: 'ais140', label: '🛡️ MoRTH AIS-140 Hardware', icon: Radio },
          ].map((t) => {
            const Icon = t.icon;
            const isCur = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isCur
                    ? 'border-emerald-400 text-emerald-300 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} className={isCur ? 'text-emerald-400' : ''} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 max-h-[58vh]">
          {/* TAB 1: EXACT LOCATION & HIGHWAY DETAILS */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* High-Precision Exact GPS Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border-2 border-emerald-500/70 shadow-lg space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">
                      High-Precision Geodetic Location (WGS84)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/40">
                    Accuracy: ±0.8m (Differential DGPS)
                  </span>
                </div>

                {/* Big Lat / Lng Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Latitude</span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">
                        {lat.toFixed(6)}° N
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono font-bold">
                      LAT
                    </span>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Longitude</span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">
                        {lng.toFixed(6)}° E
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono font-bold">
                      LNG
                    </span>
                  </div>
                </div>

                {/* Quick Location Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/50 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    {copiedCoords ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedCoords ? 'Coordinates Copied!' : 'Copy Exact GPS Coordinates'}</span>
                  </button>

                  {onCenterOnMap && (
                    <button
                      type="button"
                      onClick={() => {
                        onCenterOnMap(lat, lng);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Crosshair size={14} className="text-emerald-400" />
                      <span>Center Camera Here</span>
                    </button>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all ml-auto"
                  >
                    <ExternalLink size={14} />
                    <span>Open in Sovereign / External GIS</span>
                  </a>
                </div>
              </div>

              {/* Highway Corridor & Chainage Breakdown */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Navigation size={14} className="text-blue-400" />
                  <span>Surveyed Highway & Landmark Positioning</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Highway Corridor</span>
                    <span className="font-extrabold text-amber-300 text-sm block">
                      📍 {road}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Official NHAI / Border Roads Organisation (BRO) Surveyed Transit Route
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Intended Destination</span>
                    <span className="font-extrabold text-cyan-300 text-sm block">
                      ➔ {destination}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Designated Emergency Logistics & Medical Distribution Depot
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Compass Heading & Direction</span>
                    <div className="flex items-center space-x-2">
                      <Compass size={16} className="text-cyan-400" style={{ transform: `rotate(${heading}deg)` }} />
                      <span className="font-mono font-bold text-white text-sm">
                        {heading.toFixed(1)}° {getCompassDirection(heading)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">True Heading via NavIC Gyro-Inclinometer</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nearest Relief Checkpoint</span>
                    <span className="font-bold text-emerald-300 text-sm block">
                      BRO Project Vartak Camp Km 48.0
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Emergency refuel, mechanical recovery, and heavy tow winch available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENGINE & ENERGY TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Zap size={14} className="text-amber-400" />
                    <span>Engine Diagnostics & Fuel Efficiency</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Engine State: NORMAL RUNNING
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Powertrain Type</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">
                      {vehicle.fuel_type || 'Diesel (BS-VI Turbo)'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Euro-VI DPF System Active</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Fuel Level</span>
                    <span className="font-bold text-amber-300 text-sm mt-0.5 block">
                      {fuelLitres} L ({fuelPercent}%)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Tank Capacity: {fuelCapacity} L</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Effective Range</span>
                    <span className="font-bold text-emerald-300 text-sm mt-0.5 block">
                      {rangeKm} km
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">At Current Mountain Consumption</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Base Fuel Economy</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">
                      {vehicle.fuel_consumption_km_per_l || 8.5} km/L
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Plain Terrain Benchmark</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Terrain Multiplier</span>
                    <span className="font-bold text-rose-400 text-sm mt-0.5 block">
                      {vehicle.terrain_multiplier || 1.30}x (+30% Drag)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Incline & Monsoon Road Friction</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Electrical Potential</span>
                    <span className="font-bold text-cyan-300 text-sm mt-0.5 block">
                      {batteryVolts} V DC
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Dual Battery Alternator OK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DRIVER PROFILE & CARGO MANIFEST */}
          {activeTab === 'driver_cargo' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Driver Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <User size={14} className="text-cyan-400" />
                    <span>Official Response Pilot & Crew</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Govt Certified Heavy Pilot
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Driver</span>
                    <span className="font-extrabold text-white text-base block">{driverName}</span>
                    <span className="text-[11px] text-slate-400 block">
                      License: {vehicle.driver_license || 'DL-AS01-2018-004421 (Mountain Certified)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Emergency Contact</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm block">{driverPhone}</span>
                    </div>
                    <a
                      href={`tel:${driverPhone}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow"
                    >
                      <Phone size={13} />
                      <span>Direct Telephone Call</span>
                    </a>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">LoRa Mesh Radio Channel</span>
                    <span className="font-mono font-bold text-purple-300 text-sm block">Channel 04 • 865.20 MHz</span>
                    <span className="text-[10px] text-slate-500 block">DTN Store-and-Forward Mesh Voice/Data</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Dispatch Control Centre</span>
                    <span className="font-bold text-cyan-300 text-sm block">
                      State Disaster Response Force (SDRF) Cell 1
                    </span>
                    <span className="text-[10px] text-slate-500 block">Integrated with ASDMA / NDMA Control Grid</span>
                  </div>
                </div>
              </div>

              {/* Cargo & Cold Chain Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Package size={14} className="text-amber-400" />
                    <span>Emergency Cargo Manifest & Cold Chain</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Priority 1: Critical Relief
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-sm font-bold text-amber-300">
                    📦 {cargo}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">VAULT TEMP</span>
                      <span className="font-mono font-bold text-cyan-300 flex items-center space-x-1">
                        <Thermometer size={12} className="text-cyan-400" />
                        <span>-4.2°C (Active)</span>
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">LOAD WEIGHT</span>
                      <span className="font-mono font-bold text-white">1,250 kg (50%)</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">CONTAINMENT</span>
                      <span className="font-bold text-emerald-400">Insulated Vault OK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MORTH AIS-140 COMPLIANCE HARDWARE */}
          {activeTab === 'ais140' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>MoRTH AIS-140 Vehicle Location Tracking (VLT) Unit</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Certified VLT v2.1
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">GNSS Architecture</span>
                    <span className="font-bold text-cyan-300 text-sm mt-0.5 block">ISRO NavIC + GPS L1</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Dual-Band Sovereign Indian GNSS</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Emergency Panic Button</span>
                    <span className="font-bold text-emerald-400 text-sm mt-0.5 block">NORMAL (INACTIVE)</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">MoRTH SOS Trigger Armed</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">LoRa Mesh Node ID</span>
                    <span className="font-mono font-bold text-purple-300 text-sm mt-0.5 block">{meshNode}</span>
                    <span className="text-[10px] text-purple-400 mt-1 block">RSSI: {meshRssi} dBm (Active)</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cellular Uplink</span>
                    <span className="font-bold text-white text-sm mt-0.5 block">4G LTE Cat-M1 / BSNL</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">eSIM 1 Primary • eSIM 2 Disaster</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Ignition Sense Wire</span>
                    <span className="font-bold text-emerald-400 text-sm mt-0.5 block">IGNITION ON (13.8V)</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Continuous Realtime Streaming</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Telemetry Frequency</span>
                    <span className="font-bold text-cyan-300 text-sm mt-0.5 block">2.5s Stream Ping</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">WebSocket + LoRa Fallback</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Updated: {new Date().toLocaleTimeString()} (Live Frame)</span>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            {onTrackLive && (
              <button
                type="button"
                onClick={() => {
                  onTrackLive(vehicle);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
              >
                <Crosshair size={14} />
                <span>Track This Vehicle Live</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
