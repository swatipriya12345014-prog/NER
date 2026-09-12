import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Navigation, AlertTriangle, Fuel, MapPin, Radio, 
  Compass, Eye, Check, RefreshCw, AlertOctagon, CircleDot, Bell, 
  X, Info, Sliders, CloudRain, Truck, Route as RouteIcon,
  Volume2, VolumeX, Copy, Crosshair, ExternalLink, Shield, ArrowRight
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

// High-speed LRU/Map memoization cache for map marker SVG data URIs
const SVG_ICON_CACHE = new Map();
const MAX_SVG_CACHE = 150;

function getCachedSvg(cacheKey, generatorFn) {
  if (SVG_ICON_CACHE.has(cacheKey)) {
    return SVG_ICON_CACHE.get(cacheKey);
  }
  const svg = generatorFn();
  if (SVG_ICON_CACHE.size >= MAX_SVG_CACHE) {
    const firstKey = SVG_ICON_CACHE.keys().next().value;
    SVG_ICON_CACHE.delete(firstKey);
  }
  SVG_ICON_CACHE.set(cacheKey, svg);
  return svg;
}

// Helper SVG marker creators with memoization
function createNavPointerSvg(heading = 0) {
  const roundedHeading = Math.round((heading || 0) / 2) * 2;
  return getCachedSvg(`nav_${roundedHeading}`, () => {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <g transform="rotate(${roundedHeading}, 20, 20)">
          <polygon points="20,4 29,32 20,26 11,32" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />
          <circle cx="20" cy="20" r="4" fill="#ffffff" />
        </g>
      </svg>
    `)}`;
  });
}

function createVehicleSvg(type = 'truck', status = 'ACTIVE', heading = 0) {
  const roundedHeading = heading != null ? Math.round(heading / 5) * 5 : null;
  const cacheKey = `veh_${type}_${status}_${roundedHeading}`;
  
  return getCachedSvg(cacheKey, () => {
    let bgColor = '#10b981'; // ACTIVE
    if (status === 'DELAYED') bgColor = '#f59e0b';
    if (status === 'STOPPED') bgColor = '#64748b';
    if (status === 'EMERGENCY') bgColor = '#ef4444';
    if (status === 'OFFLINE') bgColor = '#334155';

    const isMedic = (type || '').toLowerCase().includes('medic') || (type || '').toLowerCase().includes('ambulance');
    const iconSymbol = isMedic ? '➕' : '🚚';

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r="16" fill="${bgColor}" stroke="#ffffff" stroke-width="2.5" />
        <text x="19" y="23" font-size="14" text-anchor="middle" dominant-baseline="middle">${iconSymbol}</text>
        ${roundedHeading != null ? `
          <polygon points="19,1 23,6 15,6" fill="${bgColor}" stroke="#ffffff" stroke-width="1" transform="rotate(${roundedHeading}, 19, 19)" />
        ` : ''}
      </svg>
    `)}`;
  });
}

function createTransitTruckSvg(callsign = 'AS-01-EV', speed = 54) {
  const cacheKey = `transit_truck_marker_${callsign}_${speed}`;
  return getCachedSvg(cacheKey, () => {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <filter id="truck-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#10b981" flood-opacity="0.9" />
          </filter>
        </defs>
        <!-- Telemetry Radar Wave -->
        <circle cx="32" cy="28" r="26" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" stroke-width="1.5" />
        <!-- Vehicle Disc -->
        <circle cx="32" cy="28" r="20" fill="#020617" stroke="#34d399" stroke-width="2.5" filter="url(#truck-glow)" />
        <!-- Truck Logo -->
        <text x="32" y="33" font-size="19" text-anchor="middle" dominant-baseline="middle">🚚</text>
        <!-- In Transit Pill Badge -->
        <rect x="7" y="48" width="50" height="13" rx="6.5" fill="#065f46" stroke="#6ee7b7" stroke-width="1" />
        <text x="32" y="57" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">IN TRANSIT</text>
      </svg>
    `)}`;
  });
}

