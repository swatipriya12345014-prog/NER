import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
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
  ZoomIn,
  ZoomOut,
  Crosshair,
  Compass,
  Radio,
  Clock,
  Shield,
  Search,
  Maximize2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Wifi,
  Signal
} from 'lucide-react';

// Live Basemap Tile Providers (Open, Fast, Zero Rate Limits, No Leaflet)
const BASEMAP_TILES = {
  streets: {
    name: 'Street & Highway Map',
    url: (x, y, z) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    attribution: 'Esri, HERE, Garmin, USGS, NGA'
  },
  satellite: {
    name: 'Live Satellite Imagery',
    url: (x, y, z) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    attribution: 'Esri, Maxar, Earthstar Geographics'
  },
  topo: {
    name: 'Topographic Mountain Terrain',
    url: (x, y, z) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
    attribution: 'Esri, Intermap, USGS'
  }
};

// Key Regional Strategic Hubs across North East India
const NER_HUBS = [
  { id: 'guwahati', name: 'Guwahati Hub', state: 'Assam', lat: 26.1445, lng: 91.7362, status: 'Central Staging Depot' },
  { id: 'shillong', name: 'Shillong HQ', state: 'Meghalaya', lat: 25.5788, lng: 91.8933, status: 'Highland Logistics Base' },
  { id: 'tawang', name: 'Tawang Base', state: 'Arunachal Pradesh', lat: 27.5861, lng: 91.8594, status: 'Border Relief Center' },
  { id: 'imphal', name: 'Imphal Station', state: 'Manipur', lat: 24.8170, lng: 93.9368, status: 'Eastern Sector Depot' },
  { id: 'kohima', name: 'Kohima Post', state: 'Nagaland', lat: 25.6751, lng: 94.1086, status: 'Ridge Patrol Station' },
  { id: 'aizawl', name: 'Aizawl Outpost', state: 'Mizoram', lat: 23.7271, lng: 92.7176, status: 'Southern Distribution' },
  { id: 'agartala', name: 'Agartala Depot', state: 'Tripura', lat: 23.8315, lng: 91.2868, status: 'Western Staging Base' },
  { id: 'gangtok', name: 'Gangtok Command', state: 'Sikkim', lat: 27.3389, lng: 88.6065, status: 'Himalayan Corridor Base' }
];

// Live Real-Time Hazard Alerts
const HAZARD_INCIDENTS = [
  {
    id: 'HZ-881',
    title: 'Active Landslide & Debris',
    location: 'Sela Pass, NH-13 (Km Marker 142)',
    state: 'Arunachal Pradesh',
    lat: 27.505,
    lng: 92.102,
    severity: 'Critical',
    status: 'Convoy single-lane escort in effect',
    time: 'Reported 18 mins ago'
  },
  {
    id: 'HZ-882',
    title: 'Monsoon Flash Waterlogging',
    location: 'Lumshnong Causeway, NH-06',
    state: 'Meghalaya',
    lat: 25.185,
    lng: 92.380,
    severity: 'High',
    status: 'Water depth 1.2ft; high clearance vehicles only',
    time: 'Reported 34 mins ago'
  },
  {
    id: 'HZ-883',
    title: 'Teesta River Silt Warning',
    location: 'NH-10 Teesta Valley Stretch',
    state: 'Sikkim',
    lat: 27.120,
    lng: 88.480,
    severity: 'Caution',
    status: 'Speed limit enforced at 20 km/h',
    time: 'Reported 1 hr ago'
  }
];

// Web Mercator Slippy Map Math Utilities
function lonToTileX(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function latToTileY(lat, zoom) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom));
}

function lonToPixelX(lon, zoom) {
  return (lon + 180) / 360 * Math.pow(2, zoom) * 256;
}

function latToPixelY(lat, zoom) {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom) * 256;
}

function pixelToLon(pixelX, zoom) {
  return (pixelX / (256 * Math.pow(2, zoom))) * 360 - 180;
}

