import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Minimize2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Wifi,
  Signal,
  Fuel,
  Gauge,
  Sparkles,
  Sliders,
  Route,
  ArrowRight,
  Droplets,
  Flame,
  Check,
  Zap,
  LocateFixed,
  Satellite,
  CircleDot,
  Globe
} from 'lucide-react';
import GoogleMapView from '../components/GoogleMapView';
import {
  fetchVehicles,
  optimizeAIRoute,
  REGIONAL_HUBS,
  FALLBACK_FLEET_VEHICLES
} from '../services/fuelRouteService';
import {
  startGPSTracking,
  stopGPSTracking,
  sendGPSUpdate,
  connectGPSWebSocket
} from '../services/gpsService';

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
const NER_HUBS = REGIONAL_HUBS;

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
  const [searchParams] = useSearchParams();
  const urlVehicle = searchParams.get('vehicle');
  const urlAutoRoute = searchParams.get('autoRoute') === 'true';

  // Center of North East India
  const [center, setCenter] = useState({ lat: 26.2, lng: 92.8 });
  const [zoom, setZoom] = useState(7);
  const [basemap, setBasemap] = useState('streets');
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [mapEngine, setMapEngine] = useState('google'); // 'google' | 'offline'
  
  // Real-time vehicle fleet state
  const [fleet, setFleet] = useState(FALLBACK_FLEET_VEHICLES);
  const [selectedEntity, setSelectedEntity] = useState(NER_HUBS[0]);
  const [filterLayer, setFilterLayer] = useState({ vehicles: true, hazards: true, hubs: true, routes: true, gps: true, localities: true });
  const [selectedLocality, setSelectedLocality] = useState(null);
  const [mouseCoord, setMouseCoord] = useState({ lat: 26.2, lng: 92.8 });

  // ─────────────────────────────────────────────────────────────
  // REAL-TIME GPS NAVIGATOR STATES
  // ─────────────────────────────────────────────────────────────
  const [deviceGPS, setDeviceGPS] = useState(null); // { lat, lng, altitude_m, speed_kmh, heading_deg, accuracy_m, timestamp }
  const [gpsTrail, setGpsTrail] = useState([]); // Breadcrumb trail of recent positions
  const [gpsFollowMode, setGpsFollowMode] = useState(false); // Lock map to GPS position
  const [gpsStatus, setGpsStatus] = useState('inactive'); // 'inactive' | 'searching' | 'active' | 'error'
  const [gpsError, setGpsError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const gpsWatchIdRef = useRef(null);
  const wsControllerRef = useRef(null);
  const gpsDeviceId = useRef(`browser-${Date.now().toString(36)}`); // Unique device ID for this browser session

  // Map viewport canvas state
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 580 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, centerLng: 0, centerLat: 0 });

  // ─────────────────────────────────────────────────────────────
  // AI ROUTE & FUEL OPTIMIZATION STATES
  // ─────────────────────────────────────────────────────────────
  const [isAiRouteOpen, setIsAiRouteOpen] = useState(urlAutoRoute || true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [originHubId, setOriginHubId] = useState('guwahati');
  const [destHubId, setDestHubId] = useState('tawang');
  const [selectedVehicleId, setSelectedVehicleId] = useState(urlVehicle || 'AS-01-EV-4421');
  const [simulatedFuel, setSimulatedFuel] = useState(48);
  const [activeRouteView, setActiveRouteView] = useState('both'); // 'both' | 'safest' | 'shortest'
  const [routeResult, setRouteResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Load fleet vehicles on mount
  useEffect(() => {
    async function initFleet() {
      const data = await fetchVehicles();
      if (data && data.length > 0) {
        setFleet(data);
        if (urlVehicle) {
          const matched = data.find((v) => v.id === urlVehicle);
          if (matched) {
            setSelectedVehicleId(matched.id);
            setSimulatedFuel(matched.current_fuel_litres);
          }
        }
      }
    }
    initFleet();
  }, [urlVehicle]);

  // When selected vehicle changes, sync fuel level
  useEffect(() => {
    const currentVeh = fleet.find((v) => v.id === selectedVehicleId);
    if (currentVeh) {
      setSimulatedFuel(currentVeh.current_fuel_litres);
    }
  }, [selectedVehicleId, fleet]);

  // Re-run route optimization whenever route parameters change
  useEffect(() => {
    let isCancelled = false;

    async function runOptimization() {
      setIsOptimizing(true);
      try {
        let result;
        if (originHubId === 'current-gps' && deviceGPS) {
          const originObj = {
            id: 'current-gps',
            name: 'My Current Device GPS',
            lat: deviceGPS.lat,
            lng: deviceGPS.lng,
            elevation_m: Math.round(deviceGPS.altitude_m || 80),
            state: 'Live GPS Unit'
          };
          const destObj = NER_HUBS.find((h) => h.id === destHubId) || NER_HUBS[2];
          const { calculateRealHighwayRoute } = await import('../services/googleDirectionsService');
          result = await calculateRealHighwayRoute({
            origin: originObj,
            destination: destObj,
            vehicleId: selectedVehicleId,
            simulatedFuel,
            hazards: HAZARD_INCIDENTS
          });
        } else {
          result = await optimizeAIRoute(
            originHubId,
            destHubId,
            selectedVehicleId,
            simulatedFuel
          );
        }

        if (!isCancelled && result) {
          setRouteResult(result);
        }
      } catch (err) {
        console.error('Route optimization error:', err);
      } finally {
        if (!isCancelled) setIsOptimizing(false);
      }
    }

    runOptimization();

    return () => {
      isCancelled = true;
    };
  }, [originHubId, destHubId, selectedVehicleId, simulatedFuel, originHubId === 'current-gps' ? deviceGPS?.lat : null]);

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

  // ─────────────────────────────────────────────────────────────
  // GPS NAVIGATOR: Browser Geolocation Watcher
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setGpsStatus('searching');

    const watchId = startGPSTracking(
      (gpsData) => {
        setDeviceGPS(gpsData);
        setGpsStatus('active');
        setGpsError(null);

        // Build trail (keep last 200 points)
        setGpsTrail((prev) => {
          const next = [...prev, { lat: gpsData.lat, lng: gpsData.lng }];
          return next.length > 200 ? next.slice(-200) : next;
        });

        // Send to backend (fire-and-forget for low latency)
        sendGPSUpdate({
          device_id: gpsDeviceId.current,
          ...gpsData,
        });
      },
      (error) => {
        setGpsStatus('error');
        setGpsError(error.message || 'GPS unavailable');
      }
    );

    gpsWatchIdRef.current = watchId;

    return () => {
      if (gpsWatchIdRef.current !== null) {
        stopGPSTracking(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, []);

  // GPS Follow Mode: auto-center map when GPS updates
  useEffect(() => {
    if (gpsFollowMode && deviceGPS) {
      setCenter({ lat: deviceGPS.lat, lng: deviceGPS.lng });
    }
  }, [gpsFollowMode, deviceGPS]);

  // ─────────────────────────────────────────────────────────────
  // GPS NAVIGATOR: WebSocket Fleet Position Sync
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = connectGPSWebSocket({
      onGPSUpdate: (data) => {
        // Update matching vehicle in fleet state with new GPS position
        setFleet((prevFleet) =>
          prevFleet.map((v) =>
            v.id === data.device_id
              ? { ...v, lat: data.lat, lng: data.lng, current_location: `GPS Live: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` }
              : v
          )
        );
      },
      onInitialState: (positions) => {
        if (positions && positions.length > 0) {
          setFleet((prevFleet) => {
            const updated = [...prevFleet];
            positions.forEach((pos) => {
              const idx = updated.findIndex((v) => v.id === pos.device_id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], lat: pos.lat, lng: pos.lng };
              }
            });
            return updated;
          });
        }
      },
      onConnect: () => setWsConnected(true),
      onDisconnect: () => setWsConnected(false),
    });

    wsControllerRef.current = controller;

    return () => {
      if (wsControllerRef.current) {
        wsControllerRef.current.close();
        wsControllerRef.current = null;
      }
    };
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

  // Convert Route Coordinates to SVG Path
  const getSvgPathFromCoords = (coords) => {
    if (!coords || coords.length === 0) return '';
    return coords
      .map(([lat, lng], idx) => {
        const pt = coordToScreen(lat, lng);
        return `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  const shortestSvgPath = useMemo(() => {
    if (!routeResult?.shortest_route?.coordinates) return '';
    return getSvgPathFromCoords(routeResult.shortest_route.coordinates);
  }, [routeResult, center, zoom, dimensions]);

  const safestSvgPath = useMemo(() => {
    if (!routeResult?.safest_route?.coordinates) return '';
    return getSvgPathFromCoords(routeResult.safest_route.coordinates);
  }, [routeResult, center, zoom, dimensions]);

  const safestMidpointScreen = useMemo(() => {
    const coords = routeResult?.safest_route?.coordinates;
    if (!coords || coords.length < 2) return null;
    const midIdx = Math.floor(coords.length / 2);
    const [lat, lng] = coords[midIdx];
    return coordToScreen(lat, lng);
  }, [routeResult, center, zoom, dimensions]);

  const activeLocalities = useMemo(() => {
    if (!routeResult) return [];
    if (activeRouteView === 'safest') return routeResult.safest_route?.localities || [];
    if (activeRouteView === 'shortest') return routeResult.shortest_route?.localities || [];
    const safest = routeResult.safest_route?.localities || [];
    const shortest = routeResult.shortest_route?.localities || [];
    // If 'both', show safest as primary and non-duplicate shortest localities
    return [...safest, ...shortest.filter((s) => !safest.some((sf) => sf.name === s.name))];
  }, [routeResult, activeRouteView]);

  const currentVehicleObj = fleet.find((v) => v.id === selectedVehicleId) || fleet[0];
  const maxFuelCap = currentVehicleObj ? currentVehicleObj.fuel_capacity_litres : 100;
  const currentFuelPct = +((simulatedFuel / maxFuelCap) * 100).toFixed(1);

  return (
    <div className={`space-y-4 transition-all duration-300 ${isZenMode ? 'p-2 max-w-full' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* Real-time Map Dashboard Header (Hidden in Zen Mode) */}
      {!isZenMode && (
        <>
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Radio size={13} className="animate-pulse" />
              <span>LIVE SLIPPY MAP • ZERO LEAFLET • ZERO SDK LIMITS</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Sparkles size={12} className="text-amber-400" />
              <span>AI Route & Fuel Optimization Engine</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            Geospatial Tactical Map & AI Fuel Router
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time calculation comparing the <strong className="text-rose-400">Shortest Route</strong> and <strong className="text-emerald-400">Safest Route</strong> based on vehicle fuel reserves and mountain terrain risks.
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zen Focus Mode Toggle */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md bg-slate-900/90 text-amber-300 hover:text-white hover:bg-slate-800 border border-slate-700"
            title="Expand map to full viewport"
          >
            <Maximize2 size={15} className="text-amber-400" />
            <span>Zen Mode</span>
          </button>

          {/* AI Router Toggle */}
          <button
            onClick={() => setIsAiRouteOpen(!isAiRouteOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md ${
              isAiRouteOpen
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400/40'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Route size={15} />
            <span>AI Fuel Router {isAiRouteOpen ? 'Active' : 'Closed'}</span>
          </button>

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
      </>
    )}

      {/* Main Interactive Map & Intelligence Split View */}
      <div className={`grid grid-cols-1 ${isAiRouteOpen ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 relative`}>
        {/* Slippy Canvas Viewport */}
        <div className={`${isAiRouteOpen ? 'lg:col-span-7 xl:col-span-8' : 'col-span-1'} bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300`}>
          {/* Map Layer Toolbar */}
          <div className="p-3 bg-slate-800/95 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center space-x-2">
              {/* Map Engine Mode Switcher */}
              <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-[11px] shadow-sm mr-1">
                <button
                  onClick={() => setMapEngine('google')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    mapEngine === 'google'
                      ? 'bg-emerald-600 text-white shadow-[0_0_10px_#10b981]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe size={12} />
                  <span>Google Maps</span>
                </button>
                <button
                  onClick={() => setMapEngine('offline')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    mapEngine === 'offline'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield size={12} />
                  <span>Offline Mode</span>
                </button>
              </div>

              <Layers size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">LAYERS:</span>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, routes: !p.routes }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                  filterLayer.routes ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Route size={12} />
                <span>AI Routes</span>
              </button>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, vehicles: !p.vehicles }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterLayer.vehicles ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Fleet ({fleet.length})
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
                Hubs ({NER_HUBS.length})
              </button>
              <button
                onClick={() => setFilterLayer((p) => ({ ...p, gps: !p.gps }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                  filterLayer.gps ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Satellite size={12} />
                <span>GPS {gpsStatus === 'active' ? '●' : '○'}</span>
              </button>
              {routeResult && activeLocalities.length > 0 && (
                <button
                  onClick={() => setFilterLayer((p) => ({ ...p, localities: !p.localities }))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                    filterLayer.localities ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <MapPin size={12} />
                  <span>Localities ({activeLocalities.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Route Selector on map header */}
              {filterLayer.routes && routeResult && (
                <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-[11px] shadow-md backdrop-blur-sm">
                  <button
                    onClick={() => setActiveRouteView('both')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      activeRouteView === 'both' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Both Routes
                  </button>
                  <button
                    onClick={() => setActiveRouteView('safest')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      activeRouteView === 'safest'
                        ? 'bg-emerald-600 text-white shadow-[0_0_12px_#10b981] ring-1 ring-emerald-300'
                        : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/50'
                    }`}
                  >
                    <Shield size={12} className={activeRouteView === 'safest' ? 'animate-pulse text-white' : 'text-emerald-400'} />
                    <span>Safest</span>
                  </button>
                  <button
                    onClick={() => setActiveRouteView('shortest')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      activeRouteView === 'shortest' ? 'bg-rose-600 text-white shadow' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    Shortest
                  </button>
                </div>
              )}

              {/* Optimizer Drawer Toggle */}
              <button
                onClick={() => setIsAiRouteOpen(!isAiRouteOpen)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isAiRouteOpen
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isAiRouteOpen ? 'Collapse AI Route Optimizer' : 'Open AI Route Optimizer'}
              >
                <Sparkles size={12} className={isAiRouteOpen ? 'text-amber-300' : 'text-slate-400'} />
                <span className="hidden sm:inline">{isAiRouteOpen ? 'Hide Optimizer' : 'Optimizer'}</span>
              </button>

              {/* Zen Fullscreen Focus Mode */}
              <button
                onClick={() => setIsZenMode(!isZenMode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isZenMode
                    ? 'bg-amber-600 text-white shadow-[0_0_10px_#d97706]'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isZenMode ? 'Exit Zen Focus Mode' : 'Enter Immersive Zen Focus Mode'}
              >
                {isZenMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span className="hidden sm:inline">{isZenMode ? 'Exit Zen' : 'Zen Focus'}</span>
              </button>
            </div>
          </div>

          {/* Floating Re-Open Optimizer Button when drawer is collapsed */}
          {!isAiRouteOpen && (
            <button
              onClick={() => setIsAiRouteOpen(true)}
              className="absolute top-16 right-4 z-30 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-2xl border border-blue-400/40 flex items-center space-x-2 cursor-pointer backdrop-blur-md transition-all hover:scale-105"
            >
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Open AI Route & Fuel Optimizer</span>
            </button>
          )}

          {mapEngine === 'google' ? (
            <GoogleMapView
              apiKey={googleMapsApiKey}
              center={center}
              zoom={zoom}
              heightClass={isZenMode ? 'h-[calc(100vh-140px)] min-h-[720px]' : 'h-[640px]'}
              routeResult={routeResult}
              activeRouteView={activeRouteView}
              fleet={fleet}
              selectedVehicleId={selectedVehicleId}
              hubs={NER_HUBS}
              hazards={HAZARD_INCIDENTS}
              localities={activeLocalities}
              filterLayer={filterLayer}
              deviceGPS={deviceGPS}
              deviceHeading={deviceGPS?.heading_deg}
              onHeadingChange={(h) => {
                setDeviceGPS((prev) => (prev ? { ...prev, heading_deg: h } : { lat: center.lat, lng: center.lng, heading_deg: h }));
              }}
              gpsFollowMode={gpsFollowMode}
              onSelectEntity={(entity) => {
                setSelectedEntity(entity);
                if (entity.id && fleet.some((v) => v.id === entity.id)) {
                  setSelectedVehicleId(entity.id);
                }
              }}
              onLocalityClick={(loc) => setSelectedLocality(loc)}
              onRealRouteComputed={(newRoute) => setRouteResult(newRoute)}
              onMapError={(reason) => {
                if (reason === 'fallback' || reason === 'Missing API Key') {
                  console.warn('Switching to offline emergency vector map:', reason);
                  setMapEngine('offline');
                } else {
                  console.warn('Google Map notice:', reason);
                }
              }}
            />
          ) : (
            /* Interactive Drag & Zoom Viewport (Offline Mode) */
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative w-full ${isZenMode ? 'h-[calc(100vh-140px)] min-h-[720px]' : 'h-[640px]'} bg-slate-950 overflow-hidden select-none ${
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
                    e.target.style.opacity = '0.3';
                  }}
                />
              ))}
            </div>

            {/* SVG Vectors Layer: Renders Shortest & Safest AI Polyline Routes */}
            {filterLayer.routes && routeResult && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                <defs>
                  {/* Glow filter for Safest Route */}
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10b981" floodOpacity="0.8" />
                  </filter>
                  {/* Glow filter for Shortest Route */}
                  <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.7" />
                  </filter>
                </defs>

                {/* 1. Safest Route (Emerald Green Multi-layered Highlight with Flow & Photon Animation) */}
                {(activeRouteView === 'both' || activeRouteView === 'safest') && safestSvgPath && (
                  <g>
                    {/* Outer Pulsating Halo */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={activeRouteView === 'safest' ? '18' : '14'}
                      strokeOpacity="0.45"
                      filter="url(#glow-emerald)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-lifeline-pulse"
                    />
                    {/* Secondary Deep Protective Bed */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#047857"
                      strokeWidth={activeRouteView === 'safest' ? '8' : '7'}
                      strokeOpacity="0.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main High-Visibility Emerald Vector Core */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* High-Tech Animated Forward-Flowing Light Streamer */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#a7f3d0"
                      strokeWidth="2.5"
                      strokeDasharray="14 14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-lifeline-flow"
                    />
                    {/* Continuous Moving GPS Light Photons / Convoy Beacons along Safest Path */}
                    <g>
                      <circle r="7" fill="#10b981" fillOpacity="0.5" filter="url(#glow-emerald)">
                        <animateMotion dur="5.5s" repeatCount="indefinite" path={safestSvgPath} />
                      </circle>
                      <circle r="3.5" fill="#6ee7b7">
                        <animateMotion dur="5.5s" repeatCount="indefinite" path={safestSvgPath} />
                      </circle>
                      <circle r="1.5" fill="#ffffff">
                        <animateMotion dur="5.5s" repeatCount="indefinite" path={safestSvgPath} />
                      </circle>

                      {/* Staggered Secondary Follower Beacon */}
                      <circle r="5" fill="#34d399" fillOpacity="0.4" filter="url(#glow-emerald)">
                        <animateMotion dur="5.5s" begin="2.75s" repeatCount="indefinite" path={safestSvgPath} />
                      </circle>
                      <circle r="2.5" fill="#a7f3d0">
                        <animateMotion dur="5.5s" begin="2.75s" repeatCount="indefinite" path={safestSvgPath} />
                      </circle>
                    </g>
                  </g>
                )}

                {/* 2. Shortest Route (Amber/Rose Dashed Line) */}
                {(activeRouteView === 'both' || activeRouteView === 'shortest') && shortestSvgPath && (
                  <g>
                    {/* Outer Glow Halo */}
                    <path
                      d={shortestSvgPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="8"
                      strokeOpacity="0.25"
                      filter="url(#glow-rose)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main Dashed Vector Line */}
                    <path
                      d={shortestSvgPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3.5"
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
              </svg>
            )}

            {/* Strategic Regional Hub Markers */}
            {filterLayer.hubs &&
              NER_HUBS.map((hub) => {
                const pos = coordToScreen(hub.lat, hub.lng);
                if (pos.x < -50 || pos.x > dimensions.width + 50 || pos.y < -50 || pos.y > dimensions.height + 50) return null;
                const isSelected = selectedEntity?.id === hub.id;
                const isOrigin = routeResult?.origin?.id === hub.id;
                const isDest = routeResult?.destination?.id === hub.id;

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
                    {isDest && (
                      <div className="absolute -inset-2.5 rounded-full bg-emerald-400/50 animate-ping pointer-events-none"></div>
                    )}
                    {isOrigin && (
                      <div className="absolute -inset-2.5 rounded-full bg-blue-400/50 animate-ping pointer-events-none"></div>
                    )}
                    <div className={`relative p-1.5 rounded-full border-2 shadow-lg transition-transform hover:scale-125 ${
                      isOrigin
                        ? 'bg-blue-600 border-white ring-4 ring-blue-500/50'
                        : isDest
                        ? 'bg-emerald-600 border-white ring-4 ring-emerald-500/50 shadow-[0_0_15px_#10b981]'
                        : isSelected
                        ? 'bg-blue-500 border-white ring-4 ring-blue-500/40'
                        : 'bg-slate-900 border-blue-400 text-blue-400'
                    }`}>
                      <MapPin size={14} className="text-white" />
                    </div>
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none border border-slate-700 flex items-center space-x-1 z-30">
                      <span>{hub.name}</span>
                      {isOrigin && <span className="text-blue-400 font-extrabold">• ORIGIN</span>}
                      {isDest && <span className="text-emerald-400 font-extrabold">• DEST</span>}
                    </div>
                  </div>
                );
              })}

            {/* Route Waypoints, Fuel Stops & Floating Safest Corridor Badge */}
            {filterLayer.routes && routeResult && (
              <>
                {/* Floating On-Map Safest Corridor Highlight Badge */}
                {safestMidpointScreen && (activeRouteView === 'both' || activeRouteView === 'safest') && (
                  <div
                    style={{ left: `${safestMidpointScreen.x}px`, top: `${safestMidpointScreen.y - 30}px` }}
                    className="absolute -translate-x-1/2 -translate-y-full z-25 pointer-events-auto cursor-pointer select-none group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRouteView('safest');
                    }}
                  >
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-950/95 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.7)] backdrop-blur-md hover:scale-110 transition-transform animate-lifeline-pulse">
                      <Shield size={13} className="text-emerald-400 animate-pulse flex-shrink-0" />
                      <span className="text-[10px] font-black tracking-wider uppercase">Safest Corridor</span>
                      <span className="text-[9px] bg-emerald-500/25 text-emerald-200 font-extrabold px-1.5 py-0.5 rounded border border-emerald-400/50">
                        {routeResult.safest_route.landslide_probability_pct}% Risk
                      </span>
                    </div>
                    {/* Downward indicator arrow */}
                    <div className="w-2.5 h-2.5 bg-slate-950 border-r-2 border-b-2 border-emerald-400 rotate-45 mx-auto -mt-1.5"></div>
                  </div>
                )}
                {/* Fuel Stops Pins */}
                {((activeRouteView === 'both' || activeRouteView === 'safest')
                  ? routeResult.safest_route.fuel_stops
                  : routeResult.shortest_route.fuel_stops
                ).map((stop, sIdx) => {
                  const pos = coordToScreen(stop.lat, stop.lng);
                  if (pos.x < -30 || pos.x > dimensions.width + 30 || pos.y < -30 || pos.y > dimensions.height + 30) return null;

                  return (
                    <div
                      key={`fuel-${sIdx}`}
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-full bg-amber-500 text-slate-950 border-2 border-white shadow-xl hover:scale-125 transition-transform">
                        <Fuel size={13} />
                      </div>
                      <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-950/95 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-amber-500/50 pointer-events-none">
                        ⛽ {stop.name} ({stop.distance_from_origin_km} km)
                      </div>
                    </div>
                  );
                })}

                {/* Google Maps-Style Localities & Areas along the Route */}
                {filterLayer.localities &&
                  activeLocalities.map((loc, lIdx) => {
                    const pos = coordToScreen(loc.lat, loc.lng);
                    if (pos.x < -80 || pos.x > dimensions.width + 80 || pos.y < -80 || pos.y > dimensions.height + 80) return null;
                    const isSelected = selectedLocality?.id === loc.id;
                    const isMountainPass = loc.is_mountain_pass || loc.elevation_m > 2000;

                    return (
                      <div
                        key={loc.id || `loc-${lIdx}`}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-22 group cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocality(isSelected ? null : loc);
                        }}
                      >
                        {/* Visual Route Node Anchor Dot */}
                        <div className="relative flex items-center justify-center">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-all ${
                              isSelected
                                ? 'bg-emerald-400 ring-4 ring-emerald-300 scale-125'
                                : isMountainPass
                                ? 'bg-amber-400 ring-2 ring-amber-300/60'
                                : 'bg-emerald-500 ring-1 ring-slate-900 group-hover:scale-125'
                            }`}
                          />
                          <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                        </div>

                        {/* Google Maps-style Locality Label Pill */}
                        <div
                          className={`absolute top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md shadow-md backdrop-blur-md flex items-center space-x-1 whitespace-nowrap transition-all border pointer-events-none ${
                            isSelected
                              ? 'bg-emerald-950/95 text-white border-emerald-400 font-extrabold z-30 scale-105 ring-2 ring-emerald-500/40'
                              : 'bg-slate-950/85 text-slate-200 border-slate-700/80 text-[10px] font-semibold group-hover:bg-slate-900 group-hover:border-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isMountainPass ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                          <span>{loc.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">+{loc.distance_from_origin_km}km</span>
                        </div>

                        {/* Interactive Detail Popover when clicked or selected */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-slate-950/95 border border-emerald-400/80 shadow-2xl backdrop-blur-xl text-left z-40 space-y-2 pointer-events-auto"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                  <MapPin size={12} className="text-emerald-400" />
                                  <span>{loc.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {loc.district ? `${loc.district}, ` : ''}{loc.state}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLocality(null);
                                }}
                                className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                                <span className="text-slate-400 block text-[9px]">DISTANCE</span>
                                <span className="font-bold text-white">+{loc.distance_from_origin_km} km</span>
                              </div>
                              <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                                <span className="text-slate-400 block text-[9px]">ELEVATION</span>
                                <span className="font-bold text-emerald-400">{loc.elevation_m} m</span>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-300">
                              <span className="text-slate-500 text-[9px] block">ROAD TYPE:</span>
                              <span className="font-semibold text-white">{loc.road_type}</span>
                            </div>

                            {loc.amenities && loc.amenities.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-slate-500 text-[9px] block uppercase font-bold">Transit Amenities:</span>
                                <div className="flex flex-wrap gap-1">
                                  {loc.amenities.map((am, aIdx) => (
                                    <span key={aIdx} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-emerald-300 border border-slate-800">
                                      {am}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </>
            )}

            {/* Real-time Fleet Vehicles */}
            {filterLayer.vehicles &&
              fleet.map((vehicle) => {
                const pos = coordToScreen(vehicle.lat, vehicle.lng);
                if (pos.x < -50 || pos.x > dimensions.width + 50 || pos.y < -50 || pos.y > dimensions.height + 50) return null;
                const isSelected = selectedVehicleId === vehicle.id;

                return (
                  <div
                    key={vehicle.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicleId(vehicle.id);
                      setSelectedEntity(vehicle);
                    }}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                  >
                    <div className="absolute -inset-3 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></div>
                    <div
                      className={`relative flex items-center justify-center p-2 rounded-xl shadow-2xl border-2 transition-all hover:scale-125 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-white ring-4 ring-blue-400/50'
                          : 'bg-slate-900 text-emerald-400 border-emerald-400'
                      }`}
                    >
                      <Truck size={15} />
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-950/95 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-emerald-800 pointer-events-none flex items-center space-x-1">
                      <span>{vehicle.id}</span>
                      <span className="text-amber-400">({vehicle.current_fuel_litres}L)</span>
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

            {/* ═══════════════════════════════════════════════════ */}
            {/* REAL-TIME GPS NAVIGATOR: Blue Dot + Trail + Accuracy */}
            {/* ═══════════════════════════════════════════════════ */}
            {filterLayer.gps && deviceGPS && (() => {
              const gpsPos = coordToScreen(deviceGPS.lat, deviceGPS.lng);
              const isVisible = gpsPos.x > -80 && gpsPos.x < dimensions.width + 80 &&
                                gpsPos.y > -80 && gpsPos.y < dimensions.height + 80;
              if (!isVisible) return null;

              // Calculate accuracy circle radius in pixels
              const accuracyPx = deviceGPS.accuracy_m
                ? Math.max(12, Math.min(150, deviceGPS.accuracy_m * Math.pow(2, zoom) / 40000))
                : 0;

              return (
                <>
                  {/* GPS Trail Breadcrumb SVG */}
                  {gpsTrail.length > 1 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-14">
                      <defs>
                        <linearGradient id="gps-trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>
                      <path
                        d={gpsTrail.map((pt, i) => {
                          const s = coordToScreen(pt.lat, pt.lng);
                          return `${i === 0 ? 'M' : 'L'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
                        }).join(' ')}
                        fill="none"
                        stroke="url(#gps-trail-gradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}

                  {/* GPS Accuracy Circle */}
                  {accuracyPx > 12 && (
                    <div
                      style={{
                        left: `${gpsPos.x}px`,
                        top: `${gpsPos.y}px`,
                        width: `${accuracyPx * 2}px`,
                        height: `${accuracyPx * 2}px`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 border border-cyan-400/30 pointer-events-none z-35"
                    />
                  )}

                  {/* GPS Blue Dot (Google Maps Style) */}
                  <div
                    style={{ left: `${gpsPos.x}px`, top: `${gpsPos.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-45 pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGpsFollowMode(!gpsFollowMode);
                    }}
                  >
                    {/* Outer pulse ring */}
                    <div className="absolute -inset-4 rounded-full bg-cyan-400/25 animate-ping pointer-events-none" />
                    {/* Middle halo */}
                    <div className="absolute -inset-2.5 rounded-full bg-cyan-400/20 pointer-events-none" />
                    {/* Inner blue dot */}
                    <div className={`relative w-5 h-5 rounded-full border-[3px] border-white shadow-[0_0_12px_rgba(6,182,212,0.8)] ${
                      gpsFollowMode
                        ? 'bg-cyan-400'
                        : 'bg-blue-500'
                    }`}>
                      {/* Heading indicator arrow */}
                      {deviceGPS.heading_deg != null && (
                        <div
                          className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-cyan-400"
                          style={{ transform: `translateX(-50%) rotate(${deviceGPS.heading_deg}deg)` }}
                        />
                      )}
                    </div>
                    {/* Label */}
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-cyan-950/95 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-cyan-500/50 pointer-events-none flex items-center space-x-1">
                      <CircleDot size={10} className="text-cyan-400" />
                      <span>You Are Here</span>
                      {gpsFollowMode && <span className="text-cyan-400">• FOLLOW</span>}
                    </div>
                  </div>
                </>
              );
            })()}


            {/* In-Map Route Legend Overlay */}
            {filterLayer.routes && routeResult && (
              <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md z-35 text-xs space-y-2 pointer-events-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Sparkles size={12} className="text-blue-400" />
                  <span>AI Route Legend:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                  <span className="font-bold text-emerald-400">Safest Route</span>
                  <span className="text-[10px] text-slate-400">({routeResult.safest_route.distance_km} km)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-1 border-b-2 border-dashed border-rose-500"></div>
                  <span className="font-bold text-rose-400">Shortest Route</span>
                  <span className="text-[10px] text-slate-400">({routeResult.shortest_route.distance_km} km)</span>
                </div>
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800 text-[10px] text-amber-300">
                  <Fuel size={12} className="text-amber-400" />
                  <span>Verified Emergency Refueling Checkpoint</span>
                </div>
              </div>
            )}

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
              {/* GPS Follow Mode / Locate Me Button */}
              <button
                onClick={() => {
                  if (deviceGPS) {
                    setGpsFollowMode(!gpsFollowMode);
                    if (!gpsFollowMode) {
                      jumpToLocation(deviceGPS.lat, deviceGPS.lng, Math.max(zoom, 12));
                    }
                  }
                }}
                className={`p-2.5 rounded-xl border shadow-xl transition-all active:scale-95 cursor-pointer ${
                  gpsFollowMode
                    ? 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-400/50'
                    : deviceGPS
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border-slate-700'
                    : 'bg-slate-900/90 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'
                }`}
                title={gpsFollowMode ? 'GPS Follow Mode ON' : 'Locate Me (GPS)'}
                disabled={!deviceGPS}
              >
                <LocateFixed size={16} />
              </button>
            </div>

            {/* Mouse Coordinates + GPS Telemetry HUD */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 shadow-lg pointer-events-none flex flex-col gap-1 backdrop-blur-sm z-40">
              <div className="flex items-center space-x-3">
                <span className="text-emerald-400 font-bold">LAT: {mouseCoord.lat}°N</span>
                <span className="text-blue-400 font-bold">LNG: {mouseCoord.lng}°E</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{BASEMAP_TILES[basemap].name}</span>
              </div>
              {/* GPS Telemetry Row */}
              {deviceGPS && filterLayer.gps && (
                <div className="flex items-center space-x-3 pt-1 border-t border-slate-800">
                  <span className="flex items-center space-x-1">
                    <Satellite size={11} className={gpsStatus === 'active' ? 'text-cyan-400' : 'text-slate-500'} />
                    <span className={gpsStatus === 'active' ? 'text-cyan-400 font-bold' : 'text-slate-500'}>GPS</span>
                  </span>
                  <span className="text-cyan-300">
                    {deviceGPS.lat.toFixed(5)}°, {deviceGPS.lng.toFixed(5)}°
                  </span>
                  {deviceGPS.speed_kmh != null && (
                    <span className="text-amber-300">{deviceGPS.speed_kmh} km/h</span>
                  )}
                  {deviceGPS.accuracy_m != null && (
                    <span className="text-slate-400">±{deviceGPS.accuracy_m}m</span>
                  )}
                  {deviceGPS.altitude_m != null && (
                    <span className="text-indigo-300">↑{deviceGPS.altitude_m}m</span>
                  )}
                  <span className="text-slate-500">|</span>
                  <span className={wsConnected ? 'text-emerald-400' : 'text-rose-400'}>
                    WS: {wsConnected ? 'Live' : 'Off'}
                  </span>
                </div>
              )}
              {gpsStatus === 'error' && (
                <div className="text-rose-400 text-[10px] pt-0.5">
                  ⚠ GPS: {gpsError || 'Location access denied'}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Intelligence Sidebar: AI Fuel Route Optimizer & Tactical Telemetry */}
        {isAiRouteOpen && (
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* AI Route Optimizer Panel */}
            <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">AI Route & Fuel Optimizer</h3>
                    <p className="text-[11px] text-slate-400">Shortest vs. Safest Terrain Feasibility</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isOptimizing ? (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <RefreshCw size={11} className="animate-spin text-blue-400" />
                      <span>Computing</span>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      AI Active
                    </span>
                  )}
                  <button
                    onClick={() => setIsAiRouteOpen(false)}
                    title="Collapse Optimizer to expand map"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

            {/* Route Hubs Selection Form */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Origin</label>
                  {deviceGPS && (
                    <button
                      onClick={() => setOriginHubId(originHubId === 'current-gps' ? 'guwahati' : 'current-gps')}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center space-x-1 ${
                        originHubId === 'current-gps'
                          ? 'bg-cyan-600 text-white shadow-[0_0_8px_#06b6d4]'
                          : 'text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/60'
                      }`}
                    >
                      <Satellite size={9} />
                      <span>{originHubId === 'current-gps' ? 'Using GPS' : 'Route from GPS'}</span>
                    </button>
                  )}
                </div>
                <select
                  value={originHubId}
                  onChange={(e) => setOriginHubId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 font-medium"
                >
                  {deviceGPS && (
                    <option value="current-gps">
                      📍 My Live GPS Location ({deviceGPS.lat.toFixed(3)}, {deviceGPS.lng.toFixed(3)})
                    </option>
                  )}
                  {NER_HUBS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Destination</label>
                <select
                  value={destHubId}
                  onChange={(e) => setDestHubId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 font-medium"
                >
                  {NER_HUBS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Selection & Live Fuel Gauge */}
            <div className="space-y-2 text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Relief Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 font-medium"
              >
                {fleet.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.license_plate}) • {v.current_fuel_litres}L in tank
                  </option>
                ))}
              </select>

              {/* Dynamic Fuel Gauge & Interactive Simulation Slider */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Fuel size={15} className={currentFuelPct < 30 ? 'text-rose-400' : currentFuelPct < 55 ? 'text-amber-400' : 'text-emerald-400'} />
                    <span className="font-bold text-slate-200">Live Fuel Level in Tank</span>
                  </div>
                  <span className={`font-mono font-bold text-xs ${currentFuelPct < 30 ? 'text-rose-400' : currentFuelPct < 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {simulatedFuel} L / {maxFuelCap} L ({currentFuelPct}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      currentFuelPct < 30 ? 'bg-rose-500' : currentFuelPct < 55 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, currentFuelPct))}%` }}
                  ></div>
                </div>

                {/* Interactive Fuel Simulator Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Sliders size={10} className="text-blue-400" />
                      <span>Simulate Fuel Level (What-If Analysis):</span>
                    </span>
                    <span className="font-mono text-white font-bold">{simulatedFuel} Litres</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max={maxFuelCap}
                    step="1"
                    value={simulatedFuel}
                    onChange={(e) => setSimulatedFuel(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>5L (Critical)</span>
                    <span>{Math.round(maxFuelCap / 2)}L (Half Tank)</span>
                    <span>{maxFuelCap}L (Full Tank)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">BASE FUEL RATE:</span>
                    <span className="font-semibold text-slate-200">{currentVehicleObj?.fuel_consumption_km_per_l} km/L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">SAFE CRUISING RANGE:</span>
                    <span className="font-bold text-indigo-300 font-mono">
                      {routeResult?.vehicle_telemetry?.remaining_range_km || currentVehicleObj?.remaining_range_km} km
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendation Banner */}
            {routeResult?.ai_recommendation && (
              <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                routeResult.ai_recommendation.recommended_route_type === 'safest'
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-amber-950/40 border-amber-500/40'
              }`}>
                <div className="flex items-center space-x-2">
                  {routeResult.ai_recommendation.recommended_route_type === 'safest' ? (
                    <Shield size={16} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                  )}
                  <span className="font-extrabold text-white tracking-tight">
                    {routeResult.ai_recommendation.headline}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {routeResult.ai_recommendation.rationale}
                </p>
                {routeResult.ai_recommendation.refuel_advisory && (
                  <div className="p-2 rounded-lg bg-slate-900/80 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                    {routeResult.ai_recommendation.refuel_advisory}
                  </div>
                )}
              </div>
            )}

            {/* Dual Route Cards: Shortest vs Safest Comparison */}
            {routeResult && (
              <div className="space-y-3">
                {/* Real-time Highway Routing Badge */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs shadow-md ${
                  routeResult.is_real_google_route
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-blue-950/80 border-blue-500/50 text-blue-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${routeResult.is_real_google_route ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
                    <div>
                      <span className="font-extrabold text-white text-[11px] block">
                        {routeResult.is_real_google_route ? '100% Real Road Network (Google Directions)' : 'Authentic National Highway Corridor'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {routeResult.provider || 'Google Maps Platform'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    routeResult.is_real_google_route
                      ? 'bg-emerald-900/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-blue-900/60 border-blue-500/40 text-blue-300'
                  }`}>
                    {routeResult.is_real_google_route ? 'LIVE TRAFFIC' : 'SOVEREIGN HIGHWAY'}
                  </span>
                </div>

                {/* 1. Safest Route Card */}
                <div
                  onClick={() => {
                    setActiveRouteView('safest');
                    if (routeResult.safest_route.coordinates?.[3]) {
                      jumpToLocation(routeResult.safest_route.coordinates[3][0], routeResult.safest_route.coordinates[3][1], 8);
                    }
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    activeRouteView === 'safest' || activeRouteView === 'both'
                      ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-emerald-950/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-emerald-500/50'
                  }`}
                >
                  {/* Subtle dynamic shimmer layer */}
                  <div className="absolute inset-0 animate-safest-shimmer pointer-events-none opacity-30"></div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <Shield size={13} className="text-emerald-400" />
                          <span className="font-extrabold text-emerald-300 text-xs tracking-wide">Safest Route (Fortified Bypass)</span>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 font-semibold block">★ AI Top Recommendation</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      LOW RISK ({routeResult.safest_route.landslide_probability_pct}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs relative z-10">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">DISTANCE</span>
                      <span className="font-bold text-white">{routeResult.safest_route.distance_km} km</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">EST. TIME</span>
                      <span className="font-bold text-white">{routeResult.safest_route.eta_hours} hrs</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">FUEL NEEDED</span>
                      <span className="font-bold text-emerald-400">{routeResult.safest_route.fuel_required_litres} L</span>
                    </div>
                  </div>

                  {/* Fuel Feasibility Margin Badge */}
                  <div className="flex items-center justify-between text-xs pt-1 relative z-10">
                    <span className="text-slate-400 text-[11px]">Fuel Feasibility Status:</span>
                    {routeResult.safest_route.fuel_sufficient ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                        <Check size={12} />
                        <span>Sufficient (+{routeResult.safest_route.fuel_margin_litres}L Margin)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                        <AlertTriangle size={12} />
                        <span>Deficit ({routeResult.safest_route.fuel_margin_litres}L)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Shortest Route Card */}
                <div
                  onClick={() => {
                    setActiveRouteView('shortest');
                    if (routeResult.shortest_route.coordinates?.[3]) {
                      jumpToLocation(routeResult.shortest_route.coordinates[3][0], routeResult.shortest_route.coordinates[3][1], 8);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                    activeRouteView === 'shortest' || activeRouteView === 'both'
                      ? 'bg-rose-950/30 border-rose-500/60 shadow-lg'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                      <span className="font-bold text-rose-300 text-xs">Shortest Route (Direct Pass)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      HIGH RISK ({routeResult.shortest_route.landslide_probability_pct}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">DISTANCE</span>
                      <span className="font-bold text-white">{routeResult.shortest_route.distance_km} km</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">EST. TIME</span>
                      <span className="font-bold text-white">{routeResult.shortest_route.eta_hours} hrs</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">FUEL NEEDED</span>
                      <span className="font-bold text-rose-400">{routeResult.shortest_route.fuel_required_litres} L</span>
                    </div>
                  </div>

                  {/* Fuel Feasibility Margin Badge */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 text-[11px]">Fuel Feasibility Status:</span>
                    {routeResult.shortest_route.fuel_sufficient ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                        <Check size={12} />
                        <span>Sufficient (+{routeResult.shortest_route.fuel_margin_litres}L Margin)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                        <AlertTriangle size={12} />
                        <span>Deficit ({routeResult.shortest_route.fuel_margin_litres}L)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Transit Localities & Areas along Corridor (Google Maps Transit Itinerary) */}
                {activeLocalities.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-900/90 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin size={15} className="text-emerald-400" />
                        <span className="font-extrabold text-white text-xs tracking-tight">
                          Transit Localities & Areas ({activeLocalities.length})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {activeRouteView === 'safest' ? 'Safest Corridor' : activeRouteView === 'shortest' ? 'Direct Ridge' : 'Combined'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      Major towns, mountain passes, and transit hubs intersected along this corridor. Click any locality to focus on map.
                    </p>

                    {/* Vertical Progression Timeline */}
                    <div className="relative pl-4 space-y-2.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-emerald-500 before:to-emerald-400">
                      {activeLocalities.map((loc, idx) => {
                        const isSelected = selectedLocality?.id === loc.id;
                        const isMountainPass = loc.is_mountain_pass || loc.elevation_m > 2000;

                        return (
                          <div
                            key={loc.id || idx}
                            onClick={() => {
                              setSelectedLocality(isSelected ? null : loc);
                              jumpToLocation(loc.lat, loc.lng, 9);
                            }}
                            className={`relative p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                            }`}
                          >
                            {/* Timeline Node Dot */}
                            <span
                              className={`absolute -left-[19px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                                isSelected
                                  ? 'bg-emerald-400 ring-2 ring-emerald-400/80'
                                  : isMountainPass
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                            />

                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                                <span>{loc.name}</span>
                                {isMountainPass && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                                    PASS
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-400">
                                +{loc.distance_from_origin_km} km
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span>{loc.district ? `${loc.district}, ` : ''}{loc.state}</span>
                              <span className="font-mono">{loc.elevation_m}m elev • ~{loc.eta_mins}m</span>
                            </div>

                            <div className="text-[9px] text-slate-500 pt-0.5 font-mono">
                              {loc.road_type}
                            </div>

                            {loc.amenities && loc.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1.5">
                                {loc.amenities.map((am, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-slate-300 border border-slate-800"
                                  >
                                    {am}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Turn-by-Turn Real Navigation Steps (Google Directions Road Maneuvers) */}
                {((activeRouteView === 'safest' ? routeResult.safest_route?.navigation_steps : routeResult.shortest_route?.navigation_steps) || routeResult.safest_route?.navigation_steps)?.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-900/90 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Navigation size={15} className="text-blue-400 rotate-45" />
                        <span className="font-extrabold text-white text-xs tracking-tight">
                          Turn-by-Turn Road Navigation ({((activeRouteView === 'safest' ? routeResult.safest_route?.navigation_steps : routeResult.shortest_route?.navigation_steps) || routeResult.safest_route?.navigation_steps).length} Steps)
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                        {routeResult.is_real_google_route ? 'Google Directions' : 'Authentic Highway'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      Real-world highway instructions & maneuvers along this transit corridor. Click any step to inspect road segment.
                    </p>

                    <div className="space-y-2">
                      {((activeRouteView === 'safest' ? routeResult.safest_route?.navigation_steps : routeResult.shortest_route?.navigation_steps) || routeResult.safest_route?.navigation_steps).map((step, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => {
                            if (step.lat && step.lng) {
                              jumpToLocation(step.lat, step.lng, 10);
                            }
                          }}
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all cursor-pointer flex items-start space-x-2.5 text-xs"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                            {step.step_number || sIdx + 1}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="text-slate-200 font-medium text-[11px] leading-snug">
                              {step.instruction}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                              <span className="text-emerald-400 font-bold">+{step.distance_km} km</span>
                              {step.duration_text && <span>• {step.duration_text}</span>}
                              {step.maneuver && step.maneuver !== 'straight' && (
                                <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] border border-slate-700">
                                  {step.maneuver}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default LiveMap;