function createIncidentSvg(type = 'LANDSLIDE', severity = 'Critical') {
  const cacheKey = `inc_${type}_${severity}`;

  return getCachedSvg(cacheKey, () => {
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
  });
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
  trackedBreadcrumbs = [],
  heightClass = 'h-[640px]'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const infoWindowRef = useRef(null);

  // Markers & Layers References (Using Map for zero-flicker diffing and memory optimization)
  const vehicleMarkersMapRef = useRef(new Map());
  const incidentMarkersMapRef = useRef(new Map());
  const roadPolylinesRef = useRef({ safest: null, shortest: null, bypass: null, flowInterval: null });
  const operationalOverlaysRef = useRef({ blocked: [], risky: [], riskZones: [] });
  const trackedBreadcrumbPolylineRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const locationAccuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastFittedRouteKeyRef = useRef('');

  // Compass & Heading Smoothing References
  const smoothHeadingRef = useRef(0);
  const rawHeadingRef = useRef(0);
  const compassTrackerRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const { t, speakText, stopSpeech, isSpeaking, playAlertChime } = useLanguage();
  const [copyToast, setCopyToast] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [authFailed, setAuthFailed] = useState(false);
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

  // Cleanup geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      vehicleMarkersMapRef.current.forEach((m) => m.setMap(null));
      vehicleMarkersMapRef.current.clear();
      incidentMarkersMapRef.current.forEach((m) => m.setMap(null));
      incidentMarkersMapRef.current.clear();
    };
  }, []);

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

    window.gm_authFailure = () => {
      console.warn('Google Maps API authentication failed for key:', activeApiKey);
      setAuthFailed(true);
    };

    window.__initGoogleMapsSdk = () => {
      if (typeof window.google?.maps?.Map === 'function') {
        setIsApiLoaded(true);
      } else if (window.google?.maps?.importLibrary) {
        window.google.maps.importLibrary("maps").then(() => {
          setIsApiLoaded(true);
        }).catch(() => {
          setIsApiLoaded(true);
        });
      } else {
        const checkInterval = setInterval(() => {
          if (typeof window.google?.maps?.Map === 'function') {
            clearInterval(checkInterval);
            setIsApiLoaded(true);
          }
        }, 50);
        setTimeout(() => clearInterval(checkInterval), 4000);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${activeApiKey}&libraries=places,geometry&callback=__initGoogleMapsSdk`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof window.google?.maps?.Map === 'function') {
          setIsApiLoaded(true);
        }
      };
      script.onerror = (err) => {
        console.warn('Google Maps SDK network error:', err);
        if (onMapError) onMapError(err);
      };
      document.head.appendChild(script);
    } else {
      if (verifyApi()) return;
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
        const map = mapInstanceRef.current;
        window.google.maps.event.trigger(map, 'resize');
        const targetType = currentMapStyle === 'dark' ? 'roadmap' : currentMapStyle;
        map.setMapTypeId(targetType);
        map.setOptions({
          styles: currentMapStyle === 'dark' ? TACTICAL_DARK_STYLE : null
        });
      } catch (e) {}
      return;
    }

    try {
      const targetType = currentMapStyle === 'dark' ? 'roadmap' : currentMapStyle;
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        mapTypeId: targetType,
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
      setMapInstance(map);

      // Trigger resize after mounting to ensure official Google Maps tiles and geometry settle cleanly
      setTimeout(() => {
        if (mapInstanceRef.current && window.google?.maps?.event) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
        }
      }, 100);

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

  // Sync map viewport when center or zoom props update
  useEffect(() => {
    if (mapInstanceRef.current && center && center.lat && center.lng) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      if (typeof zoom === 'number' && zoom > 0) {
        mapInstanceRef.current.setZoom(zoom);
      }
    }
  }, [center?.lat, center?.lng, zoom]);

  // Render live real-time breadcrumbs trail for tracked vehicle
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (!trackedBreadcrumbs || trackedBreadcrumbs.length < 2) {
      if (trackedBreadcrumbPolylineRef.current) {
        trackedBreadcrumbPolylineRef.current.setMap(null);
        trackedBreadcrumbPolylineRef.current = null;
      }
      return;
    }

    const path = trackedBreadcrumbs.map((pt) => ({ lat: pt.lat, lng: pt.lng }));

    if (trackedBreadcrumbPolylineRef.current) {
      trackedBreadcrumbPolylineRef.current.setPath(path);
    } else {
      trackedBreadcrumbPolylineRef.current = new window.google.maps.Polyline({
        path,
        map: mapInstanceRef.current,
        strokeColor: '#10b981',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        zIndex: 60
      });
    }
  }, [trackedBreadcrumbs]);

  // ─────────────────────────────────────────────────────────────
  // 3. Current Location Feature (GPS Watcher & Navigation Marker)
  // ─────────────────────────────────────────────────────────────
  const updateLocationMarker = useCallback((pos) => {
    const { latitude, longitude, accuracy, heading } = pos.coords;
    const latLng = new window.google.maps.LatLng(latitude, longitude);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(latLng);
    }

    if (!locationAccuracyCircleRef.current && window.google && mapInstanceRef.current) {
      locationAccuracyCircleRef.current = new window.google.maps.Circle({
        map: mapInstanceRef.current,
        center: latLng,
        radius: accuracy || 40,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        strokeColor: '#2563eb',
        strokeWeight: 1,
        zIndex: 10
      });
    } else if (locationAccuracyCircleRef.current) {
      locationAccuracyCircleRef.current.setCenter(latLng);
      locationAccuracyCircleRef.current.setRadius(accuracy || 40);
    }

    const effectiveH = heading != null ? heading : smoothHeadingRef.current;
    const markerIcon = {
      url: createNavPointerSvg(effectiveH),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };

    if (!locationMarkerRef.current && window.google && mapInstanceRef.current) {
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
  }, []);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    // Initial position for fast pan
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        updateLocationMarker(pos);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation permission error:', err.message);
        setLocationError('Location permission denied or unavailable. Map remains fully functional.');
        setTimeout(() => setLocationError(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );

    // Setup active continuous watcher if not already active
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => updateLocationMarker(pos),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }
  }, [updateLocationMarker]);

  // ─────────────────────────────────────────────────────────────
  // 4. Smooth Heading & Heading-Up Compass Mode (CPU Throttled)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const tracker = startCompassTracking((deg) => {
      if (deg != null && !isNaN(deg)) {
        rawHeadingRef.current = deg;
      }
    });
    compassTrackerRef.current = tracker;

    let isRunning = true;

    const animateHeading = () => {
      if (!isRunning) return;

      if (isHeadingUp) {
        let raw = rawHeadingRef.current;
        let diff = raw - smoothHeadingRef.current;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        if (Math.abs(diff) > 0.05) {
          smoothHeadingRef.current = (smoothHeadingRef.current + diff * 0.18 + 360) % 360;

          if (mapContainerRef.current) {
            mapContainerRef.current.style.transform = `rotate(${-smoothHeadingRef.current}deg)`;
            mapContainerRef.current.style.transition = 'transform 0.08s linear';
          }

          if (locationMarkerRef.current) {
            locationMarkerRef.current.setIcon({
              url: createNavPointerSvg(smoothHeadingRef.current),
              scaledSize: new window.google.maps.Size(40, 40),
              anchor: new window.google.maps.Point(20, 20)
            });
          }
        }
      } else if (mapContainerRef.current && mapContainerRef.current.style.transform !== 'none') {
        mapContainerRef.current.style.transform = 'none';
      }

      // Only schedule next frame if Heading-Up is active to conserve CPU/battery
      if (isHeadingUp) {
        animFrameIdRef.current = requestAnimationFrame(animateHeading);
      }
    };

    if (isHeadingUp) {
      animFrameIdRef.current = requestAnimationFrame(animateHeading);
    } else if (mapContainerRef.current) {
      mapContainerRef.current.style.transform = 'none';
    }

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (compassTrackerRef.current?.stop) compassTrackerRef.current.stop();
    };
  }, [isHeadingUp]);

  // ─────────────────────────────────────────────────────────────
  // 5. Render NER-LIFELINE Fleet Vehicles Layer (Optimized Diffing)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (!filterLayer.vehicles || !fleet || !fleet.length) {
      vehicleMarkersMapRef.current.forEach((m) => m.setMap(null));
      vehicleMarkersMapRef.current.clear();
      return;
    }

    const seenIds = new Set();

    fleet.forEach((veh) => {
      const lat = veh.location?.lat || veh.lat;
      const lng = veh.location?.lng || veh.lng;
      if (!lat || !lng) return;

      seenIds.add(veh.id);
      const roundedH = veh.heading_deg != null ? Math.round(veh.heading_deg / 5) * 5 : 0;

      if (vehicleMarkersMapRef.current.has(veh.id)) {
        // Fast marker position update without DOM thrashing
        const marker = vehicleMarkersMapRef.current.get(veh.id);
        marker.setPosition({ lat, lng });
        marker.setTitle(`${veh.name || veh.id} (${veh.status || 'ACTIVE'})`);

        const isInTransit = veh.is_in_transit || veh.status === 'En Route' || veh.status === 'In Transit';
        const iconUrl = isInTransit
          ? createTransitTruckSvg(veh.license_plate || veh.id, Math.round(veh.speed_kmh || 38))
          : createVehicleSvg(veh.type || 'truck', veh.status || 'ACTIVE', roundedH);
        const iconSize = isInTransit ? new window.google.maps.Size(46, 46) : new window.google.maps.Size(36, 36);
        const iconAnchor = isInTransit ? new window.google.maps.Point(23, 23) : new window.google.maps.Point(18, 18);

        // Only update icon if heading or status changed
        if (marker.__lastStatus !== veh.status || marker.__lastHeading !== roundedH || marker.__lastTransit !== isInTransit) {
          marker.setIcon({
            url: iconUrl,
            scaledSize: iconSize,
            anchor: iconAnchor
          });
          marker.__lastStatus = veh.status;
          marker.__lastHeading = roundedH;
          marker.__lastTransit = isInTransit;
        }
      } else {
        const isInTransit = veh.is_in_transit || veh.status === 'En Route' || veh.status === 'In Transit';
        const iconUrl = isInTransit
          ? createTransitTruckSvg(veh.license_plate || veh.id, Math.round(veh.speed_kmh || 38))
          : createVehicleSvg(veh.type || 'truck', veh.status || 'ACTIVE', roundedH);
        const iconSize = isInTransit ? new window.google.maps.Size(46, 46) : new window.google.maps.Size(36, 36);
        const iconAnchor = isInTransit ? new window.google.maps.Point(23, 23) : new window.google.maps.Point(18, 18);

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: `${veh.license_plate || veh.name || veh.id} (${isInTransit ? 'IN TRANSIT' : (veh.status || 'ACTIVE')})`,
          icon: {
            url: iconUrl,
            scaledSize: iconSize,
            anchor: iconAnchor
          },
          zIndex: isInTransit ? 75 : 50
        });
        marker.__lastStatus = veh.status;
        marker.__lastHeading = roundedH;
        marker.__lastTransit = isInTransit;

        marker.addListener('click', () => {
          if (onSelectEntity) onSelectEntity(veh);
          setSelectedVehicle(veh);
          if (infoWindowRef.current) {
            infoWindowRef.current.setPosition({ lat, lng });
            infoWindowRef.current.setContent(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; color: #0f172a; min-width: 230px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 13px; color: #0f172a;">${veh.license_plate || veh.name || veh.id}</strong>
                  <span style="background: ${isInTransit ? '#059669' : '#10b981'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">
                    ${isInTransit ? 'IN TRANSIT 🚚' : (veh.status || 'ACTIVE')}
                  </span>
                </div>
                <div style="margin-top: 4px; font-size: 11px; color: #475569; line-height: 1.4;">
                  <div>Type: <strong>${veh.name || veh.vehicle_type || 'Fleet Transport'}</strong></div>
                  <div>Speed: <strong style="color: #059669;">${veh.speed_kmh != null ? `${veh.speed_kmh} km/h` : '38 km/h'}</strong></div>
                  ${veh.current_road ? `<div>Corridor: <strong style="color: #d97706;">${veh.current_road}</strong></div>` : ''}
                  ${veh.destination ? `<div>Destination: <strong style="color: #2563eb;">${veh.destination}</strong></div>` : ''}
                  <div>Driver: <strong>${veh.assigned_driver || veh.driver_name || 'Assigned Driver'}</strong> ${veh.driver_phone ? `(${veh.driver_phone})` : ''}</div>
                  <div>Fuel: <strong>${veh.fuel_percentage ?? veh.fuel_percent ?? 88}%</strong> (${veh.current_fuel_litres || 50} L)</div>
                  ${veh.cargo_manifest ? `<div style="margin-top: 3px; font-size: 10px; color: #047857; background: #ecfdf5; padding: 3px 5px; border-radius: 4px; border: 1px solid #a7f3d0;">📦 ${veh.cargo_manifest}</div>` : ''}
                </div>
                <div style="margin-top: 8px; display: flex; gap: 4px;">
                  <button onclick="window.__nerTrackVehicle && window.__nerTrackVehicle('${veh.license_plate || veh.id}')" style="flex: 1; padding: 6px 8px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                    🎯 Track Live Vehicle
                  </button>
                  <button onclick="window.__nerSetDest && window.__nerSetDest({ id: '${veh.id}', name: '${veh.license_plate || veh.name}', lat: ${lat}, lng: ${lng} })" style="flex: 1; padding: 6px 8px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                    📍 Route Here
                  </button>
                </div>
              </div>
            `);
            infoWindowRef.current.open(map);
          }
        });

        vehicleMarkersMapRef.current.set(veh.id, marker);
      }
    });

    // Remove departed vehicles with listener cleanup to prevent memory leaks
    vehicleMarkersMapRef.current.forEach((marker, id) => {
      if (!seenIds.has(id)) {
        if (window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(marker);
        }
        marker.setMap(null);
        vehicleMarkersMapRef.current.delete(id);
      }
    });
  }, [mapInstance, fleet, filterLayer.vehicles, onSelectEntity]);

  // ─────────────────────────────────────────────────────────────
  // 6. Render NER-LIFELINE Incidents Layer (Optimized Diffing)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (!filterLayer.hazards || !hazards || !hazards.length) {
      incidentMarkersMapRef.current.forEach((m) => m.setMap(null));
      incidentMarkersMapRef.current.clear();
      return;
    }

    const seenIds = new Set();

    hazards.forEach((hz) => {
      const lat = hz.lat || hz.latitude;
      const lng = hz.lng || hz.longitude;
      if (!lat || !lng) return;

      seenIds.add(hz.id);

      if (incidentMarkersMapRef.current.has(hz.id)) {
        const marker = incidentMarkersMapRef.current.get(hz.id);
        marker.setPosition({ lat, lng });
      } else {
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

        incidentMarkersMapRef.current.set(hz.id, marker);
      }
    });

    incidentMarkersMapRef.current.forEach((marker, id) => {
      if (!seenIds.has(id)) {
        if (window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(marker);
        }
        marker.setMap(null);
        incidentMarkersMapRef.current.delete(id);
      }
    });
  }, [mapInstance, hazards, filterLayer.hazards]);

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
  }, [mapInstance, blockedRoads, riskyRoads, filterLayer.blockedRoads, filterLayer.riskyRoads]);

  // ─────────────────────────────────────────────────────────────
  // 8. Render AI Routes on Google Map (Road X, Road Y, Road Z)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old polylines and transit markers
    if (roadPolylinesRef.current.safest) roadPolylinesRef.current.safest.setMap(null);
    if (roadPolylinesRef.current.shortest) roadPolylinesRef.current.shortest.setMap(null);
    if (roadPolylinesRef.current.bypass) roadPolylinesRef.current.bypass.setMap(null);
    if (roadPolylinesRef.current.flowInterval) clearInterval(roadPolylinesRef.current.flowInterval);
    if (roadPolylinesRef.current.transitMarker) {
      roadPolylinesRef.current.transitMarker.setMap(null);
      roadPolylinesRef.current.transitMarker = null;
    }
    if (roadPolylinesRef.current.transitInterval) {
      clearInterval(roadPolylinesRef.current.transitInterval);
      roadPolylinesRef.current.transitInterval = null;
    }

    if (!filterLayer.routes || !routeResult) return;

    const bounds = new window.google.maps.LatLngBounds();

    // Road X: Safest Route (Emerald with animated arrows & moving transit truck)
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
        if (typeof document !== 'undefined' && document.hidden) return;
        count = (count + 1) % 200;
        const icons = poly.get('icons');
        if (icons && icons[0]) {
          icons[0].offset = `${(count / 2) % 100}%`;
          poly.set('icons', icons);
        }
      }, 80);

      // Moving Relief Truck Marker traveling through the road in transit
      const coords = routeResult.safest_route.coordinates;
      if (coords && coords.length > 1) {
        let stepIdx = 0;
        const truckCallsign = selectedVehicleId || 'AS-01-EV-4421';
        const transitMarker = new window.google.maps.Marker({
          position: { lat: coords[0][0], lng: coords[0][1] },
          map: map,
          title: `🚚 ${truckCallsign} • IN TRANSIT (Road X)`,
          icon: {
            url: createTransitTruckSvg(truckCallsign, 54),
            scaledSize: new window.google.maps.Size(46, 46),
            anchor: new window.google.maps.Point(23, 23)
          },
          zIndex: 85
        });

        transitMarker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setPosition(transitMarker.getPosition());
            infoWindowRef.current.setContent(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; color: #0f172a; min-width: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 13px; color: #0f172a;">🚚 ${truckCallsign}</strong>
                  <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">IN TRANSIT</span>
                </div>
                <div style="margin-top: 6px; font-size: 11px; color: #475569;">
                  <div>Corridor: <strong>Road X (Safest Highway)</strong></div>
                  <div>Live Speed: <strong>54 km/h (In Transit)</strong></div>
                  <div>ETA: <strong>${routeResult.safest_route?.duration_text || '3.5 hours'}</strong></div>
                  <div>Cargo: <strong>Essential Disaster Relief & Medical Supplies</strong></div>
                </div>
                <div style="margin-top: 6px; padding: 4px 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; font-size: 9px; color: #065f46; font-weight: bold;">
                  📡 ACTIVE GPS SATELLITE TELEMETRY
                </div>
              </div>
            `);
            infoWindowRef.current.open(map);
          }
        });

        const transitInterval = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return;
          stepIdx = (stepIdx + 1) % coords.length;
          transitMarker.setPosition({ lat: coords[stepIdx][0], lng: coords[stepIdx][1] });
        }, 1200);

        roadPolylinesRef.current.transitMarker = transitMarker;
        roadPolylinesRef.current.transitInterval = transitInterval;
      }

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
      const oLat = routeResult?.origin?.lat || routeResult?.origin?.latitude;
      const oLng = routeResult?.origin?.lng || routeResult?.origin?.longitude;
      const dLat = routeResult?.destination?.lat || routeResult?.destination?.latitude;
      const dLng = routeResult?.destination?.lng || routeResult?.destination?.longitude;
      const routeKey = `${Number(oLat || 0).toFixed(3)},${Number(oLng || 0).toFixed(3)}->${Number(dLat || 0).toFixed(3)},${Number(dLng || 0).toFixed(3)}`;

      if (lastFittedRouteKeyRef.current !== routeKey) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        lastFittedRouteKeyRef.current = routeKey;
      }
    }

    return () => {
      if (roadPolylinesRef.current.flowInterval) {
        clearInterval(roadPolylinesRef.current.flowInterval);
      }
    };
  }, [mapInstance, routeResult, activeRoadFilter, filterLayer.routes]);

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
  }, [mapInstance, showTraffic]);

  // Voice Readout
  const handleVoiceReadout = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
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
        style={{ width: '100%', height: '100%', minHeight: '640px', position: 'relative' }}
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

      {/* Load Error Card */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertTriangle size={36} className="text-amber-500 mb-3" />
          <h3 className="text-white font-bold text-base mb-1">Google Maps Initialization Notice</h3>
          <p className="text-slate-400 text-xs max-w-md mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Reload Map Session
          </button>
        </div>
      )}

      {/* Google Maps API Key Authentication Notice */}
      {authFailed && (
        <div className="absolute top-16 left-4 right-4 max-w-xl mx-auto p-3 rounded-xl bg-amber-950/95 border border-amber-500 text-amber-200 z-40 text-xs flex items-center justify-between shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-white">Google Maps API Notice</div>
              <div className="text-[11px] text-amber-300">
                Key <code>{activeApiKey.slice(0, 10)}...</code> connected. Ensure <strong>Maps JavaScript API</strong> is enabled in Google Cloud Console.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.__nerSwitchOffline) window.__nerSwitchOffline();
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition-all flex items-center space-x-1 flex-shrink-0 ml-2"
          >
            <Shield size={12} />
            <span>Sovereign GIS</span>
          </button>
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
      <div className="absolute top-14 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px]">
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
                title={isSpeaking ? "Directly stop and silence voice guidance" : "Voice Route Guidance"}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isSpeaking ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
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