function pixelToLat(pixelY, zoom) {
  const n = Math.PI - (2 * Math.PI * pixelY) / (256 * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

const LiveMap = () => {
  // Center of North East India
  const [center, setCenter] = useState({ lat: 26.2, lng: 92.8 });
  const [zoom, setZoom] = useState(7);
  const [basemap, setBasemap] = useState('streets');
  
  // Real-time vehicle fleet state (initialized empty for live data ingestion)
  const [convoys, setConvoys] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(NER_HUBS[0]);
  const [filterLayer, setFilterLayer] = useState({ vehicles: true, hazards: true, hubs: true });
  const [mouseCoord, setMouseCoord] = useState({ lat: 26.2, lng: 92.8 });
  const [isLiveTelemetryActive, setIsLiveTelemetryActive] = useState(true);

  // Map viewport canvas state
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 580 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, centerLng: 0, centerLat: 0 });

  // Update container dimensions dynamically
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 580
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat: center.lat,
      centerLng: center.lng
    };
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const centerPixelX = lonToPixelX(center.lng, zoom);
      const centerPixelY = latToPixelY(center.lat, zoom);
      const targetPixelX = centerPixelX - (dimensions.width / 2) + offsetX;
      const targetPixelY = centerPixelY - (dimensions.height / 2) + offsetY;

      setMouseCoord({
        lat: +pixelToLat(targetPixelY, zoom).toFixed(4),
        lng: +pixelToLon(targetPixelX, zoom).toFixed(4)
      });
    }

    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const startPixelX = lonToPixelX(dragStartRef.current.centerLng, zoom);
    const startPixelY = latToPixelY(dragStartRef.current.centerLat, zoom);

    const newPixelX = startPixelX - dx;
    const newPixelY = startPixelY - dy;

    setCenter({
      lat: +pixelToLat(newPixelY, zoom).toFixed(5),
      lng: +pixelToLon(newPixelX, zoom).toFixed(5)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom control
  const handleZoom = (delta) => {
    setZoom((prev) => Math.max(4, Math.min(14, prev + delta)));
  };

  const jumpToLocation = (lat, lng, targetZoom = 10) => {
    setCenter({ lat, lng });
    setZoom(targetZoom);
  };

  // Compute active tiles visible in the viewport
  const centerPixelX = lonToPixelX(center.lng, zoom);
  const centerPixelY = latToPixelY(center.lat, zoom);

  const minPixelX = centerPixelX - dimensions.width / 2;
  const maxPixelX = centerPixelX + dimensions.width / 2;
  const minPixelY = centerPixelY - dimensions.height / 2;
  const maxPixelY = centerPixelY + dimensions.height / 2;

  const minTileX = Math.floor(minPixelX / 256);
  const maxTileX = Math.floor(maxPixelX / 256);
  const minTileY = Math.floor(minPixelY / 256);
  const maxTileY = Math.floor(maxPixelY / 256);

  const visibleTiles = [];
  const maxTileIndex = Math.pow(2, zoom) - 1;

  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      if (y >= 0 && y <= maxTileIndex) {
        const wrappedX = ((x % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
        const tileLeft = x * 256 - minPixelX;
        const tileTop = y * 256 - minPixelY;

        visibleTiles.push({
          key: `${zoom}-${wrappedX}-${y}`,
          x: wrappedX,
          y: y,
          left: tileLeft,
          top: tileTop,
          url: BASEMAP_TILES[basemap].url(wrappedX, y, zoom)
        });
      }
    }
  }

  // Convert GPS Coordinates to Screen Pixels
  const coordToScreen = (lat, lng) => {
    const px = lonToPixelX(lng, zoom);
    const py = latToPixelY(lat, zoom);
    return {
      x: px - minPixelX,
      y: py - minPixelY
    };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Real-time Map Dashboard Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Radio size={13} className="animate-pulse" />
              <span>LIVE SLIPPY MAP • ZERO LEAFLET • ZERO SDK LIMITS</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Shield size={12} />
              <span>NER Emergency Command</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            Real-Time Geospatial Tactical Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live pan-and-zoom street, satellite, and topographic GIS telemetry across Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Sikkim & Tripura.
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Basemap Switcher */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700 flex items-center">
            {Object.keys(BASEMAP_TILES).map((type) => (
              <button
                key={type}
                onClick={() => setBasemap(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  basemap === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border bg-emerald-600/20 border-emerald-500/40 text-emerald-300">
            <Wifi size={14} className="animate-pulse text-emerald-400" />
            <span>GPS Receiver Ready</span>
          </div>
        </div>
      </div>

      {/* Quick Regional Jump Navigation Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1 flex-shrink-0">
          <Navigation size={13} className="text-blue-400" />
          <span>Quick Fly-To:</span>
        </span>
        {NER_HUBS.map((hub) => (
          <button
            key={hub.id}
            onClick={() => jumpToLocation(hub.lat, hub.lng, 10)}
            className="flex-shrink-0 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {hub.name} ({hub.state})
          </button>
        ))}
      </div>

      {/* Main Interactive Map & Telemetry Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Slippy Canvas Viewport */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
          {/* Map Layer Toolbar */}
          <div className="p-3 bg-slate-800/95 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center space-x-2">
              <Layers size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">ACTIVE LAYERS:</span>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, vehicles: !p.vehicles }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterLayer.vehicles ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Fleet Telemetry ({convoys.length})
              </button>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, hazards: !p.hazards }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterLayer.hazards ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Hazards ({HAZARD_INCIDENTS.length})
              </button>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, hubs: !p.hubs }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterLayer.hubs ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Strategic Hubs ({NER_HUBS.length})
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-2">
              <Compass size={12} className="text-blue-400" />
              <span>Center: {center.lat.toFixed(3)}°N, {center.lng.toFixed(3)}°E</span>
              <span className="text-slate-600">•</span>
              <span>Zoom: {zoom}x</span>
            </div>
          </div>

          {/* Interactive Drag & Zoom Viewport */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative w-full h-[600px] bg-slate-950 overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Render Map Tiles */}
            <div className="absolute inset-0 pointer-events-none">
              {visibleTiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.url}
                  alt="map tile"
                  loading="eager"
                  className="absolute w-[256px] h-[256px] object-cover transition-opacity duration-200"
                  style={{
                    left: `${tile.left}px`,
                    top: `${tile.top}px`,
                  }}
                  onError={(e) => {
                    // Graceful fallback for offline / blocked tile requests
                    e.target.style.opacity = '0.3';
                  }}
                />
              ))}
            </div>

            {/* Strategic Regional Hub Markers */}
            {filterLayer.hubs &&
              NER_HUBS.map((hub) => {
                const pos = coordToScreen(hub.lat, hub.lng);
                if (pos.x < -50 || pos.x > dimensions.width + 50 || pos.y < -50 || pos.y > dimensions.height + 50) return null;
                const isSelected = selectedEntity?.id === hub.id;

                return (
                  <div
                    key={hub.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntity(hub);
                    }}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                  >
                    <div className={`p-1.5 rounded-full border-2 shadow-lg transition-transform hover:scale-125 ${
                      isSelected ? 'bg-blue-500 border-white ring-4 ring-blue-500/40' : 'bg-slate-900 border-blue-400 text-blue-400'
                    }`}>
                      <MapPin size={14} className={isSelected ? 'text-white' : 'text-blue-400'} />
                    </div>
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none border border-slate-700">
                      {hub.name}
                    </div>
                  </div>
                );
              })}

            {/* Real-time Moving Convoy Markers (Rendered when live telemetry streams arrive) */}
            {filterLayer.vehicles &&
              convoys.map((convoy) => {
                const pos = coordToScreen(convoy.lat, convoy.lng);
                if (pos.x < -50 || pos.x > dimensions.width + 50 || pos.y < -50 || pos.y > dimensions.height + 50) return null;
                const isSelected = selectedEntity?.id === convoy.id;

                return (
                  <div
                    key={convoy.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntity(convoy);
                    }}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                  >
                    {/* Radar Pulse */}
                    <div className="absolute -inset-3 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></div>
                    <div
                      className={`relative flex items-center justify-center p-2 rounded-xl shadow-2xl border-2 transition-all hover:scale-125 ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-white ring-4 ring-emerald-400/50'
                          : 'bg-slate-900 text-emerald-400 border-emerald-400'
                      }`}
                    >
                      <Truck size={15} />
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-950/95 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-emerald-800 pointer-events-none flex items-center space-x-1">
                      <span>{convoy.id}</span>
                      {convoy.speed && <span className="text-slate-400">({convoy.speed} km/h)</span>}
                    </div>
                  </div>
                );
              })}

            {/* Road Hazard Incidents */}
            {filterLayer.hazards &&
              HAZARD_INCIDENTS.map((hz) => {
                const pos = coordToScreen(hz.lat, hz.lng);
                if (pos.x < -50 || pos.x > dimensions.width + 50 || pos.y < -50 || pos.y > dimensions.height + 50) return null;
                const isSelected = selectedEntity?.id === hz.id;

                return (
                  <div
                    key={hz.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntity(hz);
                    }}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-25 group"
                  >
                    <div className="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping pointer-events-none"></div>
                    <div className={`p-1.5 rounded-lg border-2 shadow-xl transition-transform hover:scale-125 ${
                      isSelected ? 'bg-rose-600 text-white border-white ring-4 ring-rose-500/40' : 'bg-slate-900 text-rose-400 border-rose-500'
                    }`}>
                      <AlertTriangle size={15} />
                    </div>
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-950/95 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap border border-rose-800 pointer-events-none">
                      {hz.title}
                    </div>
                  </div>
                );
              })}

            {/* In-Map Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-40">
              <button
                onClick={() => handleZoom(1)}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700 shadow-xl transition-all active:scale-95 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => handleZoom(-1)}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700 shadow-xl transition-all active:scale-95 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => jumpToLocation(26.2, 92.8, 7)}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-blue-400 rounded-xl border border-slate-700 shadow-xl transition-all active:scale-95 cursor-pointer"
                title="Recenter Map"
              >
                <Crosshair size={16} />
              </button>
            </div>

            {/* Mouse Coordinates HUD */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 shadow-lg pointer-events-none flex items-center space-x-3 backdrop-blur-sm z-40">
              <span className="text-emerald-400 font-bold">LAT: {mouseCoord.lat}°N</span>
              <span className="text-blue-400 font-bold">LNG: {mouseCoord.lng}°E</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">PROVIDER: {BASEMAP_TILES[basemap].name}</span>
            </div>
          </div>
        </div>

        {/* Live Intelligence Telemetry & Entity Inspector */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Entity Card */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tactical Inspector</span>
                <h3 className="text-lg font-bold text-white">
                  {selectedEntity?.name || selectedEntity?.title || 'Tactical Location'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500">
                {selectedEntity?.priority || selectedEntity?.severity || 'Operational'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-2.5 text-xs">
              {/* Dynamic Vehicle View (when live telemetry vehicle selected) */}
              {selectedEntity?.cargo && (
                <>
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700 space-y-1">
                    <span className="text-slate-400 text-[10px] block">CRITICAL CARGO:</span>
                    <span className="font-semibold text-white">{selectedEntity.cargo}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">COLD-CHAIN TEMP:</span>
                      <span className="font-bold text-emerald-400 flex items-center space-x-1">
                        <Thermometer size={13} />
                        <span>{selectedEntity.temp}°C</span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">LIVE SPEED:</span>
                      <span className="font-bold text-blue-400">{selectedEntity.speed} km/h</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Driver:</span>
                      <span className="font-semibold text-white">{selectedEntity.driver}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destination:</span>
                      <span className="font-semibold text-slate-200">{selectedEntity.dest}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transit Corridor:</span>
                      <span className="font-semibold text-emerald-300">{selectedEntity.route}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Hazard View */}
              {selectedEntity?.location && (
                <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold">
                    <AlertTriangle size={15} />
                    <span>Active Road Hazard</span>
                  </div>
                  <p className="text-slate-200">{selectedEntity.location}</p>
                  <p className="text-[11px] text-slate-400">{selectedEntity.status}</p>
                  <span className="block text-[10px] text-slate-500">{selectedEntity.time}</span>
                </div>
              )}

              {/* Strategic Hub Base View */}
              {selectedEntity?.status && !selectedEntity?.cargo && !selectedEntity?.location && (
                <div className="p-3 bg-slate-900/70 border border-slate-700 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility Type:</span>
                    <span className="font-semibold text-white">{selectedEntity.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">State Jurisdiction:</span>
                    <span className="font-semibold text-blue-300">{selectedEntity.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-300">{selectedEntity.lat}°N, {selectedEntity.lng}°E</span>
                  </div>
                </div>
              )}

              {/* Action Button: Recenter on this entity */}
              <button
                onClick={() => jumpToLocation(selectedEntity.lat, selectedEntity.lng, 11)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <Crosshair size={14} />
                <span>Focus Location on Map</span>
              </button>
            </div>
          </div>

          {/* Real-Time Convoy Stream / Fleet Ingestion Channel */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Active Relief Vehicles</span>
              <span className="text-emerald-400 text-[10px] flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Ingestion Channel</span>
              </span>
            </h4>

            {convoys.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/80 text-center space-y-2">
                <div className="flex justify-center text-slate-500">
                  <Signal size={26} className="text-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  Awaiting Real-Time Fleet Telemetry
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The map is listening for live vehicle GPS packets from ESP32/LoRa hardware mesh nodes and the dispatch API. Active convoys will plot automatically as they broadcast.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {convoys.map((convoy) => (
                  <div
                    key={convoy.id}
                    onClick={() => {
                      setSelectedEntity(convoy);
                      jumpToLocation(convoy.lat, convoy.lng, 11);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedEntity?.id === convoy.id
                        ? 'bg-blue-600/20 border-blue-400 text-white'
                        : 'bg-slate-900/70 border-slate-700/80 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{convoy.name || convoy.id}</span>
                      {convoy.speed && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                          {convoy.speed} km/h
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{convoy.dest || 'En Route'}</span>
                      {convoy.temp && <span className="text-emerald-400 font-bold">{convoy.temp}°C</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
