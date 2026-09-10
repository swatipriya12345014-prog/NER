// ═══════════════════════════════════════════════════════════════
// GPS NAVIGATOR SERVICE — Real-Time Device Tracking & Fleet Sync
// ═══════════════════════════════════════════════════════════════
// Wraps Browser Geolocation API + WebSocket + REST for full GPS stack.
// Offline-resilient: degrades gracefully when backend is unreachable.

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};
const API_BASE_URL = getApiBase();
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// ─────────────────────────────────────────────────────────────
// 1. Browser Geolocation API — Device GPS Tracking
// ─────────────────────────────────────────────────────────────

/**
 * Start watching the device's GPS position using the browser Geolocation API.
 * Returns a watchId that can be used to stop tracking.
 *
 * @param {Function} onUpdate - Callback receiving { lat, lng, altitude_m, speed_kmh, heading_deg, accuracy_m, timestamp }
 * @param {Function} onError - Callback receiving error object
 * @returns {number|null} watchId or null if geolocation unavailable
 */
export function startGPSTracking(onUpdate, onError) {
  if (!navigator.geolocation) {
    console.warn('GPS: Browser Geolocation API not available');
    if (onError) onError({ code: 0, message: 'Geolocation not supported by this browser' });
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, altitude, speed, heading, accuracy } = position.coords;

      const gpsData = {
        lat: latitude,
        lng: longitude,
        altitude_m: altitude !== null ? Math.round(altitude * 10) / 10 : null,
        speed_kmh: speed !== null ? Math.round(speed * 3.6 * 10) / 10 : null, // m/s -> km/h
        heading_deg: heading !== null ? Math.round(heading * 10) / 10 : null,
        accuracy_m: accuracy !== null ? Math.round(accuracy * 10) / 10 : null,
        timestamp: new Date(position.timestamp).toISOString(),
      };

      onUpdate(gpsData);
    },
    (error) => {
      console.error('GPS Geolocation error:', error);
      if (onError) onError(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    }
  );

  console.log('GPS: Tracking started, watchId:', watchId);
  return watchId;
}

/**
 * Stop watching the device's GPS position.
 * @param {number} watchId
 */
export function stopGPSTracking(watchId) {
  if (watchId !== null && watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
    console.log('GPS: Tracking stopped, watchId:', watchId);
  }
}

/**
 * Converts heading degrees (0-360) into standard cardinal points (N, NE, E, SE, etc.)
 */
export function getCompassCardinal(deg) {
  if (deg === null || deg === undefined || isNaN(deg)) return 'N';
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

/**
 * Listen to the device's compass / orientation sensor.
 * Supports iOS Safari webkitCompassHeading, Android Chrome deviceorientationabsolute,
 * and standard DeviceOrientationEvent with low-pass angular filtering.
 *
 * @param {Function} onHeadingUpdate - Callback receiving (headingDeg: number, isSensorsActive: boolean)
 * @returns {{ stop: Function, requestPermission: Function }}
 */
export function startCompassTracking(onHeadingUpdate) {
  let active = true;
  let lastHeading = null;

  const updateHeading = (rawHeading) => {
    if (!active || rawHeading === null || rawHeading === undefined || isNaN(rawHeading)) return;
    let heading = (rawHeading % 360 + 360) % 360;

    // Angular low-pass filter to prevent erratic needle jitter
    if (lastHeading !== null) {
      let diff = heading - lastHeading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      heading = (lastHeading + diff * 0.40 + 360) % 360;
    }
    lastHeading = heading;
    onHeadingUpdate(Math.round(heading * 10) / 10, true);
  };

  const handleOrientation = (e) => {
    // 1. iOS Safari: webkitCompassHeading gives heading relative to magnetic north (0-360, clockwise)
    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      updateHeading(e.webkitCompassHeading);
    }
    // 2. Android Chrome: deviceorientationabsolute gives absolute orientation
    else if (e.absolute && e.alpha !== null && e.alpha !== undefined) {
      updateHeading(360 - e.alpha);
    }
    // 3. Fallback alpha
    else if (e.alpha !== null && e.alpha !== undefined) {
      updateHeading(360 - e.alpha);
    }
  };

  // Attach orientation listeners
  if (typeof window !== 'undefined') {
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  return {
    stop: () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    },
    requestPermission: async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const res = await DeviceOrientationEvent.requestPermission();
          return res === 'granted';
        } catch (err) {
          console.warn('Compass permission error:', err);
          return false;
        }
      }
      return true;
    }
  };
}

/**
 * 3-Axis Gyroscope & Attitude Heading Reference System (AHRS / IMU) Tracker
 * Reads Yaw (heading α), Pitch (incline/grade β), and Roll (bank/tilt γ) with angular smoothing.
 *
 * @param {Function} onGyroUpdate - Callback receiving ({ yaw, pitch, roll, isSensorActive, timestamp })
 * @returns {{ stop: Function, requestPermission: Function }}
 */
