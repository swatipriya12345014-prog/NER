import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Layers, Shield, Navigation, AlertTriangle, Fuel, MapPin, Radio, 
  Compass, Eye, Check, RefreshCw, AlertOctagon, CircleDot, Bell, 
  X, Info, Sliders, CloudRain, Truck, Route as RouteIcon,
  Volume2, Copy
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

// Sleek Tactical Dark Mode Style for Google Maps
const DARK_MAP_STYLE = [
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
    stylers: [{ color: '#13271f' }]
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

export default function GoogleMapView({
  apiKey,
  center = { lat: 26.2, lng: 92.8 },
  zoom = 7,
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
  heightClass = 'h-[640px]'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const polylinesRef = useRef({ safest: null, shortest: null, flowSymbolInterval: null });
  const markersRef = useRef([]);
  const operationalObjectsRef = useRef({ polylines: [], circles: [], markers: [] });
  const gpsMarkerRef = useRef({ marker: null, circle: null });
  const infoWindowRef = useRef(null);
  const compassTrackerRef = useRef(null);

  const { t, speakText, isSpeaking, playAlertChime } = useLanguage();
  const [copyToast, setCopyToast] = useState(false);

  const [mapType, setMapType] = useState('dark'); // 'dark' | 'roadmap' | 'satellite' | 'terrain' | 'hybrid'
  const [showTraffic, setShowTraffic] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isCalculatingDirections, setIsCalculatingDirections] = useState(false);

  // Compass-Based Heading-Up Navigation States
  const [isHeadingUp, setIsHeadingUp] = useState(enableHeadingUp);
  const [compassHeading, setCompassHeading] = useState(0);
  const [isSensorActive, setIsSensorActive] = useState(false);
  const [manualSimulationAngle, setManualSimulationAngle] = useState(null);
  const [showCompassTools, setShowCompassTools] = useState(false);

  const handleVoiceReadout = () => {
    if (!routeResult) return;
    const destName = routeResult.destination?.name || 'Destination';
    const dist = routeResult.distance?.text || `${routeResult.safest_route?.distance_km} km`;
    const dur = routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours} hours`;
    const nextStep = routeResult.safest_route?.navigation_steps?.[0]?.instruction || 'Proceed along highway corridor';
    const riskVerdict = routeResult.ai_recommendation?.safety_verdict || 'Clear passage';
    speakText(`Active Route to ${destName}. Distance: ${dist}. Estimated drive time: ${dur}. Next instruction: ${nextStep}. Hazard status: ${riskVerdict}.`);
  };

  const handleCopyRoute = () => {
    if (!routeResult) return;
    const origin = routeResult.origin?.name || 'Origin';
    const destination = routeResult.destination?.name || 'Destination';
    const dist = routeResult.distance?.text || `${routeResult.safest_route?.distance_km} km`;
    const dur = routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours}h`;
    const manifest = `NER-LIFELINE ROUTE MANIFEST\nFrom: ${origin} ➔ To: ${destination}\nCorridor: ${routeResult.safest_route?.corridor_name || 'National Highway Network'}\nDistance: ${dist} • Travel Time: ${dur}\nRisk Rating: ${routeResult.safest_route?.risk_level} (${routeResult.safest_route?.risk_score}/100)\nProvider: ${routeResult.provider || 'Google Routes Platform'}`;
    navigator.clipboard.writeText(manifest).then(() => {
      setCopyToast(true);
      playAlertChime('success');
      setTimeout(() => setCopyToast(false), 2500);
    });
  };

  // Compute effective heading (Priority: Manual Sim > Moving GPS > Device Orientation Sensor > Prop)
  const effectiveHeading = manualSimulationAngle !== null
    ? manualSimulationAngle
    : (deviceGPS?.heading_deg != null && (deviceGPS.speed_kmh || 0) > 3)
      ? deviceGPS.heading_deg
      : (deviceHeading !== null && deviceHeading !== undefined)
        ? deviceHeading
        : (compassHeading || 0);
  
  // Operational Layer Visibility & Drawer States
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
  const [showLayerDrawer, setShowLayerDrawer] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showRiskDetail, setShowRiskDetail] = useState(true);
  const [showProvenanceInfo, setShowProvenanceInfo] = useState(false);

  // Sync external filterLayer updates
  useEffect(() => {
    setActiveLayers((prev) => ({
      ...prev,
      ...filterLayer
    }));
  }, [filterLayer]);

  // ─────────────────────────────────────────────────────────────
  // 0. Device Orientation / Compass Sensor Listener
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const tracker = startCompassTracking((headingDeg, hasSensor) => {
      setCompassHeading(headingDeg);
      setIsSensorActive(hasSensor);
      if (onHeadingChange) onHeadingChange(headingDeg);
    });
    compassTrackerRef.current = tracker;

    return () => {
      if (compassTrackerRef.current) {
        compassTrackerRef.current.stop();
        compassTrackerRef.current = null;
      }
    };
  }, [onHeadingChange]);

  // ─────────────────────────────────────────────────────────────
  // 1. Google Maps JS API Dynamic Loader
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) {
      setLoadError('Google Maps API key is missing');
      if (onMapError) onMapError('Missing API Key');
      return;
    }

    if (window.google && window.google.maps) {
      setIsApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsApiLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsApiLoaded(true);
    };

    script.onerror = (err) => {
      console.error('Google Maps API failed to load:', err);
      setLoadError('Google Maps API failed to load. Check network connection or API key.');
      if (onMapError) onMapError('Script load error');
    };

    document.head.appendChild(script);
  }, [apiKey, onMapError]);

  // ─────────────────────────────────────────────────────────────
  // 2. Initialize Google Map Instance
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isApiLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        styles: mapType === 'dark' ? DARK_MAP_STYLE : null,
        mapTypeId: mapType === 'dark' ? 'roadmap' : mapType,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false, // We provide custom emergency buttons
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapInstanceRef.current = map;

      // Handle map click to deselect
      map.addListener('click', () => {
        if (infoWindowRef.current) infoWindowRef.current.close();
      });
    } catch (err) {
      console.error('Failed to instantiate Google Map:', err);
      setLoadError(err.message);
      if (onMapError) onMapError(err.message);
    }
  }, [isApiLoaded]);

  // ─────────────────────────────────────────────────────────────
  // 2.5 Real Google Routes Highway Computation
  // ─────────────────────────────────────────────────────────────
  const computeRealGoogleRoute = useCallback(async () => {
    if (!routeResult?.origin || !routeResult?.destination) return;
    setIsCalculatingDirections(true);
    try {
      const realRoute = await calculateRealHighwayRoute({
        origin: routeResult.origin,
        destination: routeResult.destination,
        vehicleId: selectedVehicleId,
        hazards: hazards
      });
      if (realRoute && onRealRouteComputed) {
        onRealRouteComputed(realRoute);
      }
    } catch (err) {
      console.warn('Real Google Routes calculation failed:', err.message);
    } finally {
      setIsCalculatingDirections(false);
    }
  }, [routeResult?.origin, routeResult?.destination, selectedVehicleId, hazards, onRealRouteComputed]);

  useEffect(() => {
    if (routeResult && !routeResult.is_real_google_route) {
      computeRealGoogleRoute();
    }
  }, [routeResult?.origin?.id, routeResult?.destination?.id, computeRealGoogleRoute]);

  // ─────────────────────────────────────────────────────────────
  // 3. Update Map Style / Type & 3D Tilt
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapType === 'dark') {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: DARK_MAP_STYLE });
    } else {
      map.setOptions({ styles: null });
      map.setMapTypeId(mapType);
    }
  }, [mapType]);

  // 3D Perspective Tilt Control
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setTilt(is3D ? 45 : 0);
  }, [is3D]);

  // ─────────────────────────────────────────────────────────────
  // 4. Live Traffic Layer
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // 5. Render Polylines for Safest & Shortest Routes with Animation
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old polylines
    if (polylinesRef.current.safest) {
      polylinesRef.current.safest.setMap(null);
      polylinesRef.current.safest = null;
    }
    if (polylinesRef.current.shortest) {
      polylinesRef.current.shortest.setMap(null);
      polylinesRef.current.shortest = null;
    }
    if (polylinesRef.current.flowSymbolInterval) {
      clearInterval(polylinesRef.current.flowSymbolInterval);
      polylinesRef.current.flowSymbolInterval = null;
    }

    if (!filterLayer.routes || !routeResult) return;

    const bounds = new window.google.maps.LatLngBounds();

    // 1. SAFEST ROUTE (Vibrant Emerald with Animated Forward Flow)
    if (
      (activeRouteView === 'both' || activeRouteView === 'safest') &&
      routeResult.safest_route?.coordinates
    ) {
      const safestPath = routeResult.safest_route.coordinates.map(([lat, lng]) => {
        const pt = new window.google.maps.LatLng(lat, lng);
        bounds.extend(pt);
        return pt;
      });

      // Forward-flowing arrow/dash symbol
      const lineSymbol = {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 2.5,
        strokeColor: '#a7f3d0',
        strokeWeight: 1.5,
        fillColor: '#ffffff',
        fillOpacity: 1
      };

      const safestPolyline = new window.google.maps.Polyline({
        path: safestPath,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: activeRouteView === 'safest' ? 6 : 4.5,
        zIndex: 20,
        icons: [
          {
            icon: lineSymbol,
            offset: '0%',
            repeat: '60px'
          }
        ],
        map: map
      });

      // Animate the flow symbols forward along the safest route
      let count = 0;
      const flowInterval = setInterval(() => {
        count = (count + 1) % 200;
        const icons = safestPolyline.get('icons');
        if (icons && icons[0]) {
          icons[0].offset = `${(count / 2) % 100}%`;
          safestPolyline.set('icons', icons);
        }
      }, 50);

      polylinesRef.current.safest = safestPolyline;
      polylinesRef.current.flowSymbolInterval = flowInterval;
    }

    // 2. SHORTEST ROUTE (Rose Dashed Polyline)
    if (
      (activeRouteView === 'both' || activeRouteView === 'shortest') &&
      routeResult.shortest_route?.coordinates
    ) {
      const shortestPath = routeResult.shortest_route.coordinates.map(([lat, lng]) => {
        const pt = new window.google.maps.LatLng(lat, lng);
        bounds.extend(pt);
        return pt;
      });

      const dashSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 3,
        strokeColor: '#f43f5e'
      };

      const shortestPolyline = new window.google.maps.Polyline({
        path: shortestPath,
        geodesic: true,
        strokeColor: '#f43f5e',
        strokeOpacity: 0,
        strokeWeight: 3.5,
        zIndex: 15,
        icons: [
          {
            icon: dashSymbol,
            offset: '0',
            repeat: '14px'
          }
        ],
        map: map
      });

      polylinesRef.current.shortest = shortestPolyline;
    }

    // Fit map bounds to show full route if available
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    return () => {
      if (polylinesRef.current.flowSymbolInterval) {
        clearInterval(polylinesRef.current.flowSymbolInterval);
      }
    };
  }, [routeResult, activeRouteView, filterLayer.routes]);

  // ─────────────────────────────────────────────────────────────
  // 6. Render Google Maps Markers (Hubs, Localities, Vehicles, Hazards)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const newMarkers = [];

    // Helper to attach info window
    const attachPopup = (marker, title, contentHtml) => {
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px; color: #1e293b; max-width: 260px;">
              <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${title}</h4>
              ${contentHtml}
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });
    };

    // A. HUB MARKERS
    if (filterLayer.hubs) {
      hubs.forEach((hub) => {
        const isOrigin = routeResult?.origin?.id === hub.id;
        const isDest = routeResult?.destination?.id === hub.id;

        const pinColor = isDest ? '#10b981' : isOrigin ? '#3b82f6' : '#64748b';
        const marker = new window.google.maps.Marker({
          position: { lat: hub.lat, lng: hub.lng },
          map: map,
          title: hub.name,
          zIndex: isDest || isOrigin ? 50 : 25,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: isDest || isOrigin ? 8 : 6,
            fillColor: pinColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        attachPopup(
          marker,
          hub.name,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div><strong>State:</strong> ${hub.state}</div>
            <div><strong>Elevation:</strong> ${hub.elevation_m}m</div>
            ${isOrigin ? '<div style="color: #2563eb; font-weight: 700; margin-top: 4px;">● ORIGIN DEPOT</div>' : ''}
            ${isDest ? '<div style="color: #059669; font-weight: 700; margin-top: 4px;">● DESTINATION BASE</div>' : ''}
          </div>`
        );
        newMarkers.push(marker);
      });
    }

    // B. GOOGLE MAPS LOCALITIES ALONG ROUTE
    if (filterLayer.localities && filterLayer.routes && localities.length > 0) {
      localities.forEach((loc, idx) => {
        const isPass = loc.is_mountain_pass || loc.elevation_m > 2000;
        const marker = new window.google.maps.Marker({
          position: { lat: loc.lat, lng: loc.lng },
          map: map,
          title: loc.name,
          zIndex: 35,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: isPass ? 6 : 4.5,
            fillColor: isPass ? '#f59e0b' : '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5
          }
        });

        attachPopup(
          marker,
          loc.name,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #64748b;">${loc.district ? `${loc.district}, ` : ''}${loc.state}</div>
            <div style="margin-top: 4px;"><strong>Milestone:</strong> +${loc.distance_from_origin_km} km (~${loc.eta_mins}m)</div>
            <div><strong>Elevation:</strong> ${loc.elevation_m} meters ${isPass ? '<span style="background: #fef3c7; color: #b45309; padding: 1px 4px; border-radius: 4px; font-weight: bold; font-size: 9px;">MOUNTAIN PASS</span>' : ''}</div>
            <div><strong>Road:</strong> ${loc.road_type}</div>
            ${loc.amenities && loc.amenities.length ? `<div style="margin-top: 6px; font-size: 10px; color: #059669;">${loc.amenities.join(' • ')}</div>` : ''}
          </div>`
        );

        if (onLocalityClick) {
          marker.addListener('click', () => onLocalityClick(loc));
        }

        newMarkers.push(marker);
      });
    }

    // C. FLEET VEHICLES
    if (filterLayer.vehicles) {
      fleet.forEach((veh) => {
        const isSelected = selectedVehicleId === veh.id;
        const marker = new window.google.maps.Marker({
          position: { lat: veh.lat, lng: veh.lng },
          map: map,
          title: `${veh.name} (${veh.license_plate})`,
          zIndex: isSelected ? 60 : 40,
          icon: {
            path: 'M 0,-9 L 6,7 L 0,3 L -6,7 Z', // Vehicle arrow symbol
            scale: isSelected ? 3.0 : 2.4,
            rotation: veh.heading_deg || 0,
            fillColor: isSelected ? '#3b82f6' : '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5
          }
        });

        attachPopup(
          marker,
          veh.name,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div><strong>Plate:</strong> ${veh.license_plate}</div>
            <div><strong>Driver:</strong> ${veh.assigned_driver}</div>
            <div><strong>Fuel:</strong> ${veh.current_fuel_litres}L (${veh.fuel_percentage}%)</div>
            <div><strong>Range:</strong> ${veh.remaining_range_km} km</div>
            <div><strong>Status:</strong> ${veh.status}</div>
          </div>`
        );

        if (onSelectEntity) {
          marker.addListener('click', () => onSelectEntity(veh));
        }

        newMarkers.push(marker);
      });
    }

    // D. HAZARDS
    if (filterLayer.hazards) {
      hazards.forEach((hz) => {
        const marker = new window.google.maps.Marker({
          position: { lat: hz.lat, lng: hz.lng },
          map: map,
          title: hz.title,
          zIndex: 45,
          icon: {
            path: 'M 0,-7 L 7,6 L -7,6 Z', // Warning triangle
            scale: 2.5,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5
          }
        });

        attachPopup(
          marker,
          hz.title,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #ef4444; font-weight: 700;">● ${hz.severity} HAZARD</div>
            <div><strong>State:</strong> ${hz.state}</div>
            <div style="margin-top: 4px;">${hz.description}</div>
          </div>`
        );
        newMarkers.push(marker);
      });
    }

    markersRef.current = newMarkers;
  }, [hubs, localities, fleet, hazards, activeLayers, routeResult, selectedVehicleId]);

  // ─────────────────────────────────────────────────────────────
  // 6.5 Render NER-LIFELINE Operational Overlays on Google Maps (PHASE 3)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear previous operational overlays
    operationalObjectsRef.current.polylines.forEach(p => p.setMap(null));
    operationalObjectsRef.current.circles.forEach(c => c.setMap(null));
    operationalObjectsRef.current.markers.forEach(m => m.setMap(null));
    operationalObjectsRef.current = { polylines: [], circles: [], markers: [] };

    const newPolylines = [];
    const newCircles = [];
    const newMarkers = [];

    const attachPopup = (target, title, contentHtml) => {
      target.addListener('click', (e) => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px; color: #1e293b; max-width: 290px;">
              <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${title}</h4>
              ${contentHtml}
              <div style="margin-top: 8px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #64748b; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
                <span>OPERATIONAL: NER-LIFELINE</span>
                <span>BASEMAP: GOOGLE MAPS</span>
              </div>
            </div>
          `);
          if (e && e.latLng) {
            infoWindowRef.current.setPosition(e.latLng);
            infoWindowRef.current.open(map);
          } else {
            infoWindowRef.current.open(map, target);
          }
        }
      });
    };

    // 1. BLOCKED ROADS (Red Polylines + Barricade Markers)
    if (activeLayers.blockedRoads && blockedRoads?.length > 0) {
      blockedRoads.forEach((blk) => {
        const path = blk.coordinates.map(([lat, lng]) => new window.google.maps.LatLng(lat, lng));
        const poly = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#ef4444',
          strokeOpacity: 0.95,
          strokeWeight: 6,
          zIndex: 48,
          map
        });
        attachPopup(
          poly,
          `⛔ ROAD BLOCKED: ${blk.name}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
              STATUS: ${blk.status}
            </div>
            <div><strong>Highway:</strong> ${blk.highway}</div>
            <div><strong>Stretch:</strong> ${blk.stretch} (${blk.state})</div>
            <div style="margin-top: 4px;"><strong>Cause:</strong> ${blk.reason}</div>
            <div style="margin-top: 2px; color: #b45309;"><strong>Clearing ETA:</strong> ${blk.clearing_eta}</div>
            <div style="margin-top: 2px; color: #059669;"><strong>Emergency Diversion:</strong> ${blk.diversion}</div>
          </div>`
        );
        newPolylines.push(poly);

        // Barricade marker at road center
        const midPoint = path[Math.floor(path.length / 2)] || new window.google.maps.LatLng(blk.lat, blk.lng);
        const marker = new window.google.maps.Marker({
          position: midPoint,
          map,
          title: `⛔ BLOCKED: ${blk.name}`,
          zIndex: 55,
          icon: {
            path: 'M -5,-5 L 5,-5 L 5,5 L -5,5 Z',
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 2.2
          }
        });
        attachPopup(
          marker,
          `⛔ ROAD BLOCKED: ${blk.name}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #dc2626; font-weight: bold;">● ROAD IMPASSABLE</div>
            <div><strong>Stretch:</strong> ${blk.stretch}</div>
            <div><strong>Reported:</strong> ${blk.reported_by}</div>
            <div><strong>Diversion:</strong> ${blk.diversion}</div>
          </div>`
        );
        newMarkers.push(marker);
      });
    }

    // 2. RISKY ROADS (Amber Striped Polylines + Warning Badges)
    if (activeLayers.riskyRoads && riskyRoads?.length > 0) {
      riskyRoads.forEach((rsk) => {
        const path = rsk.coordinates.map(([lat, lng]) => new window.google.maps.LatLng(lat, lng));
        const poly = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.85,
          strokeWeight: 4.5,
          zIndex: 38,
          map
        });
        attachPopup(
          poly,
          `⚠️ RISKY ROAD: ${rsk.name}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #b45309; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
              RISK INDEX: ${rsk.risk_score}/100 (${rsk.risk_level})
            </div>
            <div><strong>Highway:</strong> ${rsk.highway} (${rsk.state})</div>
            <div><strong>Hazard:</strong> ${rsk.reason}</div>
            <div style="margin-top: 4px; color: #b45309;"><strong>Transit Protocol:</strong> ${rsk.advisory}</div>
          </div>`
        );
        newPolylines.push(poly);

        const midPoint = path[Math.floor(path.length / 2)] || new window.google.maps.LatLng(rsk.lat, rsk.lng);
        const marker = new window.google.maps.Marker({
          position: midPoint,
          map,
          title: `⚠️ RISKY ROAD: ${rsk.name}`,
          zIndex: 42,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 5.5,
            fillColor: '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5
          }
        });
        attachPopup(
          marker,
          `⚠️ ROAD RISK: ${rsk.name}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div><strong>Risk Score:</strong> ${rsk.risk_score}/100</div>
            <div><strong>Advisory:</strong> ${rsk.advisory}</div>
          </div>`
        );
        newMarkers.push(marker);
      });
    }

    // 3. SHIPMENT ROUTES (Active Critical Logistics Corridors)
    if (activeLayers.shipments && shipmentRoutes?.length > 0) {
      shipmentRoutes.forEach((shp) => {
        const coords = shp.coordinates || [];
        if (coords.length > 0) {
          const path = coords.map(([lat, lng]) => new window.google.maps.LatLng(lat, lng));
          const poly = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#0284c7', // Sky Blue corridor
            strokeOpacity: 0.75,
            strokeWeight: 3.5,
            zIndex: 18,
            map
          });
          attachPopup(
            poly,
            `📦 CRITICAL SHIPMENT: ${shp.cargo}`,
            `<div style="font-size: 11px; line-height: 1.4;">
              <div style="color: #0369a1; font-weight: bold;">● TRACKING: ${shp.tracking_id}</div>
              <div><strong>Route:</strong> ${shp.origin} ➔ ${shp.destination}</div>
              <div><strong>Vehicle:</strong> ${shp.vehicle_plate} (${shp.driver})</div>
              <div><strong>Cold-Chain:</strong> ${shp.temp_monitored}</div>
              <div><strong>Priority:</strong> ${shp.priority} | ETA: ${shp.eta}</div>
            </div>`
          );
          newPolylines.push(poly);
        }
      });
    }

    // 4. RISK ZONES (Circular Terrain Danger Buffers)
    if (activeLayers.riskZones && riskZones?.length > 0) {
      riskZones.forEach((zone) => {
        const circle = new window.google.maps.Circle({
          center: new window.google.maps.LatLng(zone.center.lat, zone.center.lng),
          radius: zone.radius_meters,
          map,
          fillColor: zone.color || '#ef4444',
          fillOpacity: 0.15,
          strokeColor: zone.color || '#ef4444',
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
          zIndex: 10
        });
        attachPopup(
          circle,
          `⭕ RISK ZONE: ${zone.title}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #dc2626; font-weight: bold;">● HAZARD PERIMETER</div>
            <div><strong>State:</strong> ${zone.state}</div>
            <div><strong>Threat:</strong> ${zone.hazard_type}</div>
            <div><strong>Radius:</strong> ${zone.radius_meters / 1000} km buffer</div>
            <div><strong>Terrain Vulnerability:</strong> ${zone.vulnerability_score}/100</div>
          </div>`
        );
        newCircles.push(circle);
      });
    }

    // 5. OPERATIONAL ALERTS (Alert Markers on Map)
    if (activeLayers.alerts && alerts?.length > 0) {
      alerts.forEach((alt) => {
        const marker = new window.google.maps.Marker({
          position: new window.google.maps.LatLng(alt.lat, alt.lng),
          map,
          title: `🚨 ${alt.title}`,
          zIndex: 65,
          icon: {
            path: 'M 0,-8 L 6,4 L -6,4 Z',
            scale: 2.2,
            fillColor: alt.severity === 'Critical' ? '#dc2626' : '#d97706',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5
          }
        });
        attachPopup(
          marker,
          `🚨 OPERATIONAL ALERT: ${alt.title}`,
          `<div style="font-size: 11px; line-height: 1.4;">
            <div style="color: #dc2626; font-weight: bold;">● SEVERITY: ${alt.severity}</div>
            <div style="margin-top: 4px;">${alt.message}</div>
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Issued: ${alt.time}</div>
          </div>`
        );
        newMarkers.push(marker);
      });
    }

    operationalObjectsRef.current = {
      polylines: newPolylines,
      circles: newCircles,
      markers: newMarkers
    };

    return () => {
      newPolylines.forEach(p => p.setMap(null));
      newCircles.forEach(c => c.setMap(null));
      newMarkers.forEach(m => m.setMap(null));
    };
  }, [blockedRoads, riskyRoads, shipmentRoutes, riskZones, alerts, activeLayers]);

  // ─────────────────────────────────────────────────────────────
  // 7. Real-time Device GPS Blue Dot Marker & Follow Mode
  // ─────────────────────────────────────────────────────────────
  // 7. Real-time Device GPS Navigation Marker with Heading Rotation
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (!activeLayers.gps || !deviceGPS) {
      if (gpsMarkerRef.current.marker) {
        gpsMarkerRef.current.marker.setMap(null);
        gpsMarkerRef.current.marker = null;
      }
      if (gpsMarkerRef.current.circle) {
        gpsMarkerRef.current.circle.setMap(null);
        gpsMarkerRef.current.circle = null;
      }
      return;
    }

    const pos = new window.google.maps.LatLng(deviceGPS.lat, deviceGPS.lng);
    const markerAngle = Math.round(effectiveHeading || 0);

    // Directional Navigation Chevron Marker (Points in Direction of Travel)
    const navArrowIcon = {
      path: 'M 0,-13 L 7,9 L 0,4 L -7,9 Z',
      scale: 1.9,
      rotation: markerAngle,
      fillColor: '#06b6d4', // Cyan
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    };

    // Create or update marker
    if (!gpsMarkerRef.current.marker) {
      gpsMarkerRef.current.marker = new window.google.maps.Marker({
        position: pos,
        map: map,
        title: `Your Location (${markerAngle}° ${getCompassCardinal(markerAngle)})`,
        zIndex: 100,
        icon: navArrowIcon
      });

      gpsMarkerRef.current.circle = new window.google.maps.Circle({
        center: pos,
        radius: Math.max(15, deviceGPS.accuracy_m || 25),
        map: map,
        fillColor: '#06b6d4',
        fillOpacity: 0.15,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.5,
        strokeWeight: 1
      });
    } else {
      gpsMarkerRef.current.marker.setPosition(pos);
      gpsMarkerRef.current.marker.setIcon(navArrowIcon);
      gpsMarkerRef.current.marker.setTitle(`Your Location (${markerAngle}° ${getCompassCardinal(markerAngle)})`);
      if (gpsMarkerRef.current.circle) {
        gpsMarkerRef.current.circle.setCenter(pos);
        gpsMarkerRef.current.circle.setRadius(Math.max(15, deviceGPS.accuracy_m || 25));
      }
    }

    // Auto-follow pan
    if (gpsFollowMode) {
      map.panTo(pos);
    }
  }, [deviceGPS, activeLayers.gps, gpsFollowMode, effectiveHeading]);

  // Sync 3D camera heading when in 3D perspective tilt
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isHeadingUp && is3D) {
      try {
        map.setHeading(Math.round((360 - effectiveHeading) % 360));
      } catch (e) {}
    }
  }, [isHeadingUp, effectiveHeading, is3D]);

  // Pan to center when center prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && center) {
      map.panTo({ lat: center.lat, lng: center.lng });
    }
  }, [center]);

  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 overflow-hidden rounded-xl transition-all duration-300`}>
      {/* Google Maps Container with Smooth Compass Heading-Up Rotation */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{
          transform: isHeadingUp ? `rotate(${-effectiveHeading}deg) scale(1.42)` : 'none',
          transformOrigin: '50% 50%',
          transition: 'transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1.0)'
        }}
      />

      {/* Loading Overlay */}
      {!isApiLoaded && !loadError && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-200">Initializing Google Maps Engine...</span>
          <span className="text-xs text-slate-400">Loading Satellite, Terrain & Real-time Traffic Feeds</span>
        </div>
      )}

      {/* Error Fallback Notice */}
      {loadError && (
        <div className="absolute top-4 left-4 right-4 p-3 rounded-xl bg-rose-950/90 border border-rose-500/80 text-white z-40 text-xs flex items-center justify-between shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-rose-400 flex-shrink-0" size={16} />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => onMapError && onMapError('fallback')}
            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
          >
            Switch to Offline Mode
          </button>
        </div>
      )}

      {/* Google Maps Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-950/95 border border-slate-700/90 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px]">
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

        {/* Compass Rose & Heading-Up Navigation Toggle */}
        <button
          onClick={() => setIsHeadingUp(!isHeadingUp)}
          title={isHeadingUp ? 'Switch to North-Up Mode (Lock Map to North)' : 'Switch to Heading-Up Mode (Rotate Map with Compass)'}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            isHeadingUp
              ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {/* Rotating Compass Needle Icon */}
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

        {/* Compass Calibration / Simulation Drawer Toggle */}
        <button
          onClick={() => setShowCompassTools(!showCompassTools)}
          title="Compass Sensor Calibration & Simulation Controls"
          className={`p-1 rounded-lg transition-all cursor-pointer ${
            showCompassTools || manualSimulationAngle !== null
              ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders size={13} />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-0.5"></span>

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

      {/* Operational Layers Dropdown / Modal */}
      {showLayerDrawer && (
        <div className="absolute top-14 left-3 z-30 w-72 bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
              <Layers size={14} />
              <span>NER-LIFELINE Operational Layers</span>
            </div>
            <button
              onClick={() => setShowLayerDrawer(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-[10px] text-slate-400 leading-tight">
            Overlay proprietary disaster logistics data over Google Maps basemap:
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { key: 'vehicles', label: 'Fleet GPS', icon: '🚗', color: 'text-emerald-400' },
              { key: 'gps', label: 'Live Device GPS', icon: '📍', color: 'text-cyan-400' },
              { key: 'hazards', label: 'Field Incidents', icon: '⚠️', color: 'text-rose-400' },
              { key: 'blockedRoads', label: 'Blocked Roads', icon: '⛔', color: 'text-red-500' },
              { key: 'riskyRoads', label: 'Risky Roads', icon: '🟡', color: 'text-amber-400' },
              { key: 'shipments', label: 'Shipments', icon: '📦', color: 'text-blue-400' },
              { key: 'riskZones', label: 'Risk Zones', icon: '⭕', color: 'text-rose-400' },
              { key: 'alerts', label: 'Alert Pins', icon: '🚨', color: 'text-amber-500' },
              { key: 'hubs', label: 'Logistics Hubs', icon: '🏢', color: 'text-slate-300' },
              { key: 'localities', label: 'Route Localities', icon: '🛣️', color: 'text-slate-300' },
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

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Provider: Google Maps Platform</span>
            <button
              onClick={() =>
                setActiveLayers({
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
                })
              }
              className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* Compass Calibration & Desktop Simulation Drawer */}
      {showCompassTools && (
        <div className="absolute top-14 left-3 sm:left-64 z-30 w-72 bg-slate-950/95 border border-cyan-500/60 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 font-bold text-cyan-400">
              <Compass size={15} />
              <span>Compass & Heading-Up Sensor</span>
            </div>
            <button
              onClick={() => setShowCompassTools(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[11px]">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isSensorActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">
                {isSensorActive ? 'Device Orientation Active' : 'Sensor Emulation Mode'}
              </span>
            </div>
            <span className="font-mono text-cyan-300 font-extrabold text-xs">
              {Math.round(effectiveHeading)}° {getCompassCardinal(effectiveHeading)}
            </span>
          </div>

          {/* Quick Heading Turn Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium">Quick Turn Presets:</span>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {[
                { label: 'North (0°)', angle: 0 },
                { label: 'East (90°)', angle: 90 },
                { label: 'South (180°)', angle: 180 },
                { label: 'West (270°)', angle: 270 }
              ].map(p => (
                <button
                  key={p.angle}
                  onClick={() => setManualSimulationAngle(p.angle)}
                  className={`px-1.5 py-1 rounded border text-center font-bold cursor-pointer transition-colors ${
                    effectiveHeading === p.angle
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Relative +/- 45 deg buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => setManualSimulationAngle(((effectiveHeading - 45 + 360) % 360))}
              className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[11px] font-bold cursor-pointer"
            >
              ↺ Turn Left (-45°)
            </button>
            <button
              onClick={() => setManualSimulationAngle(((effectiveHeading + 45) % 360))}
              className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[11px] font-bold cursor-pointer"
            >
              ↻ Turn Right (+45°)
            </button>
          </div>

          {/* Smooth Slider (0 to 360) */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Manual Heading Dial:</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(effectiveHeading)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={Math.round(effectiveHeading)}
              onChange={(e) => setManualSimulationAngle(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Reset / Calibrate Button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
            {manualSimulationAngle !== null ? (
              <button
                onClick={() => setManualSimulationAngle(null)}
                className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer flex items-center space-x-1"
              >
                <span>↻ Reset to Live Sensor</span>
              </button>
            ) : (
              <span className="text-slate-500">Listening to gyro/magnetometer</span>
            )}
            <button
              onClick={async () => {
                if (compassTrackerRef.current?.requestPermission) {
                  await compassTrackerRef.current.requestPermission();
                }
              }}
              className="text-slate-400 hover:text-white cursor-pointer underline"
            >
              Calibrate Sensor
            </button>
          </div>
        </div>
      )}

      {/* Floating Tactical Compass Rose Dial Widget */}
      <div className="absolute bottom-14 left-3 z-20 flex flex-col items-center space-y-1 pointer-events-auto">
        <button
          onClick={() => setIsHeadingUp(!isHeadingUp)}
          title={isHeadingUp ? 'Heading-Up Active: Click to switch to North-Up' : 'North-Up Active: Click to switch to Heading-Up'}
          className={`relative w-12 h-12 rounded-full border-2 shadow-2xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
            isHeadingUp
              ? 'bg-slate-950/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-950/80 border-slate-700 hover:border-slate-500'
          }`}
        >
          {/* Compass Dial Face with Cardinal points (N at top) */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
            style={{ transform: `rotate(${isHeadingUp ? -effectiveHeading : 0}deg)` }}
          >
            {/* North Red Pointer */}
            <span className="absolute top-1 text-[9px] font-black text-rose-500">N</span>
            {/* South White Pointer */}
            <span className="absolute bottom-1 text-[8px] font-bold text-slate-400">S</span>
            {/* East / West */}
            <span className="absolute right-1 text-[8px] font-bold text-slate-500">E</span>
            <span className="absolute left-1 text-[8px] font-bold text-slate-500">W</span>

            {/* Center Pivot */}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 border border-white" />
          </div>

          {/* Heading badge indicator */}
          <div className="absolute -bottom-2 px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-[8px] font-mono font-extrabold text-cyan-300 whitespace-nowrap">
            {Math.round(effectiveHeading)}°
          </div>
        </button>
      </div>

      {/* Operational Alerts Drawer */}
      {showAlertsDrawer && (
        <div className="absolute top-14 left-3 sm:left-48 z-30 w-80 max-h-[480px] overflow-y-auto bg-slate-950/95 border border-rose-500/60 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 font-bold text-rose-400">
              <AlertTriangle size={15} />
              <span>Active Operational Alerts ({alerts?.length || 0})</span>
            </div>
            <button
              onClick={() => setShowAlertsDrawer(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {alerts?.map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px] truncate flex items-center space-x-1">
                    <span>🚨</span>
                    <span>{alt.title}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                      alt.severity === 'Critical'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {alt.severity}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">{alt.message}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Reported: {alt.time}</span>
                  <button
                    onClick={() => {
                      if (mapInstanceRef.current && alt.lat && alt.lng) {
                        mapInstanceRef.current.panTo({ lat: alt.lat, lng: alt.lng });
                        mapInstanceRef.current.setZoom(11);
                      }
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    Pan to Location ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 4: Real-Time Highway Navigation & Route-Risk Intelligence HUD */}
      {routeResult && activeLayers.routes && (
        <div className="absolute top-3 right-3 z-20 max-w-xs md:max-w-sm bg-slate-950/95 border border-emerald-500/60 p-3 rounded-xl shadow-2xl backdrop-blur-md text-[11px] space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 font-extrabold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="tracking-tight text-[10px] uppercase">
                {routeResult.source || (routeResult.is_real_google_route ? 'Google Routes API' : 'Google Highway Corridor')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleVoiceReadout}
                className={`p-1 rounded text-[9px] font-bold cursor-pointer transition-colors flex items-center space-x-1 ${
                  isSpeaking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white'
                }`}
                title="Read out route instructions and risk advisory aloud (Speech Synthesis)"
              >
                <Volume2 size={10} />
                <span>{isSpeaking ? 'Speaking...' : 'Voice'}</span>
              </button>
              <button
                onClick={handleCopyRoute}
                className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white cursor-pointer text-[9px] font-bold flex items-center space-x-1"
                title="Copy Route Manifest to Clipboard"
              >
                <Copy size={10} />
                <span>Copy</span>
              </button>
              <button
                onClick={() => setShowRiskDetail(!showRiskDetail)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer text-[9px] font-bold"
                title="Toggle Risk Intelligence Decomposition"
              >
                {showRiskDetail ? 'Hide Risk' : 'Risk Intel'}
              </button>
              <button
                onClick={computeRealGoogleRoute}
                disabled={isCalculatingDirections}
                title="Recalculate Real Google Route with Live Traffic (Google Routes API)"
                className="p-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 hover:text-white border border-emerald-600/40 cursor-pointer disabled:opacity-50 flex items-center space-x-1 text-[9px] font-bold"
              >
                <RefreshCw size={10} className={isCalculatingDirections ? 'animate-spin' : ''} />
                <span>{isCalculatingDirections ? 'Routing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Copy Toast feedback */}
          {copyToast && (
            <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded text-center shadow animate-in fade-in">
              ✓ Route Manifest Copied!
            </div>
          )}

          {/* Route distance & time summary */}
          <div className="text-white font-bold flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
            <span className="truncate max-w-[190px]">
              {routeResult.safest_route?.title?.replace(/^[^:]+:\s*/, '') || 'All-Weather Corridor'}
            </span>
            <span className="font-mono text-emerald-400 font-extrabold text-xs">
              {routeResult.distance?.text || `${routeResult.safest_route?.distance_km} km`} • {routeResult.duration?.text || routeResult.safest_route?.duration_text || `${routeResult.safest_route?.eta_hours}h`}
            </span>
          </div>

          {/* Turn-by-Turn Instruction */}
          {routeResult.safest_route?.navigation_steps && routeResult.safest_route.navigation_steps.length > 0 && (
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-300 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
              <Navigation size={11} className="text-emerald-400 flex-shrink-0 rotate-45" />
              <span className="line-clamp-1 font-medium text-slate-200">
                Next: {routeResult.safest_route.navigation_steps[0].instruction}
              </span>
              <span className="text-emerald-400 font-mono font-bold flex-shrink-0 text-[9px]">
                +{routeResult.safest_route.navigation_steps[0].distance_km}km
              </span>
            </div>
          )}

          {/* PHASE 4: Transparent Route-Risk Intelligence Decomposition */}
          {showRiskDetail && (
            <div className="pt-1.5 border-t border-slate-800 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[9px] flex items-center space-x-1">
                  <Shield size={10} className="text-emerald-400" />
                  <span>NER-LIFELINE Risk Score</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                    (routeResult.risk_assessment?.risk_level || routeResult.safest_route?.risk_level) === 'HIGH'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : (routeResult.risk_assessment?.risk_level || routeResult.safest_route?.risk_level) === 'MEDIUM'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {routeResult.risk_assessment?.total_risk_score || routeResult.safest_route?.risk_score || 62}/100 • {routeResult.risk_assessment?.risk_level || routeResult.safest_route?.risk_level || 'HIGH'}
                </span>
              </div>

              {/* 4 Factor Grid: Weather + Road Condition + Incident + Historical */}
              <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 text-[9px]">
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-slate-400">🌧️ Rainfall</span>
                  <span className="font-mono text-white font-bold">
                    {routeResult.risk_assessment?.rainfall_score ?? 25}/40
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-slate-400">🛣️ Road Cond</span>
                  <span className="font-mono text-white font-bold">
                    {routeResult.risk_assessment?.road_condition_score ?? 18}/25
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-slate-400">⚠️ Incidents</span>
                  <span className="font-mono text-white font-bold">
                    {routeResult.risk_assessment?.incident_score ?? 12}/20
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-slate-400">⛰️ Hist Vulnerability</span>
                  <span className="font-mono text-white font-bold">
                    {routeResult.risk_assessment?.historical_vulnerability_score ?? 10}/15
                  </span>
                </div>
              </div>

              {/* Operational Recommendation Box */}
              <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[10px] leading-tight">
                <strong>Recommendation:</strong> {routeResult.risk_assessment?.recommendation || routeResult.ai_recommendation?.safety_verdict || 'Maintain reduced speed. Monitor weather sensors at mountain passes.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Provenance Modal */}
      {showProvenanceInfo && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full p-4 rounded-xl shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <Shield size={16} className="text-emerald-400" />
                <span>NER-LIFELINE Architectural Invariants</span>
              </div>
              <button
                onClick={() => setShowProvenanceInfo(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-emerald-400 font-bold">🗺️ Geographic Map Provider:</span>
                <p className="mt-0.5 text-slate-300">
                  Google Maps Platform provides geographic base layers, 3D terrain, high-resolution satellite imagery, real-time traffic, and Google Routes API road geometries.
                </p>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-cyan-400 font-bold">🛡️ Operational Data Provider:</span>
                <p className="mt-0.5 text-slate-300">
                  NER-LIFELINE provides all operational telemetry: live fleet vehicle tracking, driver telemetry, field incident reports, road blockages, critical medical shipments, risk zones, and 0–100 route risk scores. Google does NOT provide operational risk scores or incident reports.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowProvenanceInfo(false)}
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs cursor-pointer transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Provenance & Attribution Status Footer */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-extrabold text-white">Google Maps Platform</span>
          <span className="text-slate-500">•</span>
          <span className="hidden sm:inline">Basemap & Routes</span>
          <span className="text-slate-500">•</span>
          <span className="font-semibold text-emerald-400">NER-LIFELINE Operational Data Active</span>
        </div>

        <button
          onClick={() => setShowProvenanceInfo(true)}
          className="flex items-center space-x-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 hover:text-white backdrop-blur-md shadow-lg pointer-events-auto cursor-pointer transition-all"
        >
          <Info size={11} className="text-emerald-400" />
          <span>Data Provenance</span>
        </button>
      </div>
    </div>
  );
}
