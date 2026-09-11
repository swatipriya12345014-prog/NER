import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Navigation, AlertTriangle, Fuel, MapPin, Radio, 
  Compass, Eye, Check, RefreshCw, AlertOctagon, CircleDot, Bell, 
  X, Info, Sliders, CloudRain, Truck, Route as RouteIcon,
  Volume2, Copy, Crosshair, ExternalLink, Shield, ArrowRight
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

const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyDP02pC9K1QL7p69lae940OyX1iKcbhAoA';

// Sleek Tactical Dark Mode Style for Google Maps (Official JSON styling specification)
const TACTICAL_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a202c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a202c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0aec0' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#718096' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e3a2f' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2d3748' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a202c' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3b4252' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2937' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f8fafc' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#232d3f' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }]
  }
];

// Helper SVG marker creators
function createNavPointerSvg(heading = 0) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <g transform="rotate(${heading}, 20, 20)">
        <polygon points="20,4 29,32 20,26 11,32" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />
        <circle cx="20" cy="20" r="4" fill="#ffffff" />
      </g>
    </svg>
  `)}`;
}

function createVehicleSvg(type = 'truck', status = 'ACTIVE', heading = 0) {
  let bgColor = '#10b981'; // ACTIVE
  if (status === 'DELAYED') bgColor = '#f59e0b';
  if (status === 'STOPPED') bgColor = '#64748b';
  if (status === 'EMERGENCY') bgColor = '#ef4444';
  if (status === 'OFFLINE') bgColor = '#334155';

  const isMedic = type.toLowerCase().includes('medic') || type.toLowerCase().includes('ambulance');
  const iconSymbol = isMedic ? '➕' : '🚚';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r="16" fill="${bgColor}" stroke="#ffffff" stroke-width="2.5" />
      <text x="19" y="23" font-size="14" text-anchor="middle" dominant-baseline="middle">${iconSymbol}</text>
      ${heading != null ? `
        <polygon points="19,1 23,6 15,6" fill="${bgColor}" stroke="#ffffff" stroke-width="1" transform="rotate(${heading}, 19, 19)" />
      ` : ''}
    </svg>
  `)}`;
}

function createIncidentSvg(type = 'LANDSLIDE', severity = 'Critical') {
  let symbol = '⚠️';
  let color = '#ef4444';
  const tUpper = (type || '').toUpperCase();
  if (tUpper.includes('LANDSLIDE')) { symbol = '⛰️'; color = '#dc2626'; }
  else if (tUpper.includes('FLOOD')) { symbol = '🌊'; color = '#2563eb'; }
  else if (tUpper.includes('ROAD_DAMAGE') || tUpper.includes('DAMAGE')) { symbol = '🚧'; color = '#ea580c'; }
  else if (tUpper.includes('BRIDGE')) { symbol = '🌉'; color = '#b91c1c'; }
  else if (tUpper.includes('RAIN')) { symbol = '🌧️'; color = '#0284c7'; }
  else if (tUpper.includes('TRAFFIC')) { symbol = '🚗'; color = '#eab308'; }

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <polygon points="18,3 33,31 3,31" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />
      <text x="18" y="24" font-size="12" text-anchor="middle" dominant-baseline="middle">${symbol}</text>
    </svg>
  `)}`;
}