export function startGyroscopeTracking(onGyroUpdate) {
  let active = true;
  let lastYaw = null;
  let lastPitch = null;
  let lastRoll = null;

  const filterAngle = (newAngle, lastAngle, isCyclic = false) => {
    if (newAngle === null || newAngle === undefined || isNaN(newAngle)) return lastAngle || 0;
    if (lastAngle === null) return newAngle;
    if (isCyclic) {
      let diff = newAngle - lastAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return (lastAngle + diff * 0.35 + 360) % 360;
    }
    return lastAngle + (newAngle - lastAngle) * 0.35;
  };

  const handleOrientation = (e) => {
    if (!active) return;
    // Yaw / Heading (alpha): 0-360 deg
    let yaw = 0;
    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      yaw = e.webkitCompassHeading;
    } else if (e.alpha !== null && e.alpha !== undefined) {
      yaw = (360 - e.alpha) % 360;
    }

    // Pitch (beta): front/back vehicle tilt (-180 to 180, clamped -90 to 90)
    let pitch = e.beta !== null && e.beta !== undefined ? Math.max(-90, Math.min(90, e.beta)) : 0;

    // Roll (gamma): left/right lateral tilt (-90 to 90)
    let roll = e.gamma !== null && e.gamma !== undefined ? Math.max(-90, Math.min(90, e.gamma)) : 0;

    yaw = filterAngle(yaw, lastYaw, true);
    pitch = filterAngle(pitch, lastPitch, false);
    roll = filterAngle(roll, lastRoll, false);

    lastYaw = yaw;
    lastPitch = pitch;
    lastRoll = roll;

    onGyroUpdate({
      yaw: Math.round(yaw * 10) / 10,
      pitch: Math.round(pitch * 10) / 10,
      roll: Math.round(roll * 10) / 10,
      isSensorActive: true,
      timestamp: Date.now()
    });
  };

  if (typeof window !== 'undefined') {
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  return {
    stop: () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    },
    requestPermission: async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const res = await DeviceOrientationEvent.requestPermission();
          return res === 'granted';
        } catch (err) {
          console.warn('Gyroscope permission error:', err);
          return false;
        }
      }
      return true;
    }
  };
}


// ─────────────────────────────────────────────────────────────
// 2. REST API — GPS Location CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Send a GPS update to the backend (POST /api/gps/update).
 * The backend persists it and broadcasts to all WebSocket clients.
 *
 * @param {Object} data - { device_id, lat, lng, altitude_m?, speed_kmh?, heading_deg?, accuracy_m?, timestamp? }
 * @returns {Object|null} The server-confirmed GPS record, or null on failure
 */
export async function sendGPSUpdate(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/gps/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.warn('GPS: Failed to send update to backend', res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('GPS: Backend unreachable for GPS update (offline mode)', err.message);
    return null;
  }
}

/**
 * Fetch latest GPS positions for all tracked devices.
 * @returns {Array} Array of GPSDeviceLatest objects
 */
export async function fetchLatestPositions() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/gps/latest`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('GPS: Cannot fetch latest positions (offline)', err.message);
    return [];
  }
}

/**
 * Fetch GPS track history for a specific device.
 * @param {string} deviceId
 * @param {number} limit - Max number of track points (default 100)
 * @returns {Array} Array of GPSTrackPoint objects
 */
export async function fetchGPSHistory(deviceId, limit = 100) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/gps/history/${deviceId}?limit=${limit}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('GPS: Cannot fetch history (offline)', err.message);
    return [];
  }
}


// ─────────────────────────────────────────────────────────────
// 3. WebSocket — Real-Time GPS Stream with Auto-Reconnect
// ─────────────────────────────────────────────────────────────

/**
 * Connect to the GPS WebSocket for real-time fleet position streaming.
 * Automatically reconnects on disconnection (exponential backoff up to 30s).
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onGPSUpdate - Called with { device_id, lat, lng, ... } for each real-time update
 * @param {Function} callbacks.onInitialState - Called with Array of initial positions on connect
 * @param {Function} callbacks.onConnect - Called when WebSocket opens
 * @param {Function} callbacks.onDisconnect - Called when WebSocket closes
 * @param {Function} callbacks.onError - Called on WebSocket error
 * @returns {Object} Controller with { close(), send(data), isConnected() }
 */
export function connectGPSWebSocket(callbacks = {}) {
  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  let isManuallyClosed = false;

  function connect() {
    if (isManuallyClosed) return;

    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws/gps`);
    } catch (err) {
      console.warn('GPS WebSocket: Connection failed', err.message);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      console.log('GPS WebSocket: Connected');
      if (callbacks.onConnect) callbacks.onConnect();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'gps_update' && callbacks.onGPSUpdate) {
          callbacks.onGPSUpdate(msg.data);
        } else if (msg.type === 'initial_state' && callbacks.onInitialState) {
          callbacks.onInitialState(msg.data);
        } else if (msg.type === 'error') {
          console.warn('GPS WebSocket server error:', msg.message);
        }
      } catch (parseErr) {
        console.warn('GPS WebSocket: Failed to parse message', parseErr);
      }
    };

    ws.onclose = (event) => {
      console.log('GPS WebSocket: Disconnected', event.code, event.reason);
      if (callbacks.onDisconnect) callbacks.onDisconnect();
      if (!isManuallyClosed) {
        scheduleReconnect();
      }
    };

    ws.onerror = (error) => {
      console.warn('GPS WebSocket: Error', error);
      if (callbacks.onError) callbacks.onError(error);
    };
  }

  function scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts++;
    console.log(`GPS WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
    reconnectTimeout = setTimeout(connect, delay);
  }

  // Start connection
  connect();

  // Return controller
  return {
    close() {
      isManuallyClosed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
        ws = null;
      }
    },
    send(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    isConnected() {
      return ws && ws.readyState === WebSocket.OPEN;
    },
  };
}
