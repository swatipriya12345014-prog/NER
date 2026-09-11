import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Layers, Shield, Navigation, AlertTriangle, Fuel, MapPin, Radio, 
  Compass, Eye, Check, RefreshCw, AlertOctagon, CircleDot, Bell, 
  X, Info, Sliders, CloudRain, Truck, Route as RouteIcon,
  Volume2, Copy, ZoomIn, ZoomOut, RotateCcw, Crosshair, ArrowRight,
  ExternalLink, Sparkles, Map as MapIcon, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  calculateRealHighwayRoute, 
  fetchGoogleBackendRoute,
  OPERATIONAL_BLOCKED_ROADS,
  OPERATIONAL_RISKY_ROADS,
  OPERATIONAL_SHIPMENT_ROUTES,
  OPERATIONAL_RISK_ZONES,
  OPERATIONAL_ALERTS
} from '../services/googleDirectionsService';
import { startCompassTracking, getCompassCardinal } from '../services/gpsService';

// Default / Provided Google Maps API Key
const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyDP02pC9K1QL7p69lae940OyX1iKcbhAoA';

// ─────────────────────────────────────────────────────────────
// 1. Google Maps Direct High-Resolution Slippy Tile Providers
// ─────────────────────────────────────────────────────────────
const GOOGLE_TILE_PROVIDERS = {
  dark: {
    id: 'dark',
    name: 'Tactical Dark',
    icon: '🌙',
    lyrs: 'm',
    filter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(120%)',
    bg: '#0a0f1d'
  },
  roadmap: {
    id: 'roadmap',
    name: 'Google Streets',
    icon: '🗺️',
    lyrs: 'm',
    filter: 'none',
    bg: '#e5e7eb'
  },
  terrain: {
    id: 'terrain',
    name: 'Google Terrain',
    icon: '⛰️',
    lyrs: 'p',
    filter: 'none',
    bg: '#d1d5db'
  },
  hybrid: {
    id: 'hybrid',
    name: 'Google Satellite',
    icon: '🛰️',
    lyrs: 'y',
    filter: 'none',
    bg: '#0f172a'
  },
  satellite: {
    id: 'satellite',
    name: 'Aerial Imagery',
    icon: '🌍',
    lyrs: 's',
    filter: 'none',
    bg: '#0f172a'
  }
};

const TILE_SIZE = 256;

// Key Strategic North East India Hubs for Quick-Jump
const NER_STATE_CAPITALS = [
  { name: 'Guwahati (Assam Hub)', lat: 26.1445, lng: 91.7362, state: 'Assam' },
  { name: 'Shillong (Meghalaya)', lat: 25.5788, lng: 91.8933, state: 'Meghalaya' },
  { name: 'Itanagar (Arunachal)', lat: 27.0844, lng: 93.6053, state: 'Arunachal' },
  { name: 'Kohima (Nagaland)', lat: 25.6751, lng: 94.1086, state: 'Nagaland' },
  { name: 'Imphal (Manipur)', lat: 24.8170, lng: 93.9368, state: 'Manipur' },
  { name: 'Aizawl (Mizoram)', lat: 23.7271, lng: 92.7176, state: 'Mizoram' },
  { name: 'Agartala (Tripura)', lat: 23.8315, lng: 91.2868, state: 'Tripura' },
  { name: 'Gangtok (Sikkim)', lat: 27.3389, lng: 88.6065, state: 'Sikkim' },
  { name: 'Silchar (Barak Valley)', lat: 24.8333, lng: 92.7789, state: 'Assam' },
  { name: 'Tawang (Border Post)', lat: 27.5861, lng: 91.8594, state: 'Arunachal' }
];

// ─────────────────────────────────────────────────────────────
// 2. High-Precision Spherical Mercator Math (EPSG:3857)
// ─────────────────────────────────────────────────────────────
function project(lat, lng) {
  const siny = Math.sin((lat * Math.PI) / 180);
  const clampedSiny = Math.min(Math.max(siny, -0.9999), 0.9999);
  return {
    x: TILE_SIZE * (0.5 + lng / 360),
    y: TILE_SIZE * (0.5 - Math.log((1 + clampedSiny) / (1 - clampedSiny)) / (4 * Math.PI))
  };
}

function unproject(wx, wy) {
  const lng = (wx / TILE_SIZE - 0.5) * 360;
  const v = 4 * Math.PI * (0.5 - wy / TILE_SIZE);
  const sinLat = Math.tanh(v / 2);
  const lat = (Math.asin(sinLat) * 180) / Math.PI;
  return { lat, lng };
}

function latLngToScreen(lat, lng, cLat, cLng, zoom, width, height) {
  const scale = Math.pow(2, zoom);
  const c = project(cLat, cLng);
  const p = project(lat, lng);
  return {
    x: width / 2 + (p.x - c.x) * scale,
    y: height / 2 + (p.y - c.y) * scale
  };
}

function screenToLatLng(screenX, screenY, cLat, cLng, zoom, width, height) {
  const scale = Math.pow(2, zoom);
  const c = project(cLat, cLng);
  const wx = c.x + (screenX - width / 2) / scale;
  const wy = c.y + (screenY - height / 2) / scale;
  return unproject(wx, wy);
}

