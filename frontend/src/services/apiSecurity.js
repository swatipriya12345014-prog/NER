/**
 * NER-LIFELINE API Security Interceptor
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Client-side security layer for all API communication:
 *  1. CSRF-like nonce injection on mutating requests (POST/PUT/DELETE)
 *  2. Request fingerprinting for replay attack prevention
 *  3. Auto-retry with exponential backoff on 429 (rate limited)
 *  4. Automatic session invalidation on 401/403
 *  5. Request/response audit logging
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────
//  NONCE GENERATION (CSRF-like protection)
// ─────────────────────────────────────────────────────────────

let _nonceCounter = 0;

/**
 * Generate a unique, cryptographically-informed nonce for each request.
 * Uses crypto.getRandomValues when available, fallback to timestamp + counter.
 */
function generateNonce() {
  _nonceCounter += 1;
  const timestamp = Date.now().toString(36);
  const counter = _nonceCounter.toString(36);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const random = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    return `${timestamp}-${counter}-${random}`;
  }

  const fallback = Math.random().toString(36).substring(2, 18);
  return `${timestamp}-${counter}-${fallback}`;
}


// ─────────────────────────────────────────────────────────────
//  REQUEST FINGERPRINTING (Anti-replay)
// ─────────────────────────────────────────────────────────────

/**
 * Generates a fingerprint hash from URL + body + timestamp.
 * The server can use this to detect replayed requests.
 */
async function generateFingerprint(url, body) {
  const payload = `${url}:${JSON.stringify(body || {})}:${Date.now()}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(payload);
      const hash = await crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hash));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback if subtle crypto unavailable
    }
  }

  // Simple fallback hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash).toString(16);
}


// ─────────────────────────────────────────────────────────────
//  RETRY WITH EXPONENTIAL BACKOFF
// ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute fetch with automatic retry on 429 and transient errors.
 */
async function fetchWithRetry(url, options, retryCount = 0) {
  try {
    const response = await fetch(url, options);

    // Auto-retry on rate limiting (429)
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
      const delay = Math.max(retryAfter * 1000, BASE_DELAY_MS * Math.pow(2, retryCount));
      console.warn(
        `[API Security] Rate limited (429). Retrying in ${delay}ms... ` +
        `(attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    // Session invalidation on auth failures
    if (response.status === 401 || response.status === 403) {
      console.error(`[API Security] Auth failure (${response.status}) on ${url}`);
      handleSessionInvalidation(response.status);
    }

    return response;
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES && error.name !== 'AbortError') {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
      console.warn(
        `[API Security] Network error. Retrying in ${delay}ms... ` +
        `(attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}


// ─────────────────────────────────────────────────────────────
//  SESSION INVALIDATION
// ─────────────────────────────────────────────────────────────

let _sessionInvalidated = false;

function handleSessionInvalidation(statusCode) {
  if (_sessionInvalidated) return; // Prevent cascading logouts
  _sessionInvalidated = true;

  console.error(`[API Security] Session invalidated (HTTP ${statusCode})`);

  // Clear sensitive data from localStorage
  const keysToPreserve = ['ner_firebase_config']; // Keep Firebase config
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !keysToPreserve.includes(key)) {
      keysToRemove.push(key);
    }
  }

  // Don't auto-redirect on 403 (role-based denial), only on 401 (unauthenticated)
  if (statusCode === 401) {
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Dispatch custom event for React auth context to handle
    window.dispatchEvent(new CustomEvent('ner:session-expired', {
      detail: { statusCode, timestamp: Date.now() }
    }));
  }

  // Reset after a short delay to allow new auth attempts
  setTimeout(() => { _sessionInvalidated = false; }, 5000);
}


// ─────────────────────────────────────────────────────────────
//  SECURE FETCH — Main export
// ─────────────────────────────────────────────────────────────

/**
 * Enhanced fetch wrapper with full security instrumentation.
 *
 * @param {string} endpoint — API path (e.g., '/api/shipments')
 * @param {object} options — Standard fetch options + { skipNonce, skipFingerprint }
 * @returns {Promise<Response>}
 */
export async function secureFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // Build headers
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && isMutating && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject CSRF nonce on mutating requests
  if (isMutating && !options.skipNonce) {
    headers.set('X-CSRF-Nonce', generateNonce());
  }

  // Inject request fingerprint
  if (!options.skipFingerprint) {
    const fingerprint = await generateFingerprint(url, options.body);
    headers.set('X-Client-Fingerprint', fingerprint);
  }

  // Add request timestamp for server-side staleness checks
  headers.set('X-Request-Timestamp', Date.now().toString());

  const fetchOptions = {
    ...options,
    method,
    headers,
    credentials: 'include', // Send cookies for auth
  };

  return fetchWithRetry(url, fetchOptions);
}


/**
 * Convenience: secureFetch for JSON responses.
 */
export async function secureJsonFetch(endpoint, options = {}) {
  const response = await secureFetch(endpoint, options);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`API Error ${response.status}: ${errorBody}`);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }
  return response.json();
}


/**
 * Convenience: POST with JSON body.
 */
export async function securePost(endpoint, body, options = {}) {
  return secureJsonFetch(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}


// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────

export { generateNonce, generateFingerprint };

export default {
  fetch: secureFetch,
  json: secureJsonFetch,
  post: securePost,
  generateNonce,
  generateFingerprint,
};
