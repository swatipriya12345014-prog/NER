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
  Globe,
  Volume2,
  X,
  GitFork,
  Copy
} from 'lucide-react';
import GoogleMapView from '../components/GoogleMapView';
import AIBlockageRerouteModal from '../components/AIBlockageRerouteModal';
import VehicleDossierModal from '../components/VehicleDossierModal';
import {
  fetchVehicles,
  optimizeAIRoute,
  REGIONAL_HUBS,
  FALLBACK_FLEET_VEHICLES
} from '../services/fuelRouteService';
import { searchRealtimeVehicles } from '../services/roadVehicleService';
import { realtimeTrackingService } from '../services/realtimeTrackingService';
import { calculateRealHighwayRoute } from '../services/googleDirectionsService';
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
  const urlOrigin = searchParams.get('origin');
  const urlDest = searchParams.get('dest') || searchParams.get('destination');

  // Center of North East India
  const [center, setCenter] = useState({ lat: 26.2, lng: 92.8 });
  const [zoom, setZoom] = useState(7);
  const [basemap, setBasemap] = useState('streets');
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDP02pC9K1QL7p69lae940OyX1iKcbhAoA';
  const [mapEngine, setMapEngine] = useState('google'); // 'google' | 'offline'

  // Viewport jump utility
  const jumpToLocation = useCallback((lat, lng, targetZoom = 10) => {
    setCenter({ lat, lng });
    setZoom(targetZoom);
  }, []);
  
  // Real-time vehicle fleet state
  const [fleet, setFleet] = useState(FALLBACK_FLEET_VEHICLES);
  const [selectedEntity, setSelectedEntity] = useState(NER_HUBS[0]);
  const [filterLayer, setFilterLayer] = useState({ vehicles: true, hazards: true, hubs: true, routes: true, gps: true, localities: true });
  const [selectedLocality, setSelectedLocality] = useState(null);
  const [mouseCoord, setMouseCoord] = useState({ lat: 26.2, lng: 92.8 });

  // ─────────────────────────────────────────────────────────────
  // REAL VEHICLE TRACKING & SEARCH ENGINE STATES
  // ─────────────────────────────────────────────────────────────
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [isVehicleSearchOpen, setIsVehicleSearchOpen] = useState(false);
  const [trackedVehicle, setTrackedVehicle] = useState(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [trackOnlyInTransit, setTrackOnlyInTransit] = useState(true);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierVehicle, setDossierVehicle] = useState(null);
  const [copiedBannerCoords, setCopiedBannerCoords] = useState(false);

  // Open Full AIS-140 Vehicle Dossier
  const openVehicleDossier = useCallback((veh) => {
    if (!veh) return;
    setDossierVehicle(veh);
    setIsDossierOpen(true);
  }, []);

  // Start tracking a real vehicle: zooms in, activates moving HUD, centers camera
  const startTrackingVehicle = useCallback((veh) => {
    if (!veh) return;
    setTrackedVehicle(veh);
    setDossierVehicle(veh);
    setIsTrackingActive(true);
    setSelectedVehicleId(veh.id);
    setSelectedEntity(veh);
    const lat = veh.location?.lat || veh.lat;
    const lng = veh.location?.lng || veh.lng;
    if (lat && lng) {
      jumpToLocation(lat, lng, 12);
    }
    setIsVehicleSearchOpen(false);
  }, [jumpToLocation]);

  const stopTrackingVehicle = useCallback(() => {
    setIsTrackingActive(false);
    setTrackedVehicle(null);
  }, []);

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
  const [isAiRouteOpen, setIsAiRouteOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [originHubId, setOriginHubId] = useState(urlOrigin || 'guwahati');
  const [destHubId, setDestHubId] = useState(urlDest || 'shillong');
  const [customOrigin, setCustomOrigin] = useState(null);
  const [customDest, setCustomDest] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(urlVehicle || 'AS-01-EV-4421');
  const [simulatedFuel, setSimulatedFuel] = useState(48);
  const [activeRouteView, setActiveRouteView] = useState('all'); // 'all' | 'both' | 'safest' | 'shortest' | 'bypass'
  const [routeResult, setRouteResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBlockageModalOpen, setIsBlockageModalOpen] = useState(false);
  const [selectedBlockageId, setSelectedBlockageId] = useState('blk-1');
  const [activeDetourApplied, setActiveDetourApplied] = useState(false);

  // Route from current origin / GPS position to this vehicle's exact coordinates
  const routeToVehicle = useCallback(async (veh) => {
    if (!veh) return;
    const vLat = Number(veh.lat ?? veh.location?.lat ?? 26.0445);
    const vLng = Number(veh.lng ?? veh.location?.lng ?? 91.8102);

    const destObj = {
      id: veh.id,
      name: `${veh.license_plate || veh.id} (${veh.name || 'Emergency Vehicle'})`,
      lat: vLat,
      lng: vLng,
      elevation_m: veh.altitude_m || 400,
      state: veh.state || 'Assam'
    };

    setCustomDest(destObj);
    setDestHubId('custom');
    setSelectedVehicleId(veh.id);

    let originObj;
    if (originHubId === 'current-gps' && deviceGPS) {
      originObj = {
        id: 'current-gps',
        name: 'My Current Device GPS',
        lat: deviceGPS.lat,
        lng: deviceGPS.lng,
        elevation_m: Math.round(deviceGPS.altitude_m || 80),
        state: 'Live GPS Unit'
      };
    } else if (customOrigin) {
      originObj = customOrigin;
    } else {
      originObj = NER_HUBS.find((h) => h.id === originHubId) || NER_HUBS[0];
    }

    setIsOptimizing(true);
    try {
      const result = await calculateRealHighwayRoute({
        origin: originObj,
        destination: destObj,
        vehicleId: veh.id,
        simulatedFuel: veh.current_fuel_litres || simulatedFuel,
        hazards: HAZARD_INCIDENTS
      });

      if (result) {
        setRouteResult(result);
        setIsAiRouteOpen(true);
        setActiveRouteView('all');
        jumpToLocation((originObj.lat + destObj.lat) / 2, (originObj.lng + destObj.lng) / 2, 9);
      }
    } catch (err) {
      console.error('Route to vehicle error:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [originHubId, customOrigin, simulatedFuel, deviceGPS, jumpToLocation]);

  // Route the vehicle's assigned transit mission (Origin Depot ➔ Destination Hub)
  const routeVehicleMission = useCallback(async (veh) => {
    if (!veh) return;
    const destStr = (veh.destination || '').toLowerCase();
    const cityStr = (veh.rto_city || '').toLowerCase();

    // Match destination hub
    let destObj = NER_HUBS.find((h) =>
      destStr.includes(h.name.toLowerCase()) ||
      destStr.includes(h.id.toLowerCase())
    ) || (destStr.includes('tawang') ? NER_HUBS.find(h => h.id === 'tawang') : null)
      || (destStr.includes('shillong') ? NER_HUBS.find(h => h.id === 'shillong') : null)
      || (destStr.includes('kohima') ? NER_HUBS.find(h => h.id === 'kohima') : null)
      || (destStr.includes('imphal') ? NER_HUBS.find(h => h.id === 'imphal') : null)
      || (destStr.includes('aizawl') ? NER_HUBS.find(h => h.id === 'aizawl') : null)
      || (destStr.includes('agartala') ? NER_HUBS.find(h => h.id === 'agartala') : null)
      || (destStr.includes('gangtok') ? NER_HUBS.find(h => h.id === 'gangtok') : null)
      || NER_HUBS[1];

    // Match origin hub
    let originObj = NER_HUBS.find((h) =>
      cityStr.includes(h.name.toLowerCase()) ||
      cityStr.includes(h.id.toLowerCase())
    ) || NER_HUBS[0];

    setOriginHubId(originObj.id);
    setCustomOrigin(null);
    setDestHubId(destObj.id);
    setCustomDest(null);
    setSelectedVehicleId(veh.id);

    setIsOptimizing(true);
    try {
      const result = await calculateRealHighwayRoute({
        origin: originObj,
        destination: destObj,
        vehicleId: veh.id,
        simulatedFuel: veh.current_fuel_litres || simulatedFuel,
        hazards: HAZARD_INCIDENTS
      });

      if (result) {
        setRouteResult(result);
        setIsAiRouteOpen(true);
        setActiveRouteView('all');
        jumpToLocation((originObj.lat + destObj.lat) / 2, (originObj.lng + destObj.lng) / 2, 9);
      }
    } catch (err) {
      console.error('Vehicle mission route error:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [simulatedFuel, jumpToLocation]);

  // Expose global helper for seamless map engine switching, vehicle tracking, and routing
  useEffect(() => {
    window.__nerSwitchOffline = () => setMapEngine('offline');
    window.__nerSwitchGoogle = () => setMapEngine('google');
    window.__nerTrackVehicle = (vehicleIdentifier) => {
      if (!vehicleIdentifier) return;
      const cleanTarget = vehicleIdentifier.replace(/[\s-]/g, '').toUpperCase();
      const match = fleet.find(
        (v) =>
          v.id === vehicleIdentifier ||
          (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanTarget)
      );
      if (match) {
        startTrackingVehicle(match);
      }
    };
    window.__nerOpenVehicleDossier = (vehicleIdentifier) => {
      if (!vehicleIdentifier) return;
      const cleanTarget = vehicleIdentifier.replace(/[\s-]/g, '').toUpperCase();
      const match = fleet.find(
        (v) =>
          v.id === vehicleIdentifier ||
          (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanTarget)
      );
      if (match) {
        openVehicleDossier(match);
      }
    };
    window.__nerSetDest = (point) => {
      if (!point) return;
      const cleanId = String(point.id || '').replace(/[\s-]/g, '').toUpperCase();
      const cleanName = String(point.name || '').replace(/[\s-]/g, '').toUpperCase();
      const matched = fleet.find(
        (v) =>
          v.id === point.id ||
          (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanId) ||
          (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanName)
      );
      if (matched) {
        routeToVehicle(matched);
      } else {
        const customPoint = {
          id: point.id || 'custom-loc',
          name: point.name || 'Selected Location',
          lat: Number(point.lat ?? point.latitude),
          lng: Number(point.lng ?? point.longitude),
          state: point.state || 'Assam'
        };
        setCustomDest(customPoint);
        setDestHubId('custom');
        const originObj = NER_HUBS.find((h) => h.id === originHubId) || NER_HUBS[0];
        calculateRealHighwayRoute({
          origin: originObj,
          destination: customPoint,
          vehicleId: selectedVehicleId,
          simulatedFuel,
          hazards: HAZARD_INCIDENTS
        }).then((res) => {
          if (res) {
            setRouteResult(res);
            setIsAiRouteOpen(true);
            setActiveRouteView('all');
            jumpToLocation((originObj.lat + customPoint.lat) / 2, (originObj.lng + customPoint.lng) / 2, 9);
          }
        });
      }
    };
    window.__nerRouteToVehicle = (vehicleIdentifier) => {
      if (!vehicleIdentifier) return;
      const cleanTarget = vehicleIdentifier.replace(/[\s-]/g, '').toUpperCase();
      const match = fleet.find(
        (v) =>
          v.id === vehicleIdentifier ||
          (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanTarget)
      );
      if (match) {
        routeToVehicle(match);
      }
    };
    return () => {
      delete window.__nerSwitchOffline;
      delete window.__nerSwitchGoogle;
      delete window.__nerTrackVehicle;
      delete window.__nerOpenVehicleDossier;
      delete window.__nerSetDest;
      delete window.__nerRouteToVehicle;
    };
  }, [fleet, startTrackingVehicle, openVehicleDossier, routeToVehicle, originHubId, selectedVehicleId, simulatedFuel]);

  // Keep trackedVehicle & dossierVehicle updated with latest live telemetry position & speed
  useEffect(() => {
    if (isTrackingActive && trackedVehicle) {
      const liveVeh = fleet.find((v) => v.id === trackedVehicle.id);
      if (liveVeh) {
        setTrackedVehicle(liveVeh);
      }
    }
    if (isDossierOpen && dossierVehicle) {
      const liveVeh = fleet.find((v) => v.id === dossierVehicle.id || v.license_plate === dossierVehicle.license_plate);
      if (liveVeh) {
        setDossierVehicle((prev) => ({ ...prev, ...liveVeh }));
      }
    }
  }, [fleet, isTrackingActive, trackedVehicle?.id, isDossierOpen, dossierVehicle?.id]);

  // Search results for real vehicle tracker
  const searchResults = useMemo(() => {
    const q = vehicleSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/[\s-]/g, '');

    return fleet.filter((v) => {
      const isInTransit = v.is_in_transit || v.status === 'En Route' || v.status === 'In Transit';
      if (trackOnlyInTransit && !isInTransit) return false;
      if (!q) return true;

      const cleanPlate = (v.license_plate || '').toLowerCase().replace(/[\s-]/g, '');
      return (
        v.name?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q) ||
        cleanPlate.includes(cleanQ) ||
        v.vehicle_type?.toLowerCase().includes(q) ||
        v.assigned_driver?.toLowerCase().includes(q) ||
        v.current_road?.toLowerCase().includes(q) ||
        v.destination?.toLowerCase().includes(q) ||
        v.state?.toLowerCase().includes(q) ||
        v.cargo_manifest?.toLowerCase().includes(q)
      );
    });
  }, [fleet, vehicleSearchQuery, trackOnlyInTransit]);

  // Matched Regional Hubs / Cities for map search
  const matchedHubs = useMemo(() => {
    const q = vehicleSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return NER_HUBS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q)
    );
  }, [vehicleSearchQuery]);

  const handleExecuteVehicleSearch = (e) => {
    if (e) e.preventDefault();
    if (!vehicleSearchQuery.trim()) return;

    if (searchResults.length > 0) {
      startTrackingVehicle(searchResults[0]);
      return;
    }

    if (matchedHubs.length > 0) {
      const hub = matchedHubs[0];
      jumpToLocation(hub.lat, hub.lng, 12);
      setSelectedEntity(hub);
      setIsVehicleSearchOpen(false);
      return;
    }

    const cleanQ = vehicleSearchQuery.replace(/[\s-]/g, '').toUpperCase();
    const match = fleet.find(
      (v) =>
        v.id.toUpperCase().includes(cleanQ) ||
        (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase().includes(cleanQ))
    );
    if (match) {
      startTrackingVehicle(match);
      return;
    }

    const q = vehicleSearchQuery.trim().toLowerCase();
    const hubMatch = NER_HUBS.find(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q)
    );
    if (hubMatch) {
      jumpToLocation(hubMatch.lat, hubMatch.lng, 12);
      setSelectedEntity(hubMatch);
      setIsVehicleSearchOpen(false);
    }
  };

  // Sync URL search params whenever they change
  useEffect(() => {
    if (urlOrigin) {
      setOriginHubId(urlOrigin);
      setCustomOrigin(null);
    }
    if (urlDest) {
      setDestHubId(urlDest);
      setCustomDest(null);
    }
    if (urlVehicle) {
      setSelectedVehicleId(urlVehicle);
    }
  }, [urlOrigin, urlDest, urlVehicle]);

  // Load fleet vehicles on mount and handle ?track=true URL param
  useEffect(() => {
    async function initFleet() {
      const data = await fetchVehicles();
      if (data && data.length > 0) {
        setFleet(data);
        if (urlVehicle) {
          const cleanUrl = urlVehicle.replace(/[\s-]/g, '').toUpperCase();
          const matched = data.find(
            (v) =>
              v.id === urlVehicle ||
              (v.license_plate && v.license_plate.replace(/[\s-]/g, '').toUpperCase() === cleanUrl)
          );
          if (matched) {
            setSelectedVehicleId(matched.id);
            setSimulatedFuel(matched.current_fuel_litres);
            if (searchParams.get('track') === 'true') {
              startTrackingVehicle(matched);
            }
          }
        }
      }
    }
    initFleet();
  }, [urlVehicle, searchParams, startTrackingVehicle]);

  // When selected vehicle changes, sync fuel level
  useEffect(() => {
    const currentVeh = fleet.find((v) => v.id === selectedVehicleId);
    if (currentVeh) {
      setSimulatedFuel(currentVeh.current_fuel_litres);
    }
  }, [selectedVehicleId, fleet]);

  // ─────────────────────────────────────────────────────────────
  // GOVERNMENT AIS-140 REAL-TIME TELEMETRY STREAM INTEGRATION
  // ─────────────────────────────────────────────────────────────
  const [streamStatus, setStreamStatus] = useState('CONNECTING');
  const [telemetryStats, setTelemetryStats] = useState({
    packetsReceived: 0,
    lastHeartbeat: null,
    latencyMs: 12,
    activeFleetCount: 21,
    streamProtocol: 'AIS-140-MoRTH-v2.1'
  });
  const [autoFollowCam, setAutoFollowCam] = useState(false);
  const [isOfficerBroadcasting, setIsOfficerBroadcasting] = useState(false);
  const [officerTelemetry, setOfficerTelemetry] = useState(null);

  const trackedVehicleRef = useRef(trackedVehicle);
  useEffect(() => {
    trackedVehicleRef.current = trackedVehicle;
  }, [trackedVehicle]);

  const autoFollowCamRef = useRef(autoFollowCam);
  useEffect(() => {
    autoFollowCamRef.current = autoFollowCam;
  }, [autoFollowCam]);

  const centerRef = useRef(center);
  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Subscribe to live WebSocket / SSE AIS-140 telemetry stream (single mount setup)
  useEffect(() => {
    const unsubStatus = realtimeTrackingService.subscribeStatus((status, stats) => {
      setStreamStatus(status);
      if (stats) setTelemetryStats((prev) => ({ ...prev, ...stats }));
    });

    const unsubStream = realtimeTrackingService.subscribe((incomingVehicles, stats) => {
      if (stats) setTelemetryStats((prev) => ({ ...prev, ...stats }));

      setFleet((prevFleet) => {
        const vehicleMap = new Map();
        prevFleet.forEach((v) => vehicleMap.set(v.id, v));

        incomingVehicles.forEach((inVeh) => {
          const key = inVeh.vehicle_number || inVeh.license_plate || inVeh.id;
          const existing = vehicleMap.get(key) || prevFleet.find((v) => v.license_plate === inVeh.license_plate);
          if (existing) {
            vehicleMap.set(existing.id, {
              ...existing,
              ...inVeh,
              id: existing.id,
              lat: inVeh.lat,
              lng: inVeh.lng,
              speed_kmh: inVeh.speed_kmh,
              altitude_m: inVeh.altitude_m,
              heading_deg: inVeh.heading_deg,
              satellites_locked: inVeh.satellites_locked || 14,
              gnss_fix: inVeh.gnss_fix || '3D DGPS Fix (NavIC+GPS)',
              last_ping: inVeh.timestamp || new Date().toISOString()
            });
          }
        });

        return Array.from(vehicleMap.values());
      });

      // Update tracked vehicle live coordinates and follow camera
      const currentTracked = trackedVehicleRef.current;
      if (currentTracked) {
        const updated = incomingVehicles.find(
          (v) =>
            v.vehicle_number === currentTracked.vehicle_number ||
            v.license_plate === currentTracked.license_plate ||
            v.id === currentTracked.id
        );
        if (updated) {
          setTrackedVehicle((prev) => ({ ...prev, ...updated }));
          if (autoFollowCamRef.current && updated.lat && updated.lng) {
            const curC = centerRef.current;
            const dist = Math.hypot((curC?.lat || 0) - updated.lat, (curC?.lng || 0) - updated.lng);
            if (dist > 0.001) {
              jumpToLocation(updated.lat, updated.lng, zoomRef.current);
            }
          }
        }
      }
    });

    return () => {
      unsubStatus();
      unsubStream();
    };
  }, [jumpToLocation]);

  // Compute live breadcrumbs trail for tracked vehicle
  const trackedBreadcrumbs = useMemo(() => {
    if (!trackedVehicle) return [];
    return realtimeTrackingService.getBreadcrumbs(trackedVehicle.license_plate || trackedVehicle.id);
  }, [trackedVehicle, telemetryStats.packetsReceived]);

  const handleToggleOfficerBroadcast = () => {
    if (isOfficerBroadcasting) {
      realtimeTrackingService.stopOfficerGPSBroadcast();
      setIsOfficerBroadcasting(false);
      setOfficerTelemetry(null);
    } else {
      try {
        realtimeTrackingService.startOfficerGPSBroadcast('Officer Tactical Response Unit (Gov)', (pos) => {
          setOfficerTelemetry(pos);
          setIsOfficerBroadcasting(true);
          setFleet((prev) => {
            const idx = prev.findIndex((v) => v.id === 'OFFICER-GOV-UNIT-01');
            const unitObj = {
              id: 'OFFICER-GOV-UNIT-01',
              name: 'Field Officer Emergency Unit',
              license_plate: 'GOV-PATROL-01',
              vehicle_type: 'On-Duty Emergency Responder Unit',
              lat: pos.lat,
              lng: pos.lng,
              speed_kmh: pos.speed_kmh,
              altitude_m: pos.altitude_m,
              status: 'Active Patrol',
              is_in_transit: true,
              assigned_driver: 'Government Officer',
              current_road: 'Field Area Sector'
            };
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = unitObj;
              return updated;
            }
            return [unitObj, ...prev];
          });
        });
      } catch (err) {
        alert('Could not access device GPS: ' + err.message);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MANUAL ROUTE CALCULATION (Explicit user request ONLY)
  // ─────────────────────────────────────────────────────────────
  const handleCalculateRoute = useCallback(async () => {
    setIsOptimizing(true);
    try {
      let originObj;
      if (originHubId === 'current-gps' && deviceGPS) {
        originObj = {
          id: 'current-gps',
          name: 'My Current Device GPS',
          lat: deviceGPS.lat,
          lng: deviceGPS.lng,
          elevation_m: Math.round(deviceGPS.altitude_m || 80),
          state: 'Live GPS Unit'
        };
      } else if (originHubId === 'custom' && customOrigin) {
        originObj = customOrigin;
      } else {
        originObj = NER_HUBS.find((h) => h.id === originHubId) || NER_HUBS[0];
      }

      let destObj;
      if (destHubId === 'custom' && customDest) {
        destObj = customDest;
      } else {
        destObj = NER_HUBS.find((h) => h.id === destHubId) || NER_HUBS[1];
      }

      const result = await calculateRealHighwayRoute({
        origin: originObj,
        destination: destObj,
        vehicleId: selectedVehicleId,
        simulatedFuel,
        hazards: HAZARD_INCIDENTS
      });

      if (result) {
        setRouteResult(result);
        setIsAiRouteOpen(true);
        setActiveRouteView('all');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [originHubId, destHubId, customOrigin, customDest, selectedVehicleId, simulatedFuel, deviceGPS]);

  const handleApplyAlternateRoute = useCallback((altRoute, blockage) => {
    setActiveDetourApplied(true);
    setActiveRouteView('bypass');
    setIsAiRouteOpen(true);
    if (routeResult) {
      setRouteResult((prev) => ({
        ...prev,
        bypass_route: altRoute,
        safest_route: altRoute,
        ai_recommendation: {
          ...prev.ai_recommendation,
          headline: `AI DETOUR ACTIVE: DIVERSION VIA ${blockage?.diversion_corridor || 'VALLEY BYPASS'}`,
          rationale: `Primary corridor is closed due to ${blockage?.reason || 'active blockage'}. Convoy has been successfully rerouted onto the fortified valley bypass, avoiding 6-hour roadblock.`
        }
      }));
    } else {
      setRouteResult({
        origin: NER_HUBS.find((h) => h.id === originHubId) || NER_HUBS[0],
        destination: NER_HUBS.find((h) => h.id === destHubId) || NER_HUBS[1],
        vehicle_telemetry: fleet.find((v) => v.id === selectedVehicleId) || fleet[0],
        safest_route: altRoute,
        shortest_route: altRoute,
        bypass_route: altRoute,
        routes: [altRoute],
        is_real_google_route: true,
        provider: 'NER-LIFELINE AI Alternate Detour Engine',
        ai_recommendation: {
          recommended_route_code: altRoute.route_code || 'Strategic Valley Bypass',
          safest_road: altRoute.route_code || 'Strategic Valley Bypass',
          headline: `AI DETOUR ACTIVE: DIVERSION VIA ${altRoute.route_code || blockage?.diversion_corridor || 'VALLEY BYPASS'}`,
          rationale: `Primary corridor is closed due to ${blockage?.reason || 'active blockage'}. Convoy has been successfully rerouted onto ${altRoute.route_code || 'the fortified valley bypass'}, avoiding 6-hour roadblock.`
        }
      });
    }
    if (altRoute?.coordinates?.[0]) {
      setCenter({ lat: altRoute.coordinates[0][0], lng: altRoute.coordinates[0][1] });
      setZoom(8);
    }
  }, [routeResult, originHubId, destHubId, fleet, selectedVehicleId]);

  // If autoRoute query parameter was explicitly set in URL on first mount, run once
  const initialAutoRouteTriggered = useRef(false);
  useEffect(() => {
    if (urlAutoRoute && !initialAutoRouteTriggered.current) {
      initialAutoRouteTriggered.current = true;
      handleCalculateRoute();
    }
  }, [urlAutoRoute, handleCalculateRoute]);

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

  const lastMouseCoordTimeRef = useRef(0);
  const dragRafRef = useRef(null);

  const handleMouseMove = (e) => {
    // 1. Throttle mouse coordinates calculation to at most once per 250ms to prevent component thrashing
    const now = performance.now();
    if (now - lastMouseCoordTimeRef.current > 250) {
      lastMouseCoordTimeRef.current = now;
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
    }

    // 2. High-performance requestAnimationFrame for dragging (smooth 60 FPS)
    if (!isDragging) return;

    if (dragRafRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;

      const startPixelX = lonToPixelX(dragStartRef.current.centerLng, zoom);
      const startPixelY = latToPixelY(dragStartRef.current.centerLat, zoom);

      setCenter({
        lat: +pixelToLat(startPixelY - dy, zoom).toFixed(5),
        lng: +pixelToLon(startPixelX - dx, zoom).toFixed(5)
      });
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
  };

  // Zoom control
  const handleZoom = (delta) => {
    setZoom((prev) => Math.max(4, Math.min(14, prev + delta)));
  };

  // Compute active tiles visible in the viewport with useMemo
  const visibleTiles = useMemo(() => {
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

    const tiles = [];
    const maxTileIndex = Math.pow(2, zoom) - 1;

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        if (y >= 0 && y <= maxTileIndex) {
          const wrappedX = ((x % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
          const tileLeft = x * 256 - minPixelX;
          const tileTop = y * 256 - minPixelY;

          tiles.push({
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
    return tiles;
  }, [center.lng, center.lat, zoom, dimensions.width, dimensions.height, basemap]);

  // Convert GPS Coordinates to Screen Pixels
  const coordToScreen = useCallback((lat, lng) => {
    const centerPixelX = lonToPixelX(center.lng, zoom);
    const centerPixelY = latToPixelY(center.lat, zoom);
    const minPixelX = centerPixelX - dimensions.width / 2;
    const minPixelY = centerPixelY - dimensions.height / 2;
    const px = lonToPixelX(lng, zoom);
    const py = latToPixelY(lat, zoom);
    return {
      x: px - minPixelX,
      y: py - minPixelY
    };
  }, [center.lng, center.lat, zoom, dimensions.width, dimensions.height]);

  // Convert Route Coordinates to SVG Path
  const getSvgPathFromCoords = useCallback((coords) => {
    if (!coords || coords.length === 0) return '';
    return coords
      .map(([lat, lng], idx) => {
        const pt = coordToScreen(lat, lng);
        return `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(' ');
  }, [coordToScreen]);

  const shortestSvgPath = useMemo(() => {
    if (!routeResult?.shortest_route?.coordinates) return '';
    return getSvgPathFromCoords(routeResult.shortest_route.coordinates);
  }, [routeResult, center, zoom, dimensions]);

  const safestSvgPath = useMemo(() => {
    if (!routeResult?.safest_route?.coordinates) return '';
    return getSvgPathFromCoords(routeResult.safest_route.coordinates);
  }, [routeResult, center, zoom, dimensions]);

  const bypassSvgPath = useMemo(() => {
    if (!routeResult?.bypass_route?.coordinates) return '';
    return getSvgPathFromCoords(routeResult.bypass_route.coordinates);
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
    if (activeRouteView === 'bypass') return routeResult.bypass_route?.localities || [];
    const safest = routeResult.safest_route?.localities || [];
    const shortest = routeResult.shortest_route?.localities || [];
    const bypass = routeResult.bypass_route?.localities || [];
    const all = [...safest];
    for (const loc of [...shortest, ...bypass]) {
      if (!all.some((sf) => sf.name === loc.name)) {
        all.push(loc);
      }
    }
    return all;
  }, [routeResult, activeRouteView]);

  const currentVehicleObj = fleet.find((v) => v.id === selectedVehicleId) || fleet[0];
  const maxFuelCap = currentVehicleObj ? currentVehicleObj.fuel_capacity_litres : 100;
  const currentFuelPct = +((simulatedFuel / maxFuelCap) * 100).toFixed(1);

  return (
    <div className={`space-y-4 transition-all duration-300 ${isZenMode ? 'p-2 max-w-full' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* Real-time Map Dashboard Header (Hidden in Zen Mode) */}
      {!isZenMode && (
        <>
          <div className="bg-slate-800/95 border border-slate-700/90 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
            {/* Official Indian Sovereign Ribbon */}
            <div className="h-1 bg-gradient-to-r from-amber-500 via-white to-emerald-500 rounded-full w-full shadow-sm" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/30">
                    <Shield size={13} className="text-amber-400" />
                    <span>GOVT. OF INDIA • NDMA • MoRTH AIS-140 COMPLIANT GRID</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Satellite size={12} className="text-cyan-400 animate-spin-slow" />
                    <span>NavIC (IRNSS) + GPS Dual-Band Satellite Ground Stream</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Radio size={12} className="text-emerald-400 animate-pulse" />
                    <span>Zero Leaflet • Sovereign Bharat GIS</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>National Emergency Logistics & Real-Time Fleet Telemetry</span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    AIS-140 CERTIFIED
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Continuous high-precision vehicle tracking across all 8 North Eastern states with sub-second heartbeats, live breadcrumbs trails, and AI terrain risk calculations.
                </p>
              </div>

              {/* Top Control Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Zen Focus Mode Toggle */}
                <button
                  onClick={() => setIsZenMode(!isZenMode)}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md bg-slate-900/90 text-amber-300 hover:text-white hover:bg-slate-800 border border-slate-700"
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

            {/* 🛰️ REAL-TIME TELEMETRY STREAM STATUS RIBBON */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Live Stream Indicator */}
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      streamStatus.isLive ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      streamStatus.isLive ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  </span>
                  <span className="font-extrabold text-white tracking-wide">
                    AIS-140 STREAM:
                  </span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    streamStatus.isLive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {streamStatus.type === 'websocket' ? 'LIVE (WEBSOCKET 1.5s)' : 'FALLBACK (SSE STREAM)'}
                  </span>
                </div>

                {/* Packet Counter */}
                <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[11px]">
                  <Activity size={13} className="text-cyan-400" />
                  <span>Telemetry Packets:</span>
                  <span className="text-cyan-300 font-bold">{telemetryStats.packetsReceived.toLocaleString()}</span>
                </div>

                {/* Latency */}
                <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[11px]">
                  <Clock size={13} className="text-emerald-400" />
                  <span>Heartbeat:</span>
                  <span className="text-emerald-400 font-bold">
                    {streamStatus.latencyMs ? `${streamStatus.latencyMs}ms` : '< 16ms'}
                  </span>
                </div>

                {/* NavIC Satellite Lock */}
                <div className="hidden sm:flex items-center space-x-1.5 text-slate-300 text-[11px]">
                  <Satellite size={13} className="text-amber-400" />
                  <span>NavIC Fix:</span>
                  <span className="text-amber-300 font-mono font-bold">14 Sats Dual-Band</span>
                </div>
              </div>

              {/* Real-Time Action Toggles */}
              <div className="flex items-center space-x-2 ml-auto">
                {/* Auto Follow Cam */}
                <button
                  onClick={() => setAutoFollowCam(!autoFollowCam)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer transition-all border ${
                    autoFollowCam
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Auto-follow vehicle on map as it moves"
                >
                  <Navigation size={12} className={autoFollowCam ? 'text-blue-400 animate-pulse' : ''} />
                  <span>Auto-Follow Cam: {autoFollowCam ? 'ON' : 'OFF'}</span>
                </button>

                {/* Officer Live GPS Broadcast Toggle */}
                <button
                  onClick={handleToggleOfficerBroadcast}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer transition-all border ${
                    isOfficerBroadcasting
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md animate-pulse'
                      : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-600/60'
                  }`}
                  title="Broadcast this device's real GPS into the Government Fleet Grid"
                >
                  <LocateFixed size={12} />
                  <span>{isOfficerBroadcasting ? 'Broadcasting Device GPS' : 'Broadcast Field GPS'}</span>
                </button>
              </div>
            </div>
          </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REAL VEHICLE NUMBERS IN-TRANSIT SEARCH & TRACKING COMMAND BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 sm:p-4 shadow-2xl relative z-40 backdrop-blur-md space-y-3">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
              <Truck size={18} className={isTrackingActive ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                  REAL VEHICLE DATABASE & IN-TRANSIT TRACKER
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{fleet.filter((v) => v.is_in_transit || v.status === 'En Route').length} IN TRANSIT</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  • 8 NER States Registered
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Search authentic RTO registration plates (AS, ML, AR, TR, MN, NL, MZ, SK), driver contacts, cargo or corridors to track live moving vehicles.
              </p>
            </div>
          </div>

          {/* Quick Filter Toggle: In-Transit Only */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTrackOnlyInTransit(!trackOnlyInTransit)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                trackOnlyInTransit
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Activity size={13} className={trackOnlyInTransit ? 'animate-pulse' : ''} />
              <span>In-Transit Only</span>
            </button>
          </div>
        </div>

        {/* Search Input + Action Button Bar */}
        <form onSubmit={handleExecuteVehicleSearch} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 relative">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search real vehicle number (e.g. AS-01-EV-4421, ML-05, AR-03, SK-01, Tenzing Norbu, NH-13)..."
              value={vehicleSearchQuery}
              onChange={(e) => {
                setVehicleSearchQuery(e.target.value);
                setIsVehicleSearchOpen(true);
              }}
              onFocus={() => setIsVehicleSearchOpen(true)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {vehicleSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setVehicleSearchQuery('');
                  setIsVehicleSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}

            {/* Live Autocomplete Dropdown */}
            {isVehicleSearchOpen && (searchResults.length > 0 || matchedHubs.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-slate-800/80 p-1 backdrop-blur-xl">
                {matchedHubs.length > 0 && (
                  <div className="p-1 space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                      <span>Regional Hubs & Outposts ({matchedHubs.length})</span>
                      <span className="text-slate-400">Click to center map</span>
                    </div>
                    {matchedHubs.map((hub) => (
                      <div
                        key={hub.id}
                        onClick={() => {
                          jumpToLocation(hub.lat, hub.lng, 12);
                          setSelectedEntity(hub);
                          setIsVehicleSearchOpen(false);
                        }}
                        className="p-2 hover:bg-slate-900 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">📍</span>
                          <div>
                            <div className="text-xs font-bold text-white">{hub.name}</div>
                            <div className="text-[10px] text-slate-400">{hub.state} • Elev: {hub.elevation_m}m</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800">
                          Jump ➔
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Matching Registered Vehicles ({searchResults.length})</span>
                    <span className="text-emerald-400">Click card to Track on Map</span>
                  </div>
                )}
                {searchResults.map((veh) => {
                  const isInTransit = veh.is_in_transit || veh.status === 'En Route' || veh.status === 'In Transit';
                  return (
                    <div
                      key={veh.id}
                      onClick={() => startTrackingVehicle(veh)}
                      className="p-2.5 hover:bg-slate-900/90 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-blue-300 px-2 py-0.5 bg-blue-500/15 rounded border border-blue-500/30 group-hover:border-emerald-500/60 group-hover:text-emerald-300 transition-colors">
                            {veh.license_plate || veh.id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {veh.state || 'North East'}
                          </span>
                          {isInTransit && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              <span>IN TRANSIT • {veh.speed_kmh || 38} km/h</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {veh.name || veh.vehicle_type}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 flex-wrap">
                          {veh.current_road && (
                            <span className="text-amber-300 flex items-center space-x-1">
                              <Compass size={11} />
                              <span>{veh.current_road}</span>
                            </span>
                          )}
                          {veh.destination && (
                            <span className="text-blue-300 flex items-center space-x-1">
                              <Navigation size={11} />
                              <span>➔ {veh.destination}</span>
                            </span>
                          )}
                          <span className="text-slate-400">Driver: {veh.assigned_driver || veh.driver_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVehicleDossier(veh);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl shadow border border-slate-700 flex items-center space-x-1 transition-all cursor-pointer"
                          title="View Full Vehicle Dossier & Exact Location"
                        >
                          <span>📋 Info</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTrackingVehicle(veh);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1 transition-all cursor-pointer"
                        >
                          <Crosshair size={12} className="animate-spin-slow" />
                          <span>Track</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Track Vehicle Button */}
          <button
            type="submit"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer flex-shrink-0 border border-emerald-400/30"
          >
            <Crosshair size={15} className="animate-spin-slow text-white" />
            <span>Track Vehicle</span>
          </button>
        </form>

        {/* Fast-Select Authentic Real Vehicle Plates (1-Click Quick Tracking Pills) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1 flex-shrink-0">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span>Live Plates:</span>
          </span>
          {[
            { plate: 'AS-01-EV-4421', name: 'Highland Ambulance', state: 'Assam / Arunachal' },
            { plate: 'ML-05-TR-9011', name: 'Heavy Convoy 6x6', state: 'Meghalaya' },
            { plate: 'AR-03-AM-2022', name: 'Sela Patrol SUV', state: 'Arunachal' },
            { plate: 'SK-01-RL-5504', name: 'Vaccine Cruiser EV', state: 'Sikkim' },
            { plate: 'TR-01-EM-8840', name: 'Oxygen Express', state: 'Tripura' },
            { plate: 'MN-02-HV-3108', name: 'Naga Hill Cargo', state: 'Manipur' },
            { plate: 'NL-07-CD-3310', name: 'Highland Logistics', state: 'Nagaland' },
            { plate: 'MZ-01-GH-6622', name: 'Phawngpui 4x4', state: 'Mizoram' }
          ].map((item) => (
            <button
              key={item.plate}
              onClick={() => {
                const found = fleet.find(
                  (v) =>
                    v.license_plate === item.plate ||
                    v.id === item.plate ||
                    (v.license_plate && v.license_plate.replace(/[\s-]/g, '') === item.plate.replace(/[\s-]/g, ''))
                );
                if (found) {
                  startTrackingVehicle(found);
                } else {
                  setVehicleSearchQuery(item.plate);
                  setIsVehicleSearchOpen(true);
                }
              }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border flex items-center space-x-1.5 shadow-sm ${
                trackedVehicle?.license_plate === item.plate
                  ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{item.plate}</span>
              <span className="text-[9px] font-sans text-slate-400">({item.name})</span>
            </button>
          ))}
        </div>

        {/* 🎯 AIS-140 REAL-TIME TELEMETRY INSTRUMENT CLUSTER HUD */}
        {isTrackingActive && trackedVehicle && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-3 animate-in fade-in">
            {/* Top Identity Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex-shrink-0">
                  <Truck size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-mono font-black text-emerald-300 text-base sm:text-lg tracking-wider">
                      {trackedVehicle.license_plate || trackedVehicle.id}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {trackedVehicle.name || trackedVehicle.vehicle_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-slate-950 uppercase tracking-widest flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      <span>AIS-140 LIVE TRACKING</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      {trackedVehicle.vehicle_type || 'Disaster Relief Heavy Carrier'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center space-x-2 flex-wrap mt-1">
                    {trackedVehicle.current_road && (
                      <span className="text-amber-300 font-semibold">
                        📍 {trackedVehicle.current_road}
                      </span>
                    )}
                    {trackedVehicle.destination && (
                      <span className="text-cyan-300 font-semibold">
                        ➔ En Route to {trackedVehicle.destination}
                      </span>
                    )}
                    <span className="font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center space-x-1.5">
                      <span>Exact GPS:</span>
                      <strong className="text-white">
                        {(trackedVehicle.location?.lat || trackedVehicle.lat)?.toFixed(6)}°N, {(trackedVehicle.location?.lng || trackedVehicle.lng)?.toFixed(6)}°E
                      </strong>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const t = `${(trackedVehicle.location?.lat || trackedVehicle.lat)?.toFixed(6)}, ${(trackedVehicle.location?.lng || trackedVehicle.lng)?.toFixed(6)}`;
                          navigator.clipboard?.writeText(t);
                          setCopiedBannerCoords(true);
                          setTimeout(() => setCopiedBannerCoords(false), 2000);
                        }}
                        className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Copy exact GPS coordinates"
                      >
                        {copiedBannerCoords ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </span>
                    <span className="text-blue-300 font-mono text-[11px] bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30">
                      ↑ {trackedVehicle.altitude_m || 420}m ASL
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-auto flex-wrap gap-y-1">
                <button
                  type="button"
                  onClick={() => routeToVehicle(trackedVehicle)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-blue-400/60 flex items-center space-x-1.5 cursor-pointer transition-all"
                  title="Calculate and display real surveyed highway route to this vehicle"
                >
                  <Navigation size={13} />
                  <span>📍 Route to Vehicle</span>
                </button>
                <button
                  type="button"
                  onClick={() => routeVehicleMission(trackedVehicle)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white font-bold text-xs rounded-xl shadow border border-blue-500/30 flex items-center space-x-1.5 cursor-pointer transition-all"
                  title="Calculate vehicle's assigned dispatch mission corridor"
                >
                  <span>🛣️ Mission Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => openVehicleDossier(trackedVehicle)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-emerald-400/60 flex items-center space-x-1.5 cursor-pointer transition-all"
                  title="Inspect full vehicle dossier & exact location"
                >
                  <span>📋 Full Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutoFollowCam(!autoFollowCam)}
                  className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 cursor-pointer transition-all border ${
                    autoFollowCam
                      ? 'bg-blue-600 text-white border-blue-400 shadow-blue-900/50'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title="Lock camera to follow moving vehicle"
                >
                  <Navigation size={13} className={autoFollowCam ? 'animate-pulse' : ''} />
                  <span>Follow Cam: {autoFollowCam ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lat = trackedVehicle.location?.lat || trackedVehicle.lat;
                    const lng = trackedVehicle.location?.lng || trackedVehicle.lng;
                    if (lat && lng) jumpToLocation(lat, lng, 12);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all"
                >
                  <Crosshair size={13} className="text-emerald-400" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={stopTrackingVehicle}
                  className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold text-xs rounded-xl shadow flex items-center space-x-1 cursor-pointer transition-all"
                >
                  <X size={13} />
                  <span>Stop Tracking</span>
                </button>
              </div>
            </div>

            {/* AIS-140 Live Telemetry Grid Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {/* Gauge 1: Speedometer */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Gauge size={12} className="text-emerald-400" />
                    <span>Speed</span>
                  </span>
                  <span className="text-emerald-400 font-mono">LIVE</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">
                    {trackedVehicle.speed_kmh || 42}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">km/h</span>
                </div>
                {/* Visual speed bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((trackedVehicle.speed_kmh || 42) / 80) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Gauge 2: Barometric Altitude & Gradient */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Activity size={12} className="text-blue-400" />
                    <span>Altitude</span>
                  </span>
                  <span className="text-blue-400 font-mono text-[9px]">ASL</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">
                    {trackedVehicle.altitude_m || 1420}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">m</span>
                </div>
                <div className="text-[10px] text-blue-300 font-semibold mt-1">
                  Grade: {trackedVehicle.incline_deg || 4.2}° Incline
                </div>
              </div>

              {/* Gauge 3: NavIC Satellite Fix */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Satellite size={12} className="text-cyan-400" />
                    <span>NavIC Fix</span>
                  </span>
                  <span className="text-cyan-400 font-mono text-[9px]">3D DGPS</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                    {trackedVehicle.satellites_navic || trackedVehicle.satellites_locked || 14}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Sats</span>
                </div>
                <div className="text-[10px] text-cyan-400 font-semibold mt-1 truncate">
                  L5/S-Band Dual Lock
                </div>
              </div>

              {/* Gauge 4: Battery & Ignition Sense */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Zap size={12} className="text-amber-400" />
                    <span>Power</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[9px]">IGN ON</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                    {trackedVehicle.battery_volts || 13.8}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">V DC</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                  Alternator Healthy
                </div>
              </div>

              {/* Gauge 5: LoRa Mesh & Emergency Packet Status */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Signal size={12} className="text-purple-400" />
                    <span>LoRa Mesh</span>
                  </span>
                  <span className="text-purple-400 font-mono text-[9px]">865 MHz</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">
                    {trackedVehicle.mesh_rssi_dbm || -78}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">dBm</span>
                </div>
                <div className="text-[10px] text-purple-300 font-semibold mt-1 truncate">
                  ESP32 Relay OK
                </div>
              </div>

              {/* Gauge 6: Breadcrumb Trail & Panic State */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className="flex items-center space-x-1">
                    <Shield size={12} className="text-emerald-400" />
                    <span>SOS Status</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[9px]">EM-1</span>
                </div>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-sm font-black text-emerald-400 uppercase">
                    NORMAL
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono mt-1">
                  Trail: <strong className="text-emerald-400">{trackedBreadcrumbs.length}</strong> points
                </div>
              </div>
            </div>

            {/* Driver & Cargo Manifest Banner */}
            {trackedVehicle.cargo_manifest && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-amber-400 font-bold">📦 Manifest:</span>
                  <span className="text-slate-200">{trackedVehicle.cargo_manifest}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-400 font-bold">👨‍✈️ Driver:</span>
                  <span className="text-slate-200">
                    {trackedVehicle.assigned_driver || trackedVehicle.driver_name || 'Govt Relay Pilot'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                  <a
                    href={`tel:${trackedVehicle.driver_phone || '+919435199201'}`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/50 font-bold text-[11px] transition-all flex items-center space-x-1"
                  >
                    <span>📞 Quick Dispatch Call</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Interactive Strategic Corridors Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 flex-shrink-0 mr-1">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span>Quick Corridors:</span>
        </span>
        {[
          { label: '🚀 Guwahati ➔ Shillong', origin: 'guwahati', dest: 'shillong', dist: '98 km' },
          { label: '🏔️ Tezpur ➔ Tawang', origin: 'tezpur', dest: 'tawang', dist: '320 km' },
          { label: '🌿 Dimapur ➔ Kohima', origin: 'dimapur', dest: 'kohima', dist: '74 km' },
          { label: '🌸 Silchar ➔ Imphal', origin: 'silchar', dest: 'imphal', dist: '258 km' },
          { label: '⛰️ Silchar ➔ Aizawl', origin: 'silchar', dest: 'aizawl', dist: '178 km' },
        ].map((corr) => (
          <button
            key={corr.label}
            onClick={() => {
              setOriginHubId(corr.origin);
              setDestHubId(corr.dest);
              setCustomOrigin(null);
              setCustomDest(null);
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 shadow-sm ${
              originHubId === corr.origin && destHubId === corr.dest
                ? 'bg-blue-600 text-white border-blue-400 shadow-blue-900/50'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <span>{corr.label}</span>
            <span className="font-mono text-[10px] text-slate-400">({corr.dist})</span>
          </button>
        ))}
      </div>

      {/* Interactive Quick Route Planning Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Origin selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl flex-1 min-w-[190px]">
            <span className="text-emerald-400 text-xs font-bold whitespace-nowrap">From:</span>
            <select
              value={originHubId}
              onChange={(e) => {
                setOriginHubId(e.target.value);
                setCustomOrigin(null);
              }}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none w-full cursor-pointer truncate"
            >
              {customOrigin && (
                <option value="custom" className="bg-slate-900 text-white">📍 {customOrigin.name}</option>
              )}
              {deviceGPS && (
                <option value="current-gps" className="bg-slate-900 text-white">📍 Live Device GPS</option>
              )}
              {NER_HUBS.map((h) => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                  {h.name} ({h.state})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Origin & Destination Button */}
          <button
            onClick={() => {
              const prevOriginId = originHubId;
              const prevCustomOrigin = customOrigin;
              setOriginHubId(destHubId);
              setCustomOrigin(customDest);
              setDestHubId(prevOriginId);
              setCustomDest(prevCustomOrigin);
            }}
            title="Swap Start and Destination"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>

          {/* Destination selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl flex-1 min-w-[190px]">
            <span className="text-rose-400 text-xs font-bold whitespace-nowrap">To:</span>
            <select
              value={destHubId}
              onChange={(e) => {
                setDestHubId(e.target.value);
                setCustomDest(null);
              }}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none w-full cursor-pointer truncate"
            >
              {customDest && (
                <option value="custom" className="bg-slate-900 text-white">🎯 {customDest.name}</option>
              )}
              {NER_HUBS.map((h) => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                  {h.name} ({h.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigned Vehicle & Route Status */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none hidden md:block cursor-pointer"
          >
            {fleet.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                {v.name} ({v.current_fuel_litres}L)
              </option>
            ))}
          </select>

          {/* Manual Route Calculation & Clear Route Actions */}
          {routeResult ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCalculateRoute}
                disabled={isOptimizing}
                className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <RefreshCw size={13} className={isOptimizing ? "animate-spin" : ""} />
                <span>Recalculate</span>
              </button>
              <button
                onClick={() => {
                  setRouteResult(null);
                  setCustomOrigin(null);
                  setCustomDest(null);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                title="Clear Route and return to Real-time Fleet Tracking"
              >
                <X size={13} />
                <span>Clear Route (Live Tracking)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleCalculateRoute}
              disabled={isOptimizing}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-950/40 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Calculating Route...</span>
                </>
              ) : (
                <>
                  <Route size={14} />
                  <span>Calculate Highway Route</span>
                </>
              )}
            </button>
          )}

          {/* AI Blockage & Alternate Detour Action Button */}
          <button
            onClick={() => setIsBlockageModalOpen(true)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all border ${
              activeDetourApplied
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 animate-pulse'
                : 'bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 border-rose-800/80 hover:border-rose-600'
            }`}
            title="Calculate AI Alternate Route for road blockages"
          >
            <GitFork size={13} className={activeDetourApplied ? "text-white" : "text-rose-400"} />
            <span>{activeDetourApplied ? 'AI Detour Active' : 'AI Alternate Route (Blocked)'}</span>
          </button>

          {/* Real-time Tracking Mode Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border border-slate-800 bg-slate-950">
            {routeResult ? (
              <span className="text-blue-400 flex items-center space-x-1">
                <Route size={13} />
                <span>Route Feasibility View</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Real-Time Fleet Tracking</span>
              </span>
            )}
          </div>
        </div>
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
              {/* Route Selector on map header (Authentic Highway Corridors) */}
              {filterLayer.routes && routeResult && (
                <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-[11px] shadow-md backdrop-blur-sm">
                  <button
                    onClick={() => setActiveRouteView('all')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      activeRouteView === 'all' || activeRouteView === 'both' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                    title="View all 3 computed highway corridors simultaneously"
                  >
                    All 3 Roads
                  </button>
                  <button
                    onClick={() => setActiveRouteView('safest')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      activeRouteView === 'safest'
                        ? 'bg-emerald-600 text-white shadow-[0_0_12px_#10b981] ring-1 ring-emerald-300'
                        : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/50'
                    }`}
                    title={`${routeResult.safest_route?.route_code || 'Safest Highway'}: All-weather fortified contour (No landslides)`}
                  >
                    <Shield size={12} className={activeRouteView === 'safest' ? 'animate-pulse text-white' : 'text-emerald-400'} />
                    <span>🟢 {routeResult.safest_route?.route_code ? `${routeResult.safest_route.route_code.split('/')[0].split(':')[0].trim()} (Safest)` : 'Safest Highway'}</span>
                  </button>
                  <button
                    onClick={() => setActiveRouteView('shortest')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      activeRouteView === 'shortest' ? 'bg-rose-600 text-white shadow' : 'text-rose-400 hover:text-rose-300'
                    }`}
                    title={`${routeResult.shortest_route?.route_code || 'Direct Mountain Pass'}: Direct mountain pass (⚠️ Active Landslide Hazard)`}
                  >
                    <AlertTriangle size={12} />
                    <span>🔴 {routeResult.shortest_route?.route_code ? `${routeResult.shortest_route.route_code.split('/')[0].split(':')[0].trim()} (Landslide)` : 'Direct Pass'}</span>
                  </button>
                  <button
                    onClick={() => setActiveRouteView('bypass')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      activeRouteView === 'bypass' ? 'bg-cyan-600 text-white shadow' : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                    title={`${routeResult.bypass_route?.route_code || 'Strategic Bypass'}: Strategic Valley Bypass`}
                  >
                    <span>🔵 {routeResult.bypass_route?.route_code ? `${routeResult.bypass_route.route_code.split('/')[0].split(':')[0].trim()} (Bypass)` : 'Strategic Bypass'}</span>
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

          {/* Active AI Alternate Detour Banner */}
          {activeDetourApplied && (
            <div className="mb-2.5 p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-950 border border-cyan-500/60 flex items-center justify-between gap-2 shadow-lg shadow-cyan-950/40 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
                <span className="font-bold text-cyan-300 flex-shrink-0">🔀 AI DETOUR ACTIVE:</span>
                <span className="text-slate-300 truncate">Convoy successfully rerouted around active road blockage (74% Risk Reduction)</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsBlockageModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-semibold"
                >
                  Detour Details
                </button>
                <button
                  onClick={() => setActiveDetourApplied(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Dismiss banner"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
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
              trackedBreadcrumbs={trackedBreadcrumbs}
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
              onSetOrigin={(point) => {
                if (typeof point === 'string') {
                  setOriginHubId(point);
                  setCustomOrigin(null);
                } else if (point.id && NER_HUBS.some((h) => h.id === point.id)) {
                  setOriginHubId(point.id);
                  setCustomOrigin(null);
                } else {
                  setCustomOrigin(point);
                  setOriginHubId('custom');
                }
              }}
              onRouteToVehicle={routeToVehicle}
              onSetDestination={(point) => {
                if (typeof point === 'string') {
                  setDestHubId(point);
                  setCustomDest(null);
                } else if (point.id && NER_HUBS.some((h) => h.id === point.id)) {
                  setDestHubId(point.id);
                  setCustomDest(null);
                } else {
                  const matchedVeh = fleet.find(
                    (v) => v.id === point?.id || (v.license_plate && v.license_plate === point?.id)
                  );
                  if (matchedVeh) {
                    routeToVehicle(matchedVeh);
                  } else {
                    setCustomDest(point);
                    setDestHubId('custom');
                  }
                }
              }}
              onMapError={(reason) => {
                console.warn('Google Map notice:', reason);
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
                  {/* Glow filter for Bypass Route */}
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.7" />
                  </filter>
                  {/* Forward Headlight Beams */}
                  <linearGradient id="headlight-beam-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#a7f3d0" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="headlight-beam-rose" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#fecdd3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="headlight-beam-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#cffafe" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* 1. Road X: Safest Route (Emerald Green Multi-layered Highlight with Moving Transit Truck) */}
                {(activeRouteView === 'all' || activeRouteView === 'both' || activeRouteView === 'safest') && safestSvgPath && (
                  <g>
                    {/* Outer Pulsating Halo */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={activeRouteView === 'safest' ? '18' : '14'}
                      strokeOpacity="0.3"
                      filter="url(#glow-emerald)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <animate attributeName="strokeWidth" values="14;18;14" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="strokeOpacity" values="0.25;0.45;0.25" dur="2.5s" repeatCount="indefinite" />
                    </path>
                    {/* Intermediate Vivid Core */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth={activeRouteView === 'safest' ? '8' : '7'}
                      strokeOpacity="0.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Bright Core Vector Line */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Flowing animated dash pattern */}
                    <path
                      d={safestSvgPath}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeDasharray="6 22"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.9"
                    >
                      <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2.5s" repeatCount="indefinite" />
                    </path>

                    {/* Staggered Secondary Follower Beacons */}
                    <circle r="4.5" fill="#34d399" fillOpacity="0.5" filter="url(#glow-emerald)">
                      <animateMotion dur="8.5s" begin="4.25s" repeatCount="indefinite" path={safestSvgPath} />
                    </circle>
                    <circle r="2.5" fill="#a7f3d0">
                      <animateMotion dur="8.5s" begin="4.25s" repeatCount="indefinite" path={safestSvgPath} />
                    </circle>

                    {/* ─── MOVING RELIEF TRUCK (Auto-rotates along road bends) ─── */}
                    <g id="road-x-moving-truck">
                      <animateMotion dur="8.5s" repeatCount="indefinite" rotate="auto" path={safestSvgPath} />
                      
                      {/* Headlights Forward Illuminator Cone */}
                      <path d="M 14 -5 L 46 -15 A 22 22 0 0 1 46 15 L 14 5 Z" fill="url(#headlight-beam-emerald)" />

                      {/* Radar Telemetry Signal Ring */}
                      <circle cx="0" cy="0" r="16" fill="none" stroke="#10b981" strokeWidth="1.2">
                        <animate attributeName="r" values="10;26;10" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="strokeOpacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
                      </circle>

                      {/* Heavy Duty Tires (4 terrain wheels) */}
                      <rect x="5" y="-9" width="6" height="3" rx="1.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="5" y="6" width="6" height="3" rx="1.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-13" y="-9" width="7" height="3" rx="1.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-13" y="6" width="7" height="3" rx="1.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />

                      {/* Main Cargo Box Container */}
                      <rect x="-14" y="-7" width="18" height="14" rx="2" fill="#064e3b" stroke="#34d399" strokeWidth="1.4" filter="url(#glow-emerald)" />
                      {/* Container roof ridges */}
                      <line x1="-9" y1="-5.5" x2="-9" y2="5.5" stroke="#047857" strokeWidth="0.9" />
                      <line x1="-4" y1="-5.5" x2="-4" y2="5.5" stroke="#047857" strokeWidth="0.9" />
                      <line x1="1" y1="-5.5" x2="1" y2="5.5" stroke="#047857" strokeWidth="0.9" />
                      {/* Relief Medical Cross Emblem */}
                      <path d="M -6 -1.8 H -4 V -3.8 H -2 V -1.8 H 0 V 0.2 H -2 V 2.2 H -4 V 0.2 H -6 Z" fill="#ffffff" />

                      {/* Front Driver Cab */}
                      <path d="M 4 -7 H 11 Q 14 -7 14 -3 V 3 Q 14 7 11 7 H 4 Z" fill="#10b981" stroke="#a7f3d0" strokeWidth="1" />
                      {/* Windshield */}
                      <path d="M 7 -5 H 10 Q 12 -5 12 -2 V 2 Q 12 5 10 5 H 7 Z" fill="#38bdf8" fillOpacity="0.92" />
                      {/* Emergency Roof Light Beacon */}
                      <circle cx="7" cy="0" r="2.2" fill="#ef4444">
                        <animate attributeName="fill" values="#ef4444;#38bdf8;#ef4444" dur="0.6s" repeatCount="indefinite" />
                        <animate attributeName="r" values="2.2;2.8;2.2" dur="0.6s" repeatCount="indefinite" />
                      </circle>
                      {/* Front Headlight Bulbs */}
                      <circle cx="13.5" cy="-3.5" r="1.3" fill="#fef08a" />
                      <circle cx="13.5" cy="3.5" r="1.3" fill="#fef08a" />
                      {/* Rear Red Brake Lights */}
                      <rect x="-14.5" y="-5.5" width="1" height="2" fill="#ef4444" />
                      <rect x="-14.5" y="3.5" width="1" height="2" fill="#ef4444" />
                    </g>

                    {/* ─── UPRIGHT IN-TRANSIT TRUCK LOGO BADGE (Always horizontal & legible) ─── */}
                    <g id="road-x-transit-badge">
                      <animateMotion dur="8.5s" repeatCount="indefinite" path={safestSvgPath} />
                      <g transform="translate(0, -26)">
                        {/* Shadow / Glow Pill */}
                        <rect x="-48" y="-12" width="96" height="24" rx="12" fill="#020617" fillOpacity="0.95" stroke="#10b981" strokeWidth="1.6" filter="url(#glow-emerald)" />
                        {/* Truck Logo Icon */}
                        <text x="-36" y="4" fontSize="13" dominantBaseline="middle" textAnchor="middle">🚚</text>
                        {/* Vehicle Callsign */}
                        <text x="-24" y="-1" fill="#34d399" fontSize="8.5" fontWeight="900" fontFamily="system-ui, sans-serif">
                          {selectedVehicleId ? selectedVehicleId.slice(0, 10) : 'AS-01-EV'}
                        </text>
                        {/* In Transit Live Subtitle */}
                        <text x="-24" y="8" fill="#a7f3d0" fontSize="7" fontWeight="bold" fontFamily="system-ui, sans-serif">
                          IN TRANSIT • 54 km/h
                        </text>
                        {/* Glowing Green Radar Dot */}
                        <circle cx="38" cy="-1" r="2.8" fill="#10b981">
                          <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    </g>
                  </g>
                )}

                {/* 2. Road Y: Direct Route (Amber/Rose Dashed Line with Landslide Hazard & Moving Convoy Truck) */}
                {(activeRouteView === 'all' || activeRouteView === 'both' || activeRouteView === 'shortest') && shortestSvgPath && (
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

                    {/* ─── ROAD Y MOVING TRUCK (Rose/Amber Hazard Transport) ─── */}
                    <g id="road-y-moving-truck">
                      <animateMotion dur="7.5s" repeatCount="indefinite" rotate="auto" path={shortestSvgPath} />
                      <path d="M 14 -5 L 42 -14 A 20 20 0 0 1 42 14 L 14 5 Z" fill="url(#headlight-beam-rose)" />
                      <circle cx="0" cy="0" r="14" fill="none" stroke="#f43f5e" strokeWidth="1">
                        <animate attributeName="r" values="9;22;9" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="strokeOpacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <rect x="4" y="-8.5" width="5" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="4" y="6" width="5" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-12" y="-8.5" width="6" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-12" y="6" width="6" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-13" y="-6.5" width="17" height="13" rx="2" fill="#881337" stroke="#fb7185" strokeWidth="1.2" filter="url(#glow-rose)" />
                      <path d="M 4 -6.5 H 10 Q 13 -6.5 13 -3 V 3 Q 13 6.5 10 6.5 H 4 Z" fill="#e11d48" stroke="#fda4af" strokeWidth="1" />
                      <circle cx="6.5" cy="0" r="1.8" fill="#f59e0b">
                        <animate attributeName="fill" values="#f59e0b;#ffffff;#f59e0b" dur="0.4s" repeatCount="indefinite" />
                      </circle>
                    </g>

                    {/* Road Y Upright Badge */}
                    <g id="road-y-transit-badge">
                      <animateMotion dur="7.5s" repeatCount="indefinite" path={shortestSvgPath} />
                      <g transform="translate(0, -24)">
                        <rect x="-46" y="-11" width="92" height="22" rx="11" fill="#020617" fillOpacity="0.95" stroke="#f43f5e" strokeWidth="1.4" filter="url(#glow-rose)" />
                        <text x="-35" y="3" fontSize="12" dominantBaseline="middle" textAnchor="middle">🚚</text>
                        <text x="-24" y="-1" fill="#fda4af" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">ML-05-TR-9011</text>
                        <text x="-24" y="7" fill="#fca5a5" fontSize="6.5" fontWeight="bold" fontFamily="system-ui, sans-serif">IN TRANSIT • CAUTION</text>
                      </g>
                    </g>
                  </g>
                )}

                {/* 3. Road Z: Valley Ridge Strategic Bypass (Cyan Dotted Line with Moving Bypass Truck) */}
                {(activeRouteView === 'all' || activeRouteView === 'both' || activeRouteView === 'bypass') && bypassSvgPath && (
                  <g>
                    {/* Outer Glow Halo */}
                    <path
                      d={bypassSvgPath}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="8"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main Dotted Vector Line */}
                    <path
                      d={bypassSvgPath}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="3.5"
                      strokeDasharray="4 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* ─── ROAD Z MOVING TRUCK (Cyan Strategic Bypass Transporter) ─── */}
                    <g id="road-z-moving-truck">
                      <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" path={bypassSvgPath} />
                      <path d="M 14 -5 L 42 -14 A 20 20 0 0 1 42 14 L 14 5 Z" fill="url(#headlight-beam-cyan)" />
                      <circle cx="0" cy="0" r="14" fill="none" stroke="#06b6d4" strokeWidth="1">
                        <animate attributeName="r" values="9;22;9" dur="1.6s" repeatCount="indefinite" />
                        <animate attributeName="strokeOpacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                      <rect x="4" y="-8.5" width="5" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="4" y="6" width="5" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-12" y="-8.5" width="6" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-12" y="6" width="6" height="2.5" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                      <rect x="-13" y="-6.5" width="17" height="13" rx="2" fill="#164e63" stroke="#22d3ee" strokeWidth="1.2" filter="url(#glow-cyan)" />
                      <path d="M 4 -6.5 H 10 Q 13 -6.5 13 -3 V 3 Q 13 6.5 10 6.5 H 4 Z" fill="#0891b2" stroke="#67e8f9" strokeWidth="1" />
                      <circle cx="6.5" cy="0" r="1.8" fill="#38bdf8">
                        <animate attributeName="fill" values="#38bdf8;#ffffff;#38bdf8" dur="0.5s" repeatCount="indefinite" />
                      </circle>
                    </g>

                    {/* Road Z Upright Badge */}
                    <g id="road-z-transit-badge">
                      <animateMotion dur="10s" repeatCount="indefinite" path={bypassSvgPath} />
                      <g transform="translate(0, -24)">
                        <rect x="-46" y="-11" width="92" height="22" rx="11" fill="#020617" fillOpacity="0.95" stroke="#06b6d4" strokeWidth="1.4" filter="url(#glow-cyan)" />
                        <text x="-35" y="3" fontSize="12" dominantBaseline="middle" textAnchor="middle">🚚</text>
                        <text x="-24" y="-1" fill="#67e8f9" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">TR-01-AX-1002</text>
                        <text x="-24" y="7" fill="#a5f3fc" fontSize="6.5" fontWeight="bold" fontFamily="system-ui, sans-serif">IN TRANSIT • BYPASS</text>
                      </g>
                    </g>
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
                {((activeRouteView === 'shortest'
                    ? routeResult.shortest_route?.fuel_stops
                    : activeRouteView === 'bypass'
                    ? (routeResult.bypass_route?.fuel_stops || routeResult.safest_route?.fuel_stops)
                    : routeResult.safest_route?.fuel_stops) || []
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
                      openVehicleDossier(vehicle);
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
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-950/95 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap border border-emerald-800 pointer-events-none flex flex-col items-center space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <span>{vehicle.id}</span>
                        <span className="text-amber-400">({vehicle.current_fuel_litres}L)</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[8px] text-cyan-300 border-t border-slate-800/80 pt-0.5 w-full justify-center">
                        <span className="text-[10px]">🚚</span>
                        <span className="font-black text-emerald-400">IN TRANSIT</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      </div>
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
            {/* REAL-TIME VEHICLE BREADCRUMB TRAIL (AIS-140)       */}
            {/* ═══════════════════════════════════════════════════ */}
            {isTrackingActive && trackedVehicle && trackedBreadcrumbs.length > 1 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-14">
                <defs>
                  <linearGradient id="tracked-breadcrumb-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <path
                  d={trackedBreadcrumbs.map((pt, i) => {
                    const s = coordToScreen(pt.lat, pt.lng);
                    return `${i === 0 ? 'M' : 'L'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="url(#tracked-breadcrumb-gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Trailing dots showing recent motion */}
                {trackedBreadcrumbs.slice(-8).map((pt, i, arr) => {
                  const s = coordToScreen(pt.lat, pt.lng);
                  return (
                    <circle
                      key={`crumb-dot-${i}`}
                      cx={s.x}
                      cy={s.y}
                      r={2 + (i / arr.length) * 3}
                      fill="#34d399"
                      opacity={0.3 + (i / arr.length) * 0.7}
                    />
                  );
                })}
              </svg>
            )}

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

        {/* Active Route Summary Bar (Clear, Simple & Informative) */}
        {routeResult && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex-shrink-0">
                <Route size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {routeResult.origin?.name || 'Start'} ➔ {routeResult.destination?.name || 'End'}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {routeResult.safest_route?.risk_level || 'Safe'} Corridor
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 font-mono">
                  <span className="flex items-center space-x-1 text-white font-bold">
                    <Clock size={13} className="text-blue-400" />
                    <span>{routeResult.safest_route?.duration_text || '2h 15m'}</span>
                  </span>
                  <span>•</span>
                  <span>{routeResult.safest_route?.distance_km || 98} km</span>
                  <span>•</span>
                  <span className="text-emerald-400">
                    ⛽ {routeResult.safest_route?.fuel_required_litres || 18}L needed ({simulatedFuel}L in tank)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    if (window.speechSynthesis.speaking) {
                      window.speechSynthesis.cancel();
                      return;
                    }
                    window.speechSynthesis.cancel();
                    const safestName = routeResult.safest_route?.route_code || 'the primary all-weather highway';
                    const hazardName = routeResult.shortest_route?.route_code || 'the direct mountain pass';
                    const bypassName = routeResult.bypass_route?.route_code || 'the strategic valley bypass';
                    const text = `NER AI Route Assessment from ${routeResult.origin?.name} to ${routeResult.destination?.name}. Caution: ${hazardName} is affected by active landslides and rockfall hazards. ${safestName} is recommended as the safest all-weather corridor, spanning ${routeResult.safest_route?.distance_km} kilometers with estimated travel time of ${routeResult.safest_route?.duration_text}. ${bypassName} is also available as a valley bypass corridor.`;
                    const utter = new SpeechSynthesisUtterance(text);
                    window.speechSynthesis.speak(utter);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Voice guide (click while speaking to immediately turn off)"
              >
                <Volume2 size={13} />
                <span>Voice Guide</span>
              </button>
              <button
                onClick={() => {
                  const summary = `NER-LIFELINE MANIFEST\nFrom: ${routeResult.origin?.name}\nTo: ${routeResult.destination?.name}\nDistance: ${routeResult.safest_route?.distance_km} km\nDuration: ${routeResult.safest_route?.duration_text}\nVehicle: ${selectedVehicleId}\nFuel In Tank: ${simulatedFuel}L`;
                  navigator.clipboard?.writeText(summary);
                  alert('Manifest copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Copy Manifest</span>
              </button>
              <button
                onClick={() => {
                  setRouteResult(null);
                  setCustomOrigin(null);
                  setCustomDest(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                title="Clear Route and return to full real-time tracking"
              >
                <X size={13} />
                <span>Clear Route</span>
              </button>
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

                {/* 1. Safest Route Card (AI Pick) */}
                <div
                  onClick={() => {
                    setActiveRouteView('safest');
                    if (routeResult.safest_route.coordinates?.[3]) {
                      jumpToLocation(routeResult.safest_route.coordinates[3][0], routeResult.safest_route.coordinates[3][1], 8);
                    }
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    activeRouteView === 'safest' || activeRouteView === 'all' || activeRouteView === 'both'
                      ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-emerald-950/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="absolute inset-0 animate-safest-shimmer pointer-events-none opacity-30"></div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <Shield size={14} className="text-emerald-400" />
                          <span className="font-extrabold text-emerald-300 text-sm tracking-wide">
                            {routeResult.safest_route?.route_code || 'All-Weather Corridor'} • Safest
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400/90 font-bold block">
                          ★ AI Top Recommendation ({routeResult.safest_route?.title || 'Fortified Highway'})
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      LOW RISK ({routeResult.safest_route.landslide_probability_pct}%) • SAFE
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-200/80 leading-relaxed relative z-10 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                    {routeResult.safest_route?.reasoning || 'Reinforced all-weather alignment. Bypasses all active landslide & debris flow zones completely. High bridge structural clearance.'}
                  </p>

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

                {/* 2. Direct Highway Card (⚠️ LANDSLIDE AFFECTED) */}
                <div
                  onClick={() => {
                    setActiveRouteView('shortest');
                    if (routeResult.shortest_route.coordinates?.[3]) {
                      jumpToLocation(routeResult.shortest_route.coordinates[3][0], routeResult.shortest_route.coordinates[3][1], 8);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    activeRouteView === 'shortest'
                      ? 'bg-rose-950/60 border-rose-400 ring-2 ring-rose-400/50 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                      : 'bg-slate-900/60 border-rose-900/50 hover:border-rose-600/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse"></span>
                      <div>
                        <span className="font-extrabold text-rose-300 text-sm">
                          {routeResult.shortest_route?.route_code || 'Direct Highway'} • Mountain Ridge
                        </span>
                        <span className="text-[10px] text-rose-400 block font-semibold">
                          {routeResult.shortest_route?.title || 'Direct Mountain Pass (Shortest km)'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50">
                      HIGH RISK ({routeResult.shortest_route.landslide_probability_pct}%) • ⛔ IMPASSABLE
                    </span>
                  </div>

                  {/* Prominent Landslide Hazard Warning Box */}
                  <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs flex items-start space-x-2">
                    <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <span className="font-black text-rose-100 block">⚠️ ACTIVE LANDSLIDE & DEBRIS HAZARD</span>
                      <span className="text-[11px] text-rose-300 leading-snug">
                        {routeResult.shortest_route?.hazard_alert || 'Active slope failure reported. Roadway is obstructed by mudflow and boulder slips.'}{' '}
                        <strong>AI diverted to {routeResult.safest_route?.route_code || 'the all-weather corridor'}.</strong>
                      </span>
                    </div>
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
                    <span className="text-slate-400 text-[11px]">Fuel Feasibility:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                      <AlertTriangle size={12} />
                      <span>Avoid: Severe Landslide Hazard</span>
                    </span>
                  </div>
                </div>

                {/* 3. Valley Ridge Strategic Bypass Card (Alternate Route) */}
                <div
                  onClick={() => {
                    setActiveRouteView('bypass');
                    if (routeResult.bypass_route?.coordinates?.[3]) {
                      jumpToLocation(routeResult.bypass_route.coordinates[3][0], routeResult.bypass_route.coordinates[3][1], 8);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    activeRouteView === 'bypass'
                      ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/60 border-cyan-900/40 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
                      <div>
                        <span className="font-extrabold text-cyan-300 text-sm">
                          {routeResult.bypass_route?.route_code || 'Valley Bypass'} • Strategic Bypass
                        </span>
                        <span className="text-[10px] text-cyan-400/80 block font-semibold">
                          {routeResult.bypass_route?.title || 'Strategic Secondary Contour (Alternate)'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      MODERATE RISK ({routeResult.bypass_route?.landslide_probability_pct || 36}%) • PASSABLE
                    </span>
                  </div>

                  <p className="text-[11px] text-cyan-200/80 leading-relaxed bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                    {routeResult.bypass_route?.reasoning || 'Secondary valley bypass corridor. Loops completely around the mountain slope affected by landslides. Passable for heavy relief vehicles.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">DISTANCE</span>
                      <span className="font-bold text-white">{routeResult.bypass_route?.distance_km || Math.round(routeResult.safest_route.distance_km * 1.08)} km</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">EST. TIME</span>
                      <span className="font-bold text-white">{routeResult.bypass_route?.eta_hours || (parseFloat(routeResult.safest_route.eta_hours) + 0.3).toFixed(1)} hrs</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">FUEL NEEDED</span>
                      <span className="font-bold text-cyan-400">{routeResult.bypass_route?.fuel_required_litres || +(routeResult.safest_route.fuel_required_litres + 2.4).toFixed(1)} L</span>
                    </div>
                  </div>

                  {/* Fuel Feasibility Margin Badge */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 text-[11px]">Bypass Status:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                      <Check size={12} />
                      <span>Passable Alternate Bypass Route</span>
                    </span>
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

                {/* 4. Turn-by-Turn Real Navigation Steps */}
                {(() => {
                  const currentNavSteps = (
                    activeRouteView === 'shortest'
                      ? routeResult.shortest_route?.navigation_steps
                      : activeRouteView === 'bypass'
                      ? (routeResult.bypass_route?.navigation_steps || routeResult.safest_route?.navigation_steps)
                      : routeResult.safest_route?.navigation_steps
                  ) || routeResult.safest_route?.navigation_steps || [];

                  if (!currentNavSteps.length) return null;

                  return (
                    <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-900/90 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Navigation size={15} className="text-blue-400 rotate-45" />
                          <span className="font-extrabold text-white text-xs tracking-tight">
                            Turn-by-Turn Road Navigation ({currentNavSteps.length} Steps)
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                          {activeRouteView === 'shortest' ? `${routeResult.shortest_route?.route_code || 'Direct Pass'} (Direct)` : activeRouteView === 'bypass' ? `${routeResult.bypass_route?.route_code || 'Valley Bypass'} (Bypass)` : `${routeResult.safest_route?.route_code || 'All-Weather Corridor'} (Safest)`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug">
                        Real-world highway instructions & maneuvers along this transit corridor. Click any step to inspect road segment.
                      </p>

                      <div className="space-y-2">
                        {currentNavSteps.map((step, sIdx) => (
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
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Road Blockage & Alternate Detour Modal */}
      <AIBlockageRerouteModal
        isOpen={isBlockageModalOpen}
        onClose={() => setIsBlockageModalOpen(false)}
        currentOrigin={NER_HUBS.find((h) => h.id === originHubId) || NER_HUBS[0]}
        currentDestination={NER_HUBS.find((h) => h.id === destHubId) || NER_HUBS[1]}
        selectedBlockageId={selectedBlockageId}
        onApplyAlternateRoute={handleApplyAlternateRoute}
        activeVehicle={fleet.find((v) => v.id === selectedVehicleId)}
      />

      {/* Full AIS-140 Vehicle Dossier & Real-Time Exact Location Modal */}
      <VehicleDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        vehicle={dossierVehicle || trackedVehicle}
        onTrackLive={(v) => {
          startTrackingVehicle(v);
        }}
        isTracking={isTrackingActive && ((trackedVehicle?.license_plate || trackedVehicle?.id) === (dossierVehicle?.license_plate || dossierVehicle?.id))}
        onCenterOnMap={(lat, lng) => jumpToLocation(lat, lng, 12)}
        autoFollowCam={autoFollowCam}
        onToggleAutoFollow={() => setAutoFollowCam(!autoFollowCam)}
        onRouteToVehicle={routeToVehicle}
        onRouteMission={routeVehicleMission}
      />
      </div>
    </div>
  );
};

export default LiveMap;