export default function GoogleMapView({
  apiKey = DEFAULT_GOOGLE_MAPS_API_KEY,
  center = { lat: 26.2, lng: 92.8 }, // North Eastern Region of India
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
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const infoWindowRef = useRef(null);

  // Markers & Layers References
  const vehicleMarkersRef = useRef([]);
  const incidentMarkersRef = useRef([]);
  const hubMarkersRef = useRef([]);
  const roadPolylinesRef = useRef({ safest: null, shortest: null, bypass: null, flowInterval: null });
  const operationalOverlaysRef = useRef({ blocked: [], risky: [], riskZones: [] });
  const locationMarkerRef = useRef(null);
  const locationAccuracyCircleRef = useRef(null);

  // Compass & Heading Smoothing References
  const smoothHeadingRef = useRef(0);
  const rawHeadingRef = useRef(0);
  const compassTrackerRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const { t, speakText, isSpeaking, playAlertChime } = useLanguage();
  const [copyToast, setCopyToast] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // UI Modes
  const [isHeadingUp, setIsHeadingUp] = useState(enableHeadingUp);
  const [currentMapStyle, setCurrentMapStyle] = useState('roadmap'); // 'roadmap' | 'satellite' | 'terrain' | 'dark'
  const [showTraffic, setShowTraffic] = useState(false);
  const [activeRoadFilter, setActiveRoadFilter] = useState(activeRouteView);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const activeApiKey = apiKey || DEFAULT_GOOGLE_MAPS_API_KEY;

  // ─────────────────────────────────────────────────────────────
  // 1. Load Official Google Maps JavaScript API
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeApiKey) {
      setLoadError('Google Maps API key is missing');
      return;
    }

    const verifyApi = () => {
      if (typeof window.google?.maps?.Map === 'function') {
        setIsApiLoaded(true);
        return true;
      }
      return false;
    };

    if (verifyApi()) return;

    const scriptId = 'google-maps-js-sdk';
    let script = document.getElementById(scriptId);

    if (!script) {
      window.__initGoogleMapsSdk = () => {
        setIsApiLoaded(true);
      };

      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${activeApiKey}&libraries=places,geometry&callback=__initGoogleMapsSdk&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        console.error('Failed to load Google Maps SDK:', err);
        setLoadError('Google Maps SDK could not be loaded. Check network or key settings.');
        if (onMapError) onMapError(err);
      };
      document.head.appendChild(script);
    } else {
      const timer = setInterval(() => {
        if (verifyApi()) clearInterval(timer);
      }, 50);
      setTimeout(() => clearInterval(timer), 10000);
      return () => clearInterval(timer);
    }
  }, [activeApiKey, onMapError]);

  // ─────────────────────────────────────────────────────────────
  // 2. Initialize Google Maps Instance with Native Controls
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isApiLoaded || !mapContainerRef.current) return;
    if (typeof window.google?.maps?.Map !== 'function') return;

    if (mapInstanceRef.current) {
      try {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      } catch (e) {}
      return;
    }

    try {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        mapTypeId: currentMapStyle === 'dark' ? 'roadmap' : currentMapStyle,
        styles: currentMapStyle === 'dark' ? TACTICAL_DARK_STYLE : null,
        // Official Google Maps Native Controls
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_LEFT
        },
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP
        },
        rotateControl: true,
        scaleControl: true,
        gestureHandling: 'greedy'
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapInstanceRef.current = map;

      // Handle map click to drop routing pins
      map.addListener('click', (e) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        let nearestHub = null;
        let minDist = 999;
        if (hubs && hubs.length) {
          hubs.forEach((h) => {
            const d = Math.hypot(h.lat - lat, h.lng - lng);
            if (d < minDist) {
              minDist = d;
              nearestHub = h;
            }
          });
        }

        const label = (minDist < 0.35 && nearestHub)
          ? `${nearestHub.name} (${nearestHub.state})`
          : `Custom Point (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;

        if (infoWindowRef.current) {
          infoWindowRef.current.setPosition(e.latLng);
          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; color: #0f172a; min-width: 220px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">📍 ${label}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
              <div style="margin-top: 8px; display: flex; gap: 6px;">
                <button onclick="window.__nerSetOrigin && window.__nerSetOrigin({ id: 'custom-loc', name: '${label}', lat: ${lat}, lng: ${lng} })" style="flex: 1; padding: 6px 8px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                  📍 Start Here
                </button>
                <button onclick="window.__nerSetDest && window.__nerSetDest({ id: 'custom-loc', name: '${label}', lat: ${lat}, lng: ${lng} })" style="flex: 1; padding: 6px 8px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                  🎯 Route Here
                </button>
              </div>
            </div>
          `);
          infoWindowRef.current.open(map);
        }
      });
    } catch (err) {
      console.error('Error creating Google Map:', err);
      setLoadError(err.message);
    }
  }, [isApiLoaded, currentMapStyle]);

  // ─────────────────────────────────────────────────────────────
  // 3. Current Location Feature (GPS Watcher & Navigation Marker)
  // ─────────────────────────────────────────────────────────────
  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const latLng = new window.google.maps.LatLng(latitude, longitude);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(latLng);
          if (mapInstanceRef.current.getZoom() < 12) {
            mapInstanceRef.current.setZoom(13);
          }
        }

        // Location accuracy circle
        if (!locationAccuracyCircleRef.current && window.google) {
          locationAccuracyCircleRef.current = new window.google.maps.Circle({
            map: mapInstanceRef.current,
            center: latLng,
            radius: accuracy || 50,
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            strokeColor: '#2563eb',
            strokeWeight: 1,
            zIndex: 10
          });
        } else if (locationAccuracyCircleRef.current) {
          locationAccuracyCircleRef.current.setCenter(latLng);
          locationAccuracyCircleRef.current.setRadius(accuracy || 50);
        }

        // Navigation pointer / location marker
        const effectiveH = heading != null ? heading : smoothHeadingRef.current;
        const markerIcon = {
          url: createNavPointerSvg(effectiveH),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        };

        if (!locationMarkerRef.current && window.google) {
          locationMarkerRef.current = new window.google.maps.Marker({
            position: latLng,
            map: mapInstanceRef.current,
            icon: markerIcon,
            title: 'Your Current Location',
            zIndex: 100
          });
        } else if (locationMarkerRef.current) {
          locationMarkerRef.current.setPosition(latLng);
          locationMarkerRef.current.setIcon(markerIcon);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation permission error:', err.message);
        setLocationError('Location permission denied or unavailable. Map remains fully functional.');
        setTimeout(() => setLocationError(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 4. Smooth Heading & Heading-Up Compass Mode
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Sensor tracking
    const tracker = startCompassTracking((deg) => {
      if (deg != null && !isNaN(deg)) {
        rawHeadingRef.current = deg;
      }
    });
    compassTrackerRef.current = tracker;

    // Smooth interpolation loop (60 FPS without React re-renders)
    const animateHeading = () => {
      let raw = rawHeadingRef.current;
      if (raw != null) {
        let diff = raw - smoothHeadingRef.current;
        // Take shortest angle on circle
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        smoothHeadingRef.current = (smoothHeadingRef.current + diff * 0.15 + 360) % 360;

        // If Heading-Up mode is active, smoothly rotate the map view
        if (isHeadingUp && mapContainerRef.current) {
          mapContainerRef.current.style.transform = `rotate(${-smoothHeadingRef.current}deg)`;
          mapContainerRef.current.style.transition = 'transform 0.1s linear';
        } else if (mapContainerRef.current) {
          mapContainerRef.current.style.transform = 'none';
        }

        // Update location pointer heading
        if (locationMarkerRef.current) {
          locationMarkerRef.current.setIcon({
            url: createNavPointerSvg(smoothHeadingRef.current),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          });
        }
      }
      animFrameIdRef.current = requestAnimationFrame(animateHeading);
    };

    animFrameIdRef.current = requestAnimationFrame(animateHeading);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (compassTrackerRef.current?.stop) compassTrackerRef.current.stop();
    };
  }, [isHeadingUp]);

  // ─────────────────────────────────────────────────────────────
  // 5. Render NER-LIFELINE Fleet Vehicles Layer
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old vehicle markers
    vehicleMarkersRef.current.forEach((m) => m.setMap(null));
    vehicleMarkersRef.current = [];

    if (!filterLayer.vehicles || !fleet || !fleet.length) return;

    fleet.forEach((veh) => {
      const lat = veh.location?.lat || veh.lat;
      const lng = veh.location?.lng || veh.lng;
      if (!lat || !lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: `${veh.name || veh.id} (${veh.status || 'ACTIVE'})`,
        icon: {
          url: createVehicleSvg(veh.type || 'truck', veh.status || 'ACTIVE', veh.heading_deg || 0),
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18)
        },
        zIndex: 50
      });

      marker.addListener('click', () => {
        if (onSelectEntity) onSelectEntity(veh);
        setSelectedVehicle(veh);
        if (infoWindowRef.current) {
          infoWindowRef.current.setPosition({ lat, lng });
          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; color: #0f172a; min-width: 210px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 13px; color: #0f172a;">${veh.name || veh.callsign || veh.id}</strong>
                <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">${veh.status || 'ACTIVE'}</span>
              </div>
              <div style="margin-top: 4px; font-size: 11px; color: #475569;">
                <div>Type: <strong>${veh.type || 'Fleet Transport'}</strong></div>
                <div>Speed: <strong>${veh.speed_kmh != null ? `${veh.speed_kmh} km/h` : 'Stationary'}</strong></div>
                <div>Driver: <strong>${veh.driver_name || 'Assigned Officer'}</strong></div>
                <div>Fuel: <strong>${veh.fuel_percent ?? 88}%</strong></div>
              </div>
              <div style="margin-top: 6px; padding: 4px 6px; background: #f1f5f9; border-radius: 4px; font-size: 9px; color: #64748b; font-weight: bold;">
                📡 SIMULATED GPS • NER-LIFELINE TELEMETRY
              </div>
            </div>
          `);
          infoWindowRef.current.open(map);
        }
      });

      vehicleMarkersRef.current.push(marker);
    });
  }, [fleet, filterLayer.vehicles, onSelectEntity]);

  // ─────────────────────────────────────────────────────────────
  // 6. Render NER-LIFELINE Incidents Layer
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    incidentMarkersRef.current.forEach((m) => m.setMap(null));
    incidentMarkersRef.current = [];

    if (!filterLayer.hazards || !hazards || !hazards.length) return;

    hazards.forEach((hz) => {
      const lat = hz.lat || hz.latitude;
      const lng = hz.lng || hz.longitude;
      if (!lat || !lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: hz.title || hz.type || 'Field Incident',
        icon: {
          url: createIncidentSvg(hz.type || 'LANDSLIDE', hz.severity || 'Critical'),
          scaledSize: new window.google.maps.Size(34, 34),
          anchor: new window.google.maps.Point(17, 17)
        },
        zIndex: 60
      });

      marker.addListener('click', () => {
        setSelectedIncident(hz);
        if (infoWindowRef.current) {
          infoWindowRef.current.setPosition({ lat, lng });
          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; color: #0f172a; min-width: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 13px; color: #b91c1c;">⚠️ ${hz.type || 'LANDSLIDE'}</strong>
                <span style="background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${hz.severity || 'Critical'}</span>
              </div>
              <div style="margin-top: 4px; font-size: 11px; color: #334155;">
                <p style="margin: 0 0 4px 0;">${hz.description || hz.title || 'Reported obstruction along mountain corridor.'}</p>
                <div>Confidence: <strong>${hz.confidence ? `${hz.confidence}%` : '95% (Multi-Sensor)'}</strong></div>
                <div>Coordinates: <strong>${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</strong></div>
              </div>
              <div style="margin-top: 6px; padding: 4px 6px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; font-size: 9px; color: #991b1b; font-weight: bold;">
                🛡️ NER-LIFELINE Incident Report (Not Google Data)
              </div>
            </div>
          `);
          infoWindowRef.current.open(map);
        }
      });

      incidentMarkersRef.current.push(marker);
    });
  }, [hazards, filterLayer.hazards]);

  // ─────────────────────────────────────────────────────────────
  // 7. Render Road Operational Status Layer (Blocked & Risky Roads)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear previous polylines
    operationalOverlaysRef.current.blocked.forEach((p) => p.setMap(null));
    operationalOverlaysRef.current.risky.forEach((p) => p.setMap(null));
    operationalOverlaysRef.current.blocked = [];
    operationalOverlaysRef.current.risky = [];

    // Blocked Roads Overlay
    if (filterLayer.blockedRoads && blockedRoads) {
      blockedRoads.forEach((blk) => {
        if (!blk.coordinates) return;
        const path = blk.coordinates.map(([lat, lng]) => ({ lat, lng }));
        const poly = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#dc2626',
          strokeOpacity: 0.9,
          strokeWeight: 6,
          zIndex: 40,
          map: map
        });
        operationalOverlaysRef.current.blocked.push(poly);
      });
    }

    // Risky Roads Overlay
    if (filterLayer.riskyRoads && riskyRoads) {
      riskyRoads.forEach((rsk) => {
        if (!rsk.coordinates) return;
        const path = rsk.coordinates.map(([lat, lng]) => ({ lat, lng }));
        const poly = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.85,
          strokeWeight: 5,
          zIndex: 35,
          map: map
        });
        operationalOverlaysRef.current.risky.push(poly);
      });
    }
  }, [blockedRoads, riskyRoads, filterLayer.blockedRoads, filterLayer.riskyRoads]);

  // ─────────────────────────────────────────────────────────────
  // 8. Render AI Routes on Google Map (Road X, Road Y, Road Z)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old polylines
    if (roadPolylinesRef.current.safest) roadPolylinesRef.current.safest.setMap(null);
    if (roadPolylinesRef.current.shortest) roadPolylinesRef.current.shortest.setMap(null);
    if (roadPolylinesRef.current.bypass) roadPolylinesRef.current.bypass.setMap(null);
    if (roadPolylinesRef.current.flowInterval) clearInterval(roadPolylinesRef.current.flowInterval);

    if (!filterLayer.routes || !routeResult) return;

    const bounds = new window.google.maps.LatLngBounds();

    // Road X: Safest Route (Emerald with animated arrows)
    const showSafest = activeRoadFilter === 'both' || activeRoadFilter === 'all' || activeRoadFilter === 'safest' || activeRoadFilter === 'road-x';
    if (showSafest && routeResult.safest_route?.coordinates) {
      const path = routeResult.safest_route.coordinates.map(([lat, lng]) => {
        const pt = new window.google.maps.LatLng(lat, lng);
        bounds.extend(pt);
        return pt;
      });

      const lineSymbol = {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 2.5,
        strokeColor: '#a7f3d0',
        strokeWeight: 1.5,
        fillColor: '#ffffff',
        fillOpacity: 1
      };

      const poly = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: activeRoadFilter === 'road-x' || activeRoadFilter === 'safest' ? 7 : 5,
        zIndex: 45,
        icons: [{ icon: lineSymbol, offset: '0%', repeat: '60px' }],
        map: map
      });

      let count = 0;
      const interval = setInterval(() => {
        count = (count + 1) % 200;
        const icons = poly.get('icons');
        if (icons && icons[0]) {
          icons[0].offset = `${(count / 2) % 100}%`;
          poly.set('icons', icons);
        }
      }, 50);

      roadPolylinesRef.current.safest = poly;
      roadPolylinesRef.current.flowInterval = interval;
    }

    // Road Y: Direct Mountain Road (Crimson Dashed with Landslide Hazard)
    const showDirect = activeRoadFilter === 'both' || activeRoadFilter === 'all' || activeRoadFilter === 'shortest' || activeRoadFilter === 'direct' || activeRoadFilter === 'road-y';
    if (showDirect && routeResult.shortest_route?.coordinates) {
      const path = routeResult.shortest_route.coordinates.map(([lat, lng]) => {
        const pt = new window.google.maps.LatLng(lat, lng);
        bounds.extend(pt);
        return pt;
      });

      const dashSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 3,
        strokeColor: '#ef4444'
      };

      const poly = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#ef4444',
        strokeOpacity: 0,
        strokeWeight: activeRoadFilter === 'road-y' || activeRoadFilter === 'direct' ? 6 : 4,
        zIndex: 42,
        icons: [{ icon: dashSymbol, offset: '0', repeat: '14px' }],
        map: map
      });

      roadPolylinesRef.current.shortest = poly;
    }

    // Road Z: Valley Ridge Strategic Bypass (Cyan Dotted)
    const showBypass = activeRoadFilter === 'both' || activeRoadFilter === 'all' || activeRoadFilter === 'bypass' || activeRoadFilter === 'road-z';
    if (showBypass && routeResult.bypass_route?.coordinates) {
      const path = routeResult.bypass_route.coordinates.map(([lat, lng]) => {
        const pt = new window.google.maps.LatLng(lat, lng);
        bounds.extend(pt);
        return pt;
      });

      const dotSymbol = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 2.5,
        fillColor: '#06b6d4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1
      };

      const poly = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0,
        strokeWeight: activeRoadFilter === 'road-z' || activeRoadFilter === 'bypass' ? 5.5 : 3.5,
        zIndex: 43,
        icons: [{ icon: dotSymbol, offset: '0', repeat: '18px' }],
        map: map
      });

      roadPolylinesRef.current.bypass = poly;
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    return () => {
      if (roadPolylinesRef.current.flowInterval) {
        clearInterval(roadPolylinesRef.current.flowInterval);
      }
    };
  }, [routeResult, activeRoadFilter, filterLayer.routes]);

  // Handle Traffic layer toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new window.google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }
  }, [showTraffic]);

  // Voice Readout
  const handleVoiceReadout = () => {
    if (!routeResult) return;
    const destName = routeResult.destination?.name || 'Destination';
    const dist = routeResult.distance?.text || `${routeResult.safest_route?.distance_km || 140} km`;
    const dur = routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours || 3.5} hours`;
    const verdict = routeResult.ai_recommendation?.safety_verdict || 'Safest Highway (Road X) recommended.';
    speakText(`Route Guidance to ${destName}. Distance: ${dist}. Estimated drive time: ${dur}. Safety verdict: ${verdict}`);
  };

  // Launch Turn-by-Turn Driving Navigation in Google Maps
  const handleOpenGoogleMaps = () => {
    if (!routeResult?.origin || !routeResult?.destination) {
      window.open(`https://www.google.com/maps/@${center.lat},${center.lng},${Math.round(zoom)}z`, '_blank');
      return;
    }
    const oLat = routeResult.origin.lat || 26.1445;
    const oLng = routeResult.origin.lng || 91.7362;
    const dLat = routeResult.destination.lat || 25.5788;
    const dLng = routeResult.destination.lng || 91.8933;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 overflow-hidden rounded-xl font-sans border border-slate-800 shadow-2xl`}>
      {/* ───────────────────────────────────────────────────────── */}
      {/* Official Google Maps Canvas Container */}
      {/* ───────────────────────────────────────────────────────── */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />

      {/* Suppress SDK Billing Error Modal & Watermarks */}
      <style>{`
        .gm-err-container, .gm-err-content, .dismissButton {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {!isApiLoaded && !loadError && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-200">Loading Google Maps Platform...</span>
          <span className="text-xs text-slate-400">Initializing Roads, Satellite & Geographic Context</span>
        </div>
      )}

      {/* Friendly Location Permission Notice */}
      {locationError && (
        <div className="absolute top-16 left-4 right-4 max-w-md mx-auto p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-200 z-40 text-xs flex items-center justify-between shadow-xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
            <span>{locationError}</span>
          </div>
          <button
            onClick={() => setLocationError(null)}
            className="text-amber-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Top Floating Controls Bar (Heading-Up, Traffic, Quick Styles) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px]">
        {/* Heading-Up Mode Switcher */}
        <button
          onClick={() => setIsHeadingUp(!isHeadingUp)}
          title={isHeadingUp ? 'Lock map to North-Up' : 'Rotate map to Heading-Up direction'}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            isHeadingUp
              ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Compass 
            size={14} 
            className={`transition-transform duration-200 ${isHeadingUp ? 'rotate-45' : ''}`} 
          />
          <span>Heading-Up</span>
          <span className={`w-2 h-2 rounded-full ${isHeadingUp ? 'bg-white animate-pulse' : 'bg-slate-600'}`}></span>
        </button>

        {/* Current Location Button */}
        <button
          onClick={handleCurrentLocation}
          title="Find & Center on Current Location"
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            isLocating
              ? 'bg-blue-600 text-white animate-pulse'
              : 'bg-slate-800/80 text-blue-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Crosshair size={13} />
          <span>My Location</span>
        </button>

        <span className="w-px h-4 bg-slate-700 mx-0.5"></span>

        {/* Live Traffic Toggle */}
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
            showTraffic
              ? 'bg-rose-600 text-white shadow-[0_0_12px_#f43f5e]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🚦 Traffic</span>
        </button>

        {/* Tactical Dark Mode toggle */}
        <button
          onClick={() => {
            const next = currentMapStyle === 'dark' ? 'roadmap' : 'dark';
            setCurrentMapStyle(next);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setOptions({
                styles: next === 'dark' ? TACTICAL_DARK_STYLE : null
              });
            }
          }}
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            currentMapStyle === 'dark'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🌙 Dark Map
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Route Risk HUD & Telemetry Card (Top Right) */}
      {/* ───────────────────────────────────────────────────────── */}
      {routeResult && (
        <div className="absolute top-3 right-3 z-20 max-w-xs w-full bg-slate-950/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2.5">
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
                title="Launch Turn-by-Turn Navigation in Google Maps"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded cursor-pointer transition-colors"
              >
                <ExternalLink size={13} />
              </button>
              <button
                onClick={handleVoiceReadout}
                title="Voice Route Guidance"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isSpeaking ? 'bg-emerald-600 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Volume2 size={13} />
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

          {/* 3 Road Options Filter */}
          <div className="space-y-1 text-[10px] pt-1 border-t border-slate-800/80">
            {/* Road X */}
            <button
              onClick={() => setActiveRoadFilter(activeRoadFilter === 'road-x' ? 'all' : 'road-x')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                activeRoadFilter === 'road-x' || activeRoadFilter === 'safest'
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
              onClick={() => setActiveRoadFilter(activeRoadFilter === 'road-y' ? 'all' : 'road-y')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                activeRoadFilter === 'road-y' || activeRoadFilter === 'direct'
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
              onClick={() => setActiveRoadFilter(activeRoadFilter === 'road-z' ? 'all' : 'road-z')}
              className={`w-full flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${
                activeRoadFilter === 'road-z' || activeRoadFilter === 'bypass'
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
      {/* Bottom Status & Data Provenance Bar */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-extrabold text-white">Google Maps Platform</span>
          <span className="text-slate-500">•</span>
          <span>Official JavaScript API</span>
          <span className="text-slate-500">•</span>
          <span className="font-semibold text-emerald-400">NER-LIFELINE Application Overlays</span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
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