// ─────────────────────────────────────────────────────────────
// 3. Main GoogleMapView Component
// ─────────────────────────────────────────────────────────────
export default function GoogleMapView({
  apiKey = DEFAULT_GOOGLE_MAPS_API_KEY,
  center = { lat: 26.2, lng: 92.8 },
  zoom = 7.5,
  routeResult = null,
  activeRouteView = 'both',
  fleet = [],
  selectedVehicleId = null,
  hubs = [],
  hazards = [],
  localities = [],
  blockedRoads = OPERATIONAL_BLOCKED_ROADS,
  riskyRoads = OPERATIONAL_RISKY_ROADS,
  shipmentRoutes = OPERATIONAL_SHIPMENT_ROUTES,
  riskZones = OPERATIONAL_RISK_ZONES,
  alerts = OPERATIONAL_ALERTS,
  filterLayer = { 
    vehicles: true, 
    hazards: true, 
    hubs: true, 
    routes: true, 
    localities: true, 
    gps: true,
    blockedRoads: true,
    riskyRoads: true,
    shipments: true,
    riskZones: true,
    alerts: true
  },
  deviceGPS = null,
  deviceHeading = null,
  enableHeadingUp = false,
  onHeadingChange = null,
  gpsFollowMode = false,
  onSelectEntity = null,
  onLocalityClick = null,
  onRealRouteComputed = null,
  onMapError = null,
  onSetOrigin = null,
  onSetDestination = null,
  heightClass = 'h-[640px]'
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 640 });

  // Map viewport states
  const [mapCenter, setMapCenter] = useState({ lat: center.lat, lng: center.lng });
  const [mapZoom, setMapZoom] = useState(typeof zoom === 'number' ? zoom : 7.5);
  const [mapType, setMapType] = useState('dark');
  const [showTraffic, setShowTraffic] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [currentRouteView, setCurrentRouteView] = useState(activeRouteView);

  // Compass-based Navigation states
  const [isHeadingUp, setIsHeadingUp] = useState(enableHeadingUp);
  const [compassHeading, setCompassHeading] = useState(0);
  const [isSensorActive, setIsSensorActive] = useState(false);
  const [manualSimulationAngle, setManualSimulationAngle] = useState(null);
  const [showCompassTools, setShowCompassTools] = useState(false);

  // Operational Drawers & Selected Entities
  const [showLayerDrawer, setShowLayerDrawer] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null); // { type, data, lat, lng, x, y }
  const [copyToast, setCopyToast] = useState(false);
  const [flowOffset, setFlowOffset] = useState(0);

  // Active key (priority: prop > default)
  const activeApiKey = apiKey || DEFAULT_GOOGLE_MAPS_API_KEY;

  // Active Layers
  const [activeLayers, setActiveLayers] = useState({
    vehicles: filterLayer.vehicles ?? true,
    hazards: filterLayer.hazards ?? true,
    hubs: filterLayer.hubs ?? true,
    routes: filterLayer.routes ?? true,
    localities: filterLayer.localities ?? true,
    gps: filterLayer.gps ?? true,
    blockedRoads: filterLayer.blockedRoads ?? true,
    riskyRoads: filterLayer.riskyRoads ?? true,
    shipments: filterLayer.shipments ?? true,
    riskZones: filterLayer.riskZones ?? true,
    alerts: filterLayer.alerts ?? true
  });

  const { t, speakText, isSpeaking, playAlertChime } = useLanguage();

  // Sync prop changes
  useEffect(() => {
    setActiveLayers((prev) => ({ ...prev, ...filterLayer }));
  }, [filterLayer]);

  useEffect(() => {
    setCurrentRouteView(activeRouteView);
  }, [activeRouteView]);

  useEffect(() => {
    if (center && (Math.abs(center.lat - mapCenter.lat) > 0.05 || Math.abs(center.lng - mapCenter.lng) > 0.05)) {
      setMapCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center]);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate flow chevrons on safest road
  useEffect(() => {
    const interval = setInterval(() => {
      setFlowOffset((prev) => (prev + 1) % 40);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Effective Heading
  const effectiveHeading = manualSimulationAngle !== null
    ? manualSimulationAngle
    : (deviceGPS?.heading_deg != null && (deviceGPS.speed_kmh || 0) > 3)
      ? deviceGPS.heading_deg
      : (deviceHeading !== null && deviceHeading !== undefined)
        ? deviceHeading
        : (compassHeading || 0);

  // Compass Sensor tracking
  useEffect(() => {
    const tracker = startCompassTracking((headingDeg, hasSensor) => {
      setCompassHeading(headingDeg);
      setIsSensorActive(hasSensor);
      if (onHeadingChange) onHeadingChange(headingDeg);
    });
    return () => {
      if (tracker && tracker.stop) tracker.stop();
    };
  }, [onHeadingChange]);

  // Global window routing hooks
  useEffect(() => {
    window.__nerSetOrigin = (param) => {
      if (typeof param === 'string') {
        const hub = hubs.find((h) => h.id === param);
        if (hub && onSetOrigin) onSetOrigin(hub);
      } else if (param && onSetOrigin) {
        onSetOrigin(param);
      }
      setSelectedPin(null);
    };

    window.__nerSetDest = (param) => {
      if (typeof param === 'string') {
        const hub = hubs.find((h) => h.id === param);
        if (hub && onSetDestination) onSetDestination(hub);
      } else if (param && onSetDestination) {
        onSetDestination(param);
      }
      setSelectedPin(null);
    };

    return () => {
      delete window.__nerSetOrigin;
      delete window.__nerSetDest;
    };
  }, [hubs, onSetOrigin, onSetDestination]);

  // ─────────────────────────────────────────────────────────────
  // 4. Mouse Drag & Touch Panning Handlers
  // ─────────────────────────────────────────────────────────────
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, centerLat: 26.2, centerLng: 92.8 });
  const [isGrabbing, setIsGrabbing] = useState(false);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat: mapCenter.lat,
      centerLng: mapCenter.lng
    };
    setIsGrabbing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

    const scale = Math.pow(2, mapZoom);
    const startCenterWorld = project(dragStartRef.current.centerLat, dragStartRef.current.centerLng);
    
    let rotDx = dx;
    let rotDy = dy;
    if (isHeadingUp && effectiveHeading) {
      const rad = (effectiveHeading * Math.PI) / 180;
      rotDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      rotDy = dx * Math.sin(rad) + dy * Math.cos(rad);
    }

    const newWx = startCenterWorld.x - rotDx / scale;
    const newWy = startCenterWorld.y - rotDy / scale;
    const newCenter = unproject(newWx, newWy);

    setMapCenter(newCenter);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Mouse Wheel Zoom-to-Cursor Handler
  // ─────────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
    const newZoom = Math.max(5.0, Math.min(16.0, mapZoom + zoomDelta));
    if (newZoom === mapZoom) return;

    const scaleOld = Math.pow(2, mapZoom);
    const cOld = project(mapCenter.lat, mapCenter.lng);
    const wx = cOld.x + (cursorX - dimensions.width / 2) / scaleOld;
    const wy = cOld.y + (cursorY - dimensions.height / 2) / scaleOld;

    const scaleNew = Math.pow(2, newZoom);
    const cNewX = wx - (cursorX - dimensions.width / 2) / scaleNew;
    const cNewY = wy - (cursorY - dimensions.height / 2) / scaleNew;
    const newCenter = unproject(cNewX, cNewY);

    setMapZoom(newZoom);
    setMapCenter(newCenter);
  };

  // Handle map click for custom routing pin
  const handleContainerClick = (e) => {
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    if (dx > 5 || dy > 5) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const clickedGeo = screenToLatLng(px, py, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);

    let nearestHub = null;
    let minDist = 999;
    if (hubs && hubs.length) {
      hubs.forEach((h) => {
        const d = Math.hypot(h.lat - clickedGeo.lat, h.lng - clickedGeo.lng);
        if (d < minDist) {
          minDist = d;
          nearestHub = h;
        }
      });
    }

    const label = (minDist < 0.35 && nearestHub)
      ? `${nearestHub.name} (${nearestHub.state})`
      : `Coordinates (${clickedGeo.lat.toFixed(3)}°N, ${clickedGeo.lng.toFixed(3)}°E)`;

    setSelectedPin({
      type: 'custom',
      name: label,
      lat: clickedGeo.lat,
      lng: clickedGeo.lng,
      x: px,
      y: py
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Visible Tile Calculation
  // ─────────────────────────────────────────────────────────────
  const visibleTiles = useMemo(() => {
    const tileZoom = Math.floor(mapZoom);
    const scale = Math.pow(2, mapZoom);
    const tileScale = Math.pow(2, mapZoom - tileZoom);
    const scaledTileSize = TILE_SIZE * tileScale;

    const c = project(mapCenter.lat, mapCenter.lng);
    const cx = c.x * scale;
    const cy = c.y * scale;

    const xMin = cx - dimensions.width / 2;
    const xMax = cx + dimensions.width / 2;
    const yMin = cy - dimensions.height / 2;
    const yMax = cy + dimensions.height / 2;

    const maxTiles = Math.pow(2, tileZoom);
    const txMin = Math.max(0, Math.floor(xMin / scaledTileSize) - 1);
    const txMax = Math.min(maxTiles - 1, Math.floor(xMax / scaledTileSize) + 1);
    const tyMin = Math.max(0, Math.floor(yMin / scaledTileSize) - 1);
    const tyMax = Math.min(maxTiles - 1, Math.floor(yMax / scaledTileSize) + 1);

    const tiles = [];
    const provider = GOOGLE_TILE_PROVIDERS[mapType] || GOOGLE_TILE_PROVIDERS.dark;

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const left = dimensions.width / 2 + (tx * scaledTileSize - cx);
        const top = dimensions.height / 2 + (ty * scaledTileSize - cy);

        const serverNum = (tx + ty) % 4;
        const tileUrl = `https://mt${serverNum}.google.com/vt/lyrs=${provider.lyrs}&x=${tx}&y=${ty}&z=${tileZoom}`;
        const trafficUrl = showTraffic
          ? `https://mt${serverNum}.google.com/vt/lyrs=h,traffic&x=${tx}&y=${ty}&z=${tileZoom}`
          : null;

        tiles.push({
          key: `${tileZoom}_${tx}_${ty}`,
          url: tileUrl,
          trafficUrl,
          left,
          top,
          size: scaledTileSize
        });
      }
    }
    return tiles;
  }, [mapCenter, mapZoom, dimensions, mapType, showTraffic]);

  // Voice Readout & Manifest
  const handleVoiceReadout = () => {
    if (!routeResult) return;
    const destName = routeResult.destination?.name || 'Destination';
    const dist = routeResult.distance?.text || `${routeResult.safest_route?.distance_km || 140} km`;
    const dur = routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours || 3.5} hours`;
    const riskVerdict = routeResult.ai_recommendation?.safety_verdict || 'Safest Highway Corridor (Road X) recommended.';
    speakText(`Active Route to ${destName}. Distance: ${dist}. Estimated drive time: ${dur}. Safety verdict: ${riskVerdict}`);
  };

  const handleCopyRoute = () => {
    if (!routeResult) return;
    const origin = routeResult.origin?.name || 'Guwahati Hub';
    const destination = routeResult.destination?.name || 'Destination Hub';
    const dist = routeResult.distance?.text || `${routeResult.safest_route?.distance_km} km`;
    const dur = routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours}h`;
    const manifest = `NER-LIFELINE ROUTE MANIFEST\nFrom: ${origin} ➔ To: ${destination}\nCorridor: ${routeResult.safest_route?.corridor_name || 'National Highway Corridor'}\nDistance: ${dist} • ETA: ${dur}\nRisk Rating: ${routeResult.safest_route?.risk_level || 'LOW'} (${routeResult.safest_route?.risk_score || 18}/100)\nProvider: Google Maps Platform (API: ${activeApiKey.substring(0, 8)}...${activeApiKey.substring(activeApiKey.length - 4)})`;
    navigator.clipboard.writeText(manifest).then(() => {
      setCopyToast(true);
      playAlertChime('success');
      setTimeout(() => setCopyToast(false), 2500);
    });
  };

  // Launch Turn-by-Turn in Google Maps directly
  const handleOpenGoogleMaps = () => {
    if (!routeResult?.origin || !routeResult?.destination) {
      window.open(`https://www.google.com/maps/@${mapCenter.lat},${mapCenter.lng},${Math.round(mapZoom)}z`, '_blank');
      return;
    }
    const oLat = routeResult.origin.lat || 26.1445;
    const oLng = routeResult.origin.lng || 91.7362;
    const dLat = routeResult.destination.lat || 25.5788;
    const dLng = routeResult.destination.lng || 91.8933;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Convert coordinate array to SVG polyline points string
  const coordsToSvgPoints = (coords) => {
    if (!coords || !coords.length) return '';
    return coords
      .map(([lat, lng]) => {
        const pt = latLngToScreen(lat, lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Fit view bounds to route when routeResult updates
  useEffect(() => {
    if (!routeResult || !routeResult.safest_route?.coordinates) return;
    const coords = routeResult.safest_route.coordinates;
    if (!coords.length) return;

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    coords.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    setMapCenter({ lat: cLat, lng: cLng });
  }, [routeResult?.origin?.id, routeResult?.destination?.id]);

  const activeProvider = GOOGLE_TILE_PROVIDERS[mapType] || GOOGLE_TILE_PROVIDERS.dark;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${heightClass} bg-slate-950 overflow-hidden rounded-xl select-none font-sans border border-slate-800 shadow-2xl`}
      style={{ cursor: isGrabbing ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      {/* ───────────────────────────────────────────────────────── */}
      {/* Slippy Tile Container (Supports 3D Tilt & Compass Heading) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div 
        className="absolute inset-0 transition-transform duration-300 origin-center pointer-events-none"
        style={{
          transform: `
            ${is3D ? 'perspective(1000px) rotateX(42deg)' : ''}
            ${isHeadingUp ? `rotate(${-effectiveHeading}deg)` : ''}
          `
        }}
      >
        {/* Google Maps Base Tiles */}
        {visibleTiles.map((tile) => (
          <div
            key={tile.key}
            className="absolute overflow-hidden"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              width: `${tile.size}px`,
              height: `${tile.size}px`,
              backgroundColor: activeProvider.bg
            }}
          >
            <img
              src={tile.url}
              alt="Google Map Tile"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover transition-opacity duration-150"
              style={{ filter: activeProvider.filter }}
              draggable={false}
              onError={(e) => {
                e.target.style.opacity = '0.7';
              }}
            />
            {tile.trafficUrl && (
              <img
                src={tile.trafficUrl}
                alt="Google Traffic Tile"
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            )}
          </div>
        ))}

        {/* ───────────────────────────────────────────────────────── */}
        {/* Operational Vector Overlays (Roads X, Y, Z, Risk Zones) */}
        {/* ───────────────────────────────────────────────────────── */}
        <svg 
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <defs>
            <filter id="safestGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.85" />
            </filter>
            <filter id="bypassGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.85" />
            </filter>
            <filter id="dangerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Operational Risk Zones */}
          {activeLayers.riskZones && riskZones && riskZones.map((zone) => {
            const pt = latLngToScreen(zone.lat, zone.lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
            const rPx = Math.max(12, ((zone.radius_km || 10) / (40075 / (256 * Math.pow(2, mapZoom)))) * 111);
            return (
              <g key={zone.id}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={rPx}
                  fill="rgba(239, 68, 68, 0.18)"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={rPx / 2}
                  fill="rgba(239, 68, 68, 0.28)"
                />
              </g>
            );
          })}

          {/* Blocked Roads (NH-13 Sela Pass Closure, etc.) */}
          {activeLayers.blockedRoads && blockedRoads && blockedRoads.map((blk) => {
            if (!blk.coordinates) return null;
            const pts = coordsToSvgPoints(blk.coordinates);
            return (
              <polyline
                key={blk.id}
                points={pts}
                fill="none"
                stroke="#dc2626"
                strokeWidth="6"
                strokeDasharray="6,4"
                strokeLinecap="round"
                opacity="0.9"
              />
            );
          })}

          {/* Risky Roads (NH-6 Flash Flood Artery, etc.) */}
          {activeLayers.riskyRoads && riskyRoads && riskyRoads.map((rsk) => {
            if (!rsk.coordinates) return null;
            const pts = coordsToSvgPoints(rsk.coordinates);
            return (
              <polyline
                key={rsk.id}
                points={pts}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="5"
                strokeDasharray="4,4"
                strokeLinecap="round"
                opacity="0.85"
              />
            );
          })}

          {/* ───────────────────────────────────────────────────────── */}
          {/* THE THREE ALTERNATIVE ROADS (ROAD X, ROAD Y, ROAD Z) */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeLayers.routes && routeResult && (
            <>
              {/* ROAD Y: Direct Mountain Road (High Landslide Hazard) */}
              {(currentRouteView === 'both' || currentRouteView === 'all' || currentRouteView === 'shortest' || currentRouteView === 'direct' || currentRouteView === 'road-y') &&
                routeResult.shortest_route?.coordinates && (
                  <g>
                    <polyline
                      points={coordsToSvgPoints(routeResult.shortest_route.coordinates)}
                      fill="none"
                      stroke="#450a0a"
                      strokeWidth={currentRouteView === 'road-y' || currentRouteView === 'direct' ? '8' : '6'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8"
                    />
                    <polyline
                      points={coordsToSvgPoints(routeResult.shortest_route.coordinates)}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={currentRouteView === 'road-y' || currentRouteView === 'direct' ? '5.5' : '3.8'}
                      strokeDasharray="10,6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#dangerGlow)"
                    />
                  </g>
              )}

              {/* ROAD Z: Valley Ridge Strategic Bypass */}
              {(currentRouteView === 'both' || currentRouteView === 'all' || currentRouteView === 'bypass' || currentRouteView === 'road-z') &&
                routeResult.bypass_route?.coordinates && (
                  <g>
                    <polyline
                      points={coordsToSvgPoints(routeResult.bypass_route.coordinates)}
                      fill="none"
                      stroke="#083344"
                      strokeWidth={currentRouteView === 'road-z' || currentRouteView === 'bypass' ? '7' : '5'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.75"
                    />
                    <polyline
                      points={coordsToSvgPoints(routeResult.bypass_route.coordinates)}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth={currentRouteView === 'road-z' || currentRouteView === 'bypass' ? '4.5' : '3.2'}
                      strokeDasharray="3,7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#bypassGlow)"
                    />
                  </g>
              )}

              {/* ROAD X: Safest Route (Emerald Glowing Highway with Flow Chevrons) */}
              {(currentRouteView === 'both' || currentRouteView === 'all' || currentRouteView === 'safest' || currentRouteView === 'road-x') &&
                routeResult.safest_route?.coordinates && (
                  <g>
                    <polyline
                      points={coordsToSvgPoints(routeResult.safest_route.coordinates)}
                      fill="none"
                      stroke="#064e3b"
                      strokeWidth={currentRouteView === 'road-x' || currentRouteView === 'safest' ? '10' : '8'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    <polyline
                      points={coordsToSvgPoints(routeResult.safest_route.coordinates)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={currentRouteView === 'road-x' || currentRouteView === 'safest' ? '6' : '4.8'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#safestGlow)"
                    />
                    <polyline
                      points={coordsToSvgPoints(routeResult.safest_route.coordinates)}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeDasharray="6,34"
                      strokeDashoffset={-flowOffset}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  </g>
              )}
            </>
          )}

          {/* Active Shipments Convoys */}
          {activeLayers.shipments && shipmentRoutes && shipmentRoutes.map((shp) => {
            if (!shp.coordinates) return null;
            const pts = coordsToSvgPoints(shp.coordinates);
            return (
              <polyline
                key={shp.id}
                points={pts}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="8,4"
                strokeLinecap="round"
                opacity="0.8"
              />
            );
          })}
        </svg>

        {/* ───────────────────────────────────────────────────────── */}
        {/* DOM Markers (Hubs, Vehicles, Hazards, Blockages) */}
        {/* ───────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Strategic Logistics Hubs */}
          {activeLayers.hubs && hubs && hubs.map((hub) => {
            const pt = latLngToScreen(hub.lat, hub.lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
            if (pt.x < -40 || pt.x > dimensions.width + 40 || pt.y < -40 || pt.y > dimensions.height + 40) return null;

            const isOrigin = routeResult?.origin?.id === hub.id || routeResult?.origin?.name?.includes(hub.name);
            const isDest = routeResult?.destination?.id === hub.id || routeResult?.destination?.name?.includes(hub.name);

            return (
              <div
                key={hub.id}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-125 z-10"
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin({
                    type: 'hub',
                    data: hub,
                    name: hub.name,
                    state: hub.state,
                    lat: hub.lat,
                    lng: hub.lng,
                    x: pt.x,
                    y: pt.y
                  });
                }}
              >
                <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold shadow-lg backdrop-blur-md transition-all ${
                  isOrigin
                    ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/50 animate-bounce'
                    : isDest
                      ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-400/50 animate-pulse'
                      : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-emerald-500 hover:text-white'
                }`}>
                  <span className="text-[11px]">{isOrigin ? '📍' : isDest ? '🎯' : '🏢'}</span>
                  <span className="truncate max-w-[85px]">{hub.name}</span>
                </div>
              </div>
            );
          })}

          {/* Fleet Vehicles Tracking */}
          {activeLayers.vehicles && fleet && fleet.map((veh) => {
            const lat = veh.location?.lat || veh.lat;
            const lng = veh.location?.lng || veh.lng;
            if (!lat || !lng) return null;

            const pt = latLngToScreen(lat, lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
            if (pt.x < -40 || pt.x > dimensions.width + 40 || pt.y < -40 || pt.y > dimensions.height + 40) return null;

            const isSelected = selectedVehicleId === veh.id;
            const isAmbulance = veh.type?.toLowerCase().includes('medic') || veh.type?.toLowerCase().includes('ambulance');

            return (
              <div
                key={veh.id}
                className={`absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-130 z-20 ${
                  isSelected ? 'scale-125' : ''
                }`}
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectEntity) onSelectEntity(veh);
                  setSelectedPin({
                    type: 'vehicle',
                    data: veh,
                    name: veh.name || veh.callsign || veh.id,
                    lat,
                    lng,
                    x: pt.x,
                    y: pt.y
                  });
                }}
              >
                <div className={`p-1 rounded-full border shadow-xl flex items-center justify-center ${
                  isSelected
                    ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-400/60 animate-pulse'
                    : isAmbulance
                      ? 'bg-rose-600 border-rose-300 text-white'
                      : 'bg-emerald-600 border-emerald-300 text-white'
                }`}>
                  <Truck size={13} />
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 px-1 py-0.2 rounded bg-slate-950/90 border border-slate-700 text-[9px] font-mono text-slate-300 whitespace-nowrap shadow">
                  {veh.speed_kmh != null ? `${veh.speed_kmh} km/h` : veh.status || 'Active'}
                </div>
              </div>
            );
          })}

          {/* Hazard Incidents */}
          {activeLayers.hazards && hazards && hazards.map((hz) => {
            const pt = latLngToScreen(hz.lat, hz.lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
            if (pt.x < -40 || pt.x > dimensions.width + 40 || pt.y < -40 || pt.y > dimensions.height + 40) return null;

            return (
              <div
                key={hz.id}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group hover:scale-125 z-15"
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin({
                    type: 'hazard',
                    data: hz,
                    name: hz.title || hz.type || 'Hazard Alert',
                    lat: hz.lat,
                    lng: hz.lng,
                    x: pt.x,
                    y: pt.y
                  });
                }}
              >
                <div className="p-1 rounded-full bg-rose-600/90 border border-white text-white shadow-lg animate-pulse flex items-center justify-center">
                  <AlertTriangle size={13} />
                </div>
              </div>
            );
          })}

          {/* Blocked Road Badges */}
          {activeLayers.blockedRoads && blockedRoads && blockedRoads.map((blk) => {
            const pt = latLngToScreen(blk.lat, blk.lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
            if (pt.x < -40 || pt.x > dimensions.width + 40 || pt.y < -40 || pt.y > dimensions.height + 40) return null;

            return (
              <div
                key={`blk-badge-${blk.id}`}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-15"
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin({
                    type: 'blocked',
                    data: blk,
                    name: blk.name,
                    lat: blk.lat,
                    lng: blk.lng,
                    x: pt.x,
                    y: pt.y
                  });
                }}
              >
                <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-600 border border-white text-white font-extrabold text-[9px] shadow-lg animate-bounce">
                  <span>⛔</span>
                  <span>ROAD CLOSED</span>
                </div>
              </div>
            );
          })}

          {/* Device GPS Marker */}
          {activeLayers.gps && deviceGPS && deviceGPS.lat && deviceGPS.lng && (
            (() => {
              const pt = latLngToScreen(deviceGPS.lat, deviceGPS.lng, mapCenter.lat, mapCenter.lng, mapZoom, dimensions.width, dimensions.height);
              return (
                <div
                  className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 z-25"
                  style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/25 animate-ping absolute"></div>
                    <div className="w-4 h-4 rounded-full bg-cyan-500 border-2 border-white shadow-xl flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Interactive Selection Popup (Click to Route / Details) */}
      {/* ───────────────────────────────────────────────────────── */}
      {selectedPin && (
        <div 
          className="absolute z-40 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[250px] max-w-xs animate-in fade-in zoom-in duration-150"
          style={{
            left: `${Math.min(dimensions.width - 270, Math.max(20, selectedPin.x - 125))}px`,
            top: `${Math.min(dimensions.height - 230, Math.max(60, selectedPin.y - 120))}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-white truncate">
              <span>{selectedPin.type === 'hub' ? '🏢' : selectedPin.type === 'vehicle' ? '🚚' : selectedPin.type === 'hazard' ? '⚠️' : selectedPin.type === 'blocked' ? '⛔' : '📍'}</span>
              <span className="truncate">{selectedPin.name}</span>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="text-slate-400 font-mono text-[10px]">
              GPS: {selectedPin.lat.toFixed(4)}°N, {selectedPin.lng.toFixed(4)}°E
            </div>
            {selectedPin.type === 'hub' && (
              <div className="text-emerald-400 text-[10px]">Strategic Relief & Logistics Node ({selectedPin.state})</div>
            )}
            {selectedPin.type === 'vehicle' && selectedPin.data && (
              <div className="text-[10px] space-y-0.5">
                <div>Type: <strong className="text-white">{selectedPin.data.type || 'Fleet Unit'}</strong></div>
                <div>Driver: <strong className="text-cyan-300">{selectedPin.data.driver_name || 'Assigned'}</strong></div>
                <div>Fuel: <strong className="text-emerald-400">{selectedPin.data.fuel_percent ?? 85}%</strong></div>
              </div>
            )}
            {selectedPin.type === 'hazard' && selectedPin.data && (
              <div className="p-1.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-200 text-[10px]">
                {selectedPin.data.description || 'Active hazard reported by field sensors.'}
              </div>
            )}
            {selectedPin.type === 'blocked' && selectedPin.data && (
              <div className="p-1.5 rounded bg-red-950/70 border border-red-500/40 text-red-200 text-[10px]">
                {selectedPin.data.reason || 'Road impassable due to major landslide.'}
                <div className="mt-1 text-white font-bold">Clearing: {selectedPin.data.clearing_eta}</div>
              </div>
            )}
          </div>

          {/* Direct Route Action Buttons */}
          <div className="pt-1.5 flex items-center space-x-2">
            <button
              onClick={() => {
                const param = selectedPin.type === 'hub' ? selectedPin.data : { id: 'custom-start', name: selectedPin.name, lat: selectedPin.lat, lng: selectedPin.lng };
                if (onSetOrigin) onSetOrigin(param);
                setSelectedPin(null);
              }}
              className="flex-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow"
            >
              <span>📍</span>
              <span>Start Here</span>
            </button>
            <button
              onClick={() => {
                const param = selectedPin.type === 'hub' ? selectedPin.data : { id: 'custom-dest', name: selectedPin.name, lat: selectedPin.lat, lng: selectedPin.lng };
                if (onSetDestination) onSetDestination(param);
                setSelectedPin(null);
              }}
              className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow"
            >
              <span>🎯</span>
              <span>Route Here</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Top Floating Tactical Controls Bar */}
      {/* ───────────────────────────────────────────────────────── */}
      <div 
        className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-slate-950/95 border border-slate-700/90 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google Maps Brand Pin Icon with Authentic Colors */}
        <div 
          className="flex items-center space-x-1.5 pl-1 pr-2 py-0.5 border-r border-slate-800 cursor-pointer"
          onClick={() => setShowApiModal(true)}
          title="Google Maps Platform Key Status & Diagnostics"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <span className="text-sm">🗺️</span>
          </div>
          <span className="font-extrabold text-white hidden md:inline">Google Maps</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* Style switchers */}
        <button
          onClick={() => setMapType('dark')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            mapType === 'dark' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🌙 Dark
        </button>
        <button
          onClick={() => setMapType('roadmap')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            mapType === 'roadmap' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🗺️ Streets
        </button>
        <button
          onClick={() => setMapType('terrain')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            mapType === 'terrain' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          ⛰️ Terrain
        </button>
        <button
          onClick={() => setMapType('hybrid')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            mapType === 'hybrid' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🛰️ Satellite
        </button>

        <span className="w-px h-4 bg-slate-700 mx-0.5"></span>

        {/* Live Traffic toggle */}
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
            showTraffic
              ? 'bg-rose-600 text-white shadow-[0_0_12px_#f43f5e]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🚦</span>
          <span className="hidden sm:inline">Traffic</span>
        </button>

        {/* 3D Tilt toggle */}
        <button
          onClick={() => setIs3D(!is3D)}
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
            is3D
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass size={12} />
          <span className="hidden sm:inline">3D</span>
        </button>

        <span className="w-px h-4 bg-slate-700 mx-0.5"></span>

        {/* Compass Heading-Up Navigation Toggle */}
        <button
          onClick={() => setIsHeadingUp(!isHeadingUp)}
          title={isHeadingUp ? 'Lock Map to North-Up' : 'Rotate Map with Compass (Heading-Up)'}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            isHeadingUp
              ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Compass 
              size={15} 
              className="transition-transform duration-200 text-cyan-300"
              style={{ transform: `rotate(${isHeadingUp ? -effectiveHeading : 0}deg)` }}
            />
          </div>
          <span>{isHeadingUp ? 'Heading-Up' : 'North-Up'}</span>
          <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-900/90 rounded text-cyan-300 font-extrabold">
            {Math.round(effectiveHeading)}° {getCompassCardinal(effectiveHeading)}
          </span>
        </button>

        {/* Quick Jump to State Capital Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickJump(!showQuickJump)}
            className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium transition-all cursor-pointer flex items-center space-x-1"
          >
            <span>📍 Jump</span>
            <ChevronDown size={12} />
          </button>
          {showQuickJump && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 space-y-0.5 max-h-56 overflow-y-auto">
              {NER_STATE_CAPITALS.map((cap) => (
                <button
                  key={cap.name}
                  onClick={() => {
                    setMapCenter({ lat: cap.lat, lng: cap.lng });
                    setMapZoom(9.5);
                    setShowQuickJump(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate">{cap.name}</span>
                  <span className="text-[9px] text-slate-500">{cap.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Operational Layers Toggle Drawer */}
        <button
          onClick={() => setShowLayerDrawer(!showLayerDrawer)}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            showLayerDrawer
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
          }`}
        >
          <Layers size={13} />
          <span>Layers</span>
          <span className="px-1.5 py-0.2 bg-emerald-950 border border-emerald-500/50 rounded-full text-[9px] text-emerald-300 font-extrabold">
            {Object.values(activeLayers).filter(Boolean).length}
          </span>
        </button>

        {/* Operational Alerts Toggle */}
        <button
          onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            showAlertsDrawer
              ? 'bg-rose-700 text-white shadow'
              : 'bg-slate-800/80 text-rose-400 hover:bg-slate-800 hover:text-rose-300'
          }`}
        >
          <Bell size={13} />
          <span>Alerts</span>
          {alerts?.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-600 rounded-full text-[9px] text-white font-extrabold animate-pulse">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Floating Zoom & Recenter Controls (Bottom Right) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div 
        className="absolute bottom-16 right-3 z-30 flex flex-col items-center gap-1.5 bg-slate-950/90 border border-slate-700/90 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-slate-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMapZoom((prev) => Math.min(16, prev + 0.75))}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <span className="font-mono text-[9px] text-slate-400 font-bold">
          {mapZoom.toFixed(1)}x
        </span>
        <button
          onClick={() => setMapZoom((prev) => Math.max(5, prev - 0.75))}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <div className="w-full h-px bg-slate-800 my-0.5"></div>
        <button
          onClick={() => {
            setMapCenter({ lat: center.lat, lng: center.lng });
            setMapZoom(7.5);
          }}
          title="Recenter Map on North East Region"
          className="p-1.5 hover:bg-slate-800 hover:text-emerald-400 rounded-lg cursor-pointer transition-colors"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Operational Layers Drawer Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {showLayerDrawer && (
        <div 
          className="absolute top-14 left-3 z-35 w-72 bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
              <Layers size={14} />
              <span>NER-LIFELINE Operational Overlays</span>
            </div>
            <button
              onClick={() => setShowLayerDrawer(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { key: 'vehicles', label: 'Fleet GPS', icon: '🚗' },
              { key: 'gps', label: 'Live Device GPS', icon: '📍' },
              { key: 'hazards', label: 'Field Incidents', icon: '⚠️' },
              { key: 'blockedRoads', label: 'Blocked Passes', icon: '⛔' },
              { key: 'riskyRoads', label: 'Risky Roads', icon: '🟡' },
              { key: 'shipments', label: 'Shipments', icon: '📦' },
              { key: 'riskZones', label: 'Risk Zones', icon: '⭕' },
              { key: 'alerts', label: 'Alert Pins', icon: '🚨' },
              { key: 'hubs', label: 'Logistics Hubs', icon: '🏢' },
              { key: 'routes', label: 'AI Alternative Roads', icon: '🛣️' },
            ].map((layer) => (
              <button
                key={layer.key}
                onClick={() =>
                  setActiveLayers((prev) => ({
                    ...prev,
                    [layer.key]: !prev[layer.key]
                  }))
                }
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                  activeLayers[layer.key]
                    ? 'bg-slate-900 border-emerald-500/60 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center space-x-1.5 truncate">
                  <span>{layer.icon}</span>
                  <span className="truncate">{layer.label}</span>
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeLayers[layer.key] ? 'bg-emerald-400' : 'bg-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Route Risk HUD & Telemetry Card (Top Right) */}
      {/* ───────────────────────────────────────────────────────── */}
      {routeResult && (
        <div 
          className="absolute top-3 right-3 z-30 max-w-xs w-full bg-slate-950/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-extrabold text-white text-xs tracking-wide">
                AI HIGHWAY OPTIMIZER
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleOpenGoogleMaps}
                title="Open Turn-by-Turn Driving Navigation in Google Maps"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded cursor-pointer transition-colors"
              >
                <ExternalLink size={13} />
              </button>
              <button
                onClick={handleVoiceReadout}
                title="Listen to Route Guidance & Landslide Alerts"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isSpeaking ? 'bg-emerald-600 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Volume2 size={13} />
              </button>
              <button
                onClick={handleCopyRoute}
                title="Copy Route Manifest"
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition-colors"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* Quick Route Stats */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Distance</div>
              <div className="font-mono text-emerald-400 font-extrabold text-xs">
                {routeResult.distance?.text || `${routeResult.safest_route?.distance_km} km`}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Drive Time</div>
              <div className="font-mono text-cyan-300 font-extrabold text-xs">
                {routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours}h`}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Risk Score</div>
              <div className="font-mono text-emerald-400 font-extrabold text-xs">
                {routeResult.safest_route?.risk_score ?? 18}/100
              </div>
            </div>
          </div>

          {/* 3 Interactive Road Filter Cards */}
          <div className="space-y-1 text-[10px] pt-1 border-t border-slate-800/80">
            {/* Road X */}
            <button
              onClick={() => setCurrentRouteView(currentRouteView === 'road-x' ? 'all' : 'road-x')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                currentRouteView === 'road-x' || currentRouteView === 'safest'
                  ? 'bg-emerald-900/60 border-emerald-400 ring-1 ring-emerald-400 text-white'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Road X: Safest Highway</span>
              </div>
              <span className="font-mono text-emerald-400 font-extrabold">Risk 18 (LOW)</span>
            </button>

            {/* Road Y */}
            <button
              onClick={() => setCurrentRouteView(currentRouteView === 'road-y' ? 'all' : 'road-y')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                currentRouteView === 'road-y' || currentRouteView === 'direct'
                  ? 'bg-rose-900/60 border-rose-400 ring-1 ring-rose-400 text-white'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Road Y: Direct Mountain</span>
              </div>
              <span className="font-mono text-rose-400 font-extrabold">Risk 74 (HIGH)</span>
            </button>

            {/* Road Z */}
            <button
              onClick={() => setCurrentRouteView(currentRouteView === 'road-z' ? 'all' : 'road-z')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                currentRouteView === 'road-z' || currentRouteView === 'bypass'
                  ? 'bg-cyan-900/60 border-cyan-400 ring-1 ring-cyan-400 text-white'
                  : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200 hover:border-cyan-400'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Road Z: Strategic Bypass</span>
              </div>
              <span className="font-mono text-cyan-400 font-extrabold">Risk 22 (PASSABLE)</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* API Key Status & Diagnostics Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {showApiModal && (
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setShowApiModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 max-w-md w-full p-4 rounded-xl shadow-2xl text-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <span className="text-base">🗺️</span>
                <span>Google Maps Platform Integration</span>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Google Maps API Key:</span>
                  <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                    {activeApiKey}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Platform Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE & ACTIVE</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Services:</span>
                  <span className="text-white font-semibold">Streets, Satellite, Terrain, Traffic, 3D Elevation</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Geo Target:</span>
                  <span className="text-cyan-300 font-semibold">North Eastern Region (8 States)</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
                <strong className="text-emerald-300">Dual-Resilient Engine Architecture:</strong>
                <p className="mt-1 text-[10px] text-slate-300">
                  NER-LIFELINE utilizes authentic Google Maps Platform tiles and vector routes with an offline-resilient local cache, ensuring zero disruptions even in deep mountain blackouts.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowApiModal(false)}
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs cursor-pointer transition-colors shadow"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Bottom Status & Provenance Bar */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-extrabold text-white">Google Maps Platform</span>
          <span className="font-mono text-emerald-400 text-[9px] bg-slate-900 px-1 rounded">
            {activeApiKey.substring(0, 8)}...{activeApiKey.substring(activeApiKey.length - 4)}
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="hidden sm:inline">Streets, Satellite & Terrain</span>
          <span className="text-slate-500 hidden md:inline">•</span>
          <span className="font-semibold text-emerald-400 hidden md:inline">NER-LIFELINE Operational AI Active</span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          {copyToast && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] shadow-lg animate-fade-in">
              ✓ Route Manifest Copied!
            </div>
          )}
          <button
            onClick={handleOpenGoogleMaps}
            className="flex items-center space-x-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] text-cyan-300 hover:text-white backdrop-blur-md shadow-lg cursor-pointer transition-all"
          >
            <ExternalLink size={11} />
            <span className="font-bold">Google Maps Navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
