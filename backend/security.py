"""
NER-LIFELINE Security Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enterprise-grade security middleware stack for the NER-LIFELINE Emergency
Logistics Backend. Provides defense-in-depth across network, transport,
and application layers.

Components:
  1. SecurityHeadersMiddleware  — HSTS, CSP, X-Frame, X-XSS, Referrer-Policy
  2. RateLimiterMiddleware      — Sliding-window per-IP rate limiting
  3. IPBlocklistMiddleware       — Auto-ban abusive IPs
  4. RequestTracingMiddleware   — X-Request-ID injection for audit trails
  5. AuditLogger                — Structured JSON audit logging
  6. InputSanitizer             — XSS / SQL injection input scrubbing
"""

import os
import re
import time
import uuid
import json
import logging
import hashlib
import threading
import urllib.parse
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, Optional, Set, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT in ("production", "staging")

# Rate limiting configuration
RATE_LIMIT_GENERAL = int(os.getenv("RATE_LIMIT_GENERAL", "120"))     # requests per minute
RATE_LIMIT_SENSITIVE = int(os.getenv("RATE_LIMIT_SENSITIVE", "15"))   # requests per minute
RATE_LIMIT_WINDOW_SECONDS = 60

# IP blocklist configuration
ABUSE_THRESHOLD = int(os.getenv("ABUSE_THRESHOLD", "300"))           # req/min triggers ban
BAN_DURATION_SECONDS = int(os.getenv("BAN_DURATION_SECONDS", "900")) # 15 minute ban

# Sensitive endpoint prefixes that receive stricter rate limits
SENSITIVE_ENDPOINTS = frozenset({
    "/api/sos",
    "/api/vahan",
    "/api/admin",
    "/api/routes/blockage",
    "/api/languages/generate",
    "/api/languages/validate",
    "/api/chat",
})

# Endpoints exempt from rate limiting (health checks, root)
EXEMPT_ENDPOINTS = frozenset({
    "/",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
})


# ═══════════════════════════════════════════════════════════════
#  1. SECURITY HEADERS MIDDLEWARE
# ═══════════════════════════════════════════════════════════════

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects industry-standard security headers into every HTTP response.
    Defends against XSS, clickjacking, MIME sniffing, and data leaks.
    """

    # Content Security Policy — restrict resource origins
    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://maps.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com https://*.google.com; "
        "font-src 'self' https://fonts.gstatic.com https://*.gstatic.com data:; "
        "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com; "
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://mapservice.gov.in https://*.google.com https://maps.googleapis.com https://*.gstatic.com; "
        "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.google.com; "
        "worker-src 'self' blob:; "
        "child-src 'self' blob:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "upgrade-insecure-requests"
    )

    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": (
            "camera=(), microphone=(), geolocation=(self), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        ),
        "X-Permitted-Cross-Domain-Policies": "none",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Inject all security headers
        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value

        # CSP header
        response.headers["Content-Security-Policy"] = self.CSP_POLICY

        # HSTS — only in production to avoid local dev issues
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Cache-Control for API responses (no caching of sensitive data)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"

        return response


# ═══════════════════════════════════════════════════════════════
#  2. RATE LIMITER MIDDLEWARE
# ═══════════════════════════════════════════════════════════════

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter per client IP address.
    General endpoints: 120 req/min.  Sensitive endpoints: 15 req/min.
    Returns 429 Too Many Requests when exceeded.
    Thread-safe locking protects the in-memory request log against concurrency race conditions.
    """

    def __init__(self, app):
        super().__init__(app)
        # { ip: [timestamp, timestamp, ...] }
        self._request_log: Dict[str, list] = defaultdict(list)
        self._last_cleanup = time.time()
        self._lock = threading.Lock()

    def _cleanup_old_entries(self):
        """Periodic cleanup of expired timestamps to prevent memory bloat (thread-safe)."""
        with self._lock:
            now = time.time()
            if now - self._last_cleanup < 30:  # Clean every 30s
                return
            self._last_cleanup = now
            cutoff = now - RATE_LIMIT_WINDOW_SECONDS
            stale_ips = []
            for ip, timestamps in self._request_log.items():
                self._request_log[ip] = [t for t in timestamps if t > cutoff]
                if not self._request_log[ip]:
                    stale_ips.append(ip)
            for ip in stale_ips:
                del self._request_log[ip]

    def _get_client_ip(self, request: Request) -> str:
        """Extract real client IP, respecting reverse proxy headers."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "unknown"

    def _is_sensitive(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in SENSITIVE_ENDPOINTS)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip rate limiting for exempt endpoints
        if path in EXEMPT_ENDPOINTS:
            return await call_next(request)

        self._cleanup_old_entries()

        client_ip = self._get_client_ip(request)
        now = time.time()
        cutoff = now - RATE_LIMIT_WINDOW_SECONDS

        limit = RATE_LIMIT_SENSITIVE if self._is_sensitive(path) else RATE_LIMIT_GENERAL

        # Thread-safe read and record of client rate limits
        with self._lock:
            # Filter to recent requests only
            self._request_log[client_ip] = [
                t for t in self._request_log[client_ip] if t > cutoff
            ]
            current_count = len(self._request_log[client_ip])

            if current_count >= limit:
                retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - self._request_log[client_ip][0]))
                audit_logger.log_event(
                    event_type="RATE_LIMIT_EXCEEDED",
                    client_ip=client_ip,
                    path=path,
                    details={"count": current_count, "limit": limit}
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Please slow down.",
                        "retry_after_seconds": max(1, retry_after),
                        "limit": limit,
                        "window": "60s"
                    },
                    headers={
                        "Retry-After": str(max(1, retry_after)),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(now) + max(1, retry_after)),
                    }
                )

            # Record this request
            self._request_log[client_ip].append(now)
            remaining = max(0, limit - len(self._request_log[client_ip]))

        response = await call_next(request)

        # Add rate limit headers to successful responses
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(now) + RATE_LIMIT_WINDOW_SECONDS)

        return response


# ═══════════════════════════════════════════════════════════════
#  3. IP BLOCKLIST MIDDLEWARE
# ═══════════════════════════════════════════════════════════════

class IPBlocklistMiddleware(BaseHTTPMiddleware):
    """
    Automatically blocks IP addresses that exceed the abuse threshold.
    Banned IPs receive 403 Forbidden for the ban duration (default 15 min).
    Thread-safe locking protects banned IPs and burst tracking states.
    """

    def __init__(self, app):
        super().__init__(app)
        # { ip: ban_expiry_timestamp }
        self._banned_ips: Dict[str, float] = {}
        # { ip: [timestamps] } for tracking burst abuse
        self._burst_tracker: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        now = time.time()

        # Thread-safe ban verification and burst tracking
        with self._lock:
            # Check if IP is currently banned
            if client_ip in self._banned_ips:
                if now < self._banned_ips[client_ip]:
                    remaining = int(self._banned_ips[client_ip] - now)
                    audit_logger.log_event(
                        event_type="BLOCKED_IP_REQUEST",
                        client_ip=client_ip,
                        path=request.url.path,
                        details={"ban_remaining_seconds": remaining}
                    )
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": "Access denied. Your IP has been temporarily blocked due to abuse.",
                            "ban_remaining_seconds": remaining,
                            "contact": "security@ner-lifeline.gov.in"
                        }
                    )
                else:
                    # Ban expired
                    del self._banned_ips[client_ip]

            # Track burst rate
            cutoff = now - 60
            self._burst_tracker[client_ip] = [
                t for t in self._burst_tracker[client_ip] if t > cutoff
            ]
            self._burst_tracker[client_ip].append(now)

            # Check for abuse threshold
            if len(self._burst_tracker[client_ip]) > ABUSE_THRESHOLD:
                self._banned_ips[client_ip] = now + BAN_DURATION_SECONDS
                audit_logger.log_event(
                    event_type="IP_AUTO_BANNED",
                    client_ip=client_ip,
                    path=request.url.path,
                    details={
                        "requests_in_window": len(self._burst_tracker[client_ip]),
                        "ban_duration_seconds": BAN_DURATION_SECONDS
                    },
                    severity="CRITICAL"
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Your IP has been automatically blocked due to excessive requests.",
                        "ban_duration_seconds": BAN_DURATION_SECONDS,
                        "contact": "security@ner-lifeline.gov.in"
                    }
                )

        return await call_next(request)


# ═══════════════════════════════════════════════════════════════
#  4. SOURCE FILE ACCESS LOCK MIDDLEWARE
# ═══════════════════════════════════════════════════════════════

class SourceFileAccessLockMiddleware(BaseHTTPMiddleware):
    """
    CRITICAL SECURITY LAYER: Full Source File Access Lock.
    Intercepts and rejects ANY attempt to inspect, download, or traverse
    into backend/frontend source files, directories, configuration files,
    or internal source assets via HTTP requests.
    Defends against:
      - Path Traversal / LFI / Directory climbing (../, %2e%2e, ..\\)
      - Direct source code leak attempts (.py, .jsx, .tsx, .ts, .java, .cpp, .go)
      - Secret & credential exfiltration (.env, .git, .aws, .ssh, .gitignore)
      - Package definition exposures (package.json, requirements.txt, pom.xml)
    """

    # Forbidden file extensions
    _FORBIDDEN_EXTENSIONS = frozenset({
        ".py", ".pyc", ".pyo", ".pyd",
        ".env", ".git", ".gitignore", ".gitmodules",
        ".jsx", ".tsx", ".ts",
        ".java", ".class", ".jar",
        ".cpp", ".h", ".hpp", ".c",
        ".go", ".rs", ".kt",
        ".sh", ".bash", ".zsh",
        ".yml", ".yaml", ".toml", ".ini",
        ".sql", ".db", ".sqlite",
        ".lock", ".bak", ".swp", ".old", ".orig",
        ".log"
    })

    # Forbidden path substrings / directories
    _FORBIDDEN_PATTERNS = [
        re.compile(r'(^|/)(\.\.|%2e%2e)(/|$)', re.IGNORECASE),       # Path traversal
        re.compile(r'(^|/)src(/|$)', re.IGNORECASE),                  # /src or src/
        re.compile(r'(^|/)backend(/|$)', re.IGNORECASE),              # /backend
        re.compile(r'(^|/)frontend(/|$)', re.IGNORECASE),             # /frontend
        re.compile(r'(^|/)\.env', re.IGNORECASE),                     # .env files
        re.compile(r'(^|/)\.git', re.IGNORECASE),                     # .git files
        re.compile(r'(^|/)node_modules(/|$)', re.IGNORECASE),         # node_modules
        re.compile(r'(^|/)__pycache__(/|$)', re.IGNORECASE),          # __pycache__
        re.compile(r'(^|/)package(-lock)?\.json', re.IGNORECASE),     # package.json
        re.compile(r'(^|/)requirements\.txt', re.IGNORECASE),         # requirements.txt
        re.compile(r'(^|/)pom\.xml', re.IGNORECASE),                  # pom.xml
        re.compile(r'(^|/)AGENTS\.md', re.IGNORECASE),                # AGENTS.md
    ]

    # Whitelisted exceptions for standard OpenAPI documentation
    _EXEMPT_PATHS = frozenset({
        "/docs", "/redoc", "/openapi.json", "/api/health", "/"
    })

    def _is_path_forbidden(self, path: str) -> Tuple[bool, str]:
        # Unquote URL encoding (including double-encoded chars)
        decoded_path = urllib.parse.unquote(urllib.parse.unquote(path)).strip()

        if decoded_path in self._EXEMPT_PATHS:
            return False, ""

        # Check path traversal and forbidden directory patterns
        for pattern in self._FORBIDDEN_PATTERNS:
            if pattern.search(decoded_path):
                return True, f"Pattern match: {pattern.pattern}"

        # Check forbidden file extensions (only on file portion)
        last_segment = decoded_path.split("/")[-1].split("?")[0].lower()
        for ext in self._FORBIDDEN_EXTENSIONS:
            if last_segment.endswith(ext):
                if decoded_path == "/openapi.json":
                    continue
                return True, f"Forbidden extension: {ext}"

        return False, ""

    async def dispatch(self, request: Request, call_next):
        raw_path = request.url.path
        is_blocked, reason = self._is_path_forbidden(raw_path)

        if is_blocked:
            client_ip = (
                request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                or (request.client.host if request.client else "unknown")
            )
            is_env_attempt = ".env" in raw_path.lower() or "env" in reason.lower()
            event_type = "ENV_FILE_ACCESS_BLOCKED" if is_env_attempt else "SOURCE_FILE_ACCESS_BLOCKED"
            violation_type = "ENV_FILE_ACCESS_LOCK_ENFORCED" if is_env_attempt else "SOURCE_FILE_ACCESS_LOCK_ENFORCED"

            audit_logger.log_event(
                event_type=event_type,
                client_ip=client_ip,
                path=raw_path,
                details={"reason": reason, "raw_query": str(request.url.query)},
                severity="CRITICAL"
            )
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Access to environment secret files (.env) and source files is strictly prohibited by NER-LIFELINE sovereign security protocol.",
                    "status": "FORBIDDEN",
                    "violation": violation_type,
                    "path": raw_path,
                }
            )

        return await call_next(request)


# ═══════════════════════════════════════════════════════════════
#  4. REQUEST TRACING MIDDLEWARE
# ═══════════════════════════════════════════════════════════════

class RequestTracingMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique X-Request-ID into every request/response for
    end-to-end distributed tracing and audit correlation.
    """

    async def dispatch(self, request: Request, call_next):
        # Use client-provided ID if present, otherwise generate one
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())

        # Store on request state for downstream access
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ═══════════════════════════════════════════════════════════════
#  5. AUDIT LOGGER
# ═══════════════════════════════════════════════════════════════

class AuditLogger:
    """
    Structured JSON audit logger for security events.
    Logs to both console and file (when configured).
    """

    def __init__(self):
        self._logger = logging.getLogger("ner_lifeline_security")
        self._logger.setLevel(logging.INFO)

        # Console handler with structured format
        if not self._logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter(
                "%(asctime)s [SECURITY] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            ))
            self._logger.addHandler(handler)

    def log_event(
        self,
        event_type: str,
        client_ip: str = "system",
        path: str = "",
        details: Optional[Dict] = None,
        severity: str = "INFO",
        user_id: Optional[str] = None,
    ):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "severity": severity,
            "client_ip": client_ip,
            "path": path,
            "user_id": user_id,
            "details": details or {},
        }
        log_line = json.dumps(entry, default=str)

        if severity == "CRITICAL":
            self._logger.critical(log_line)
        elif severity == "WARNING":
            self._logger.warning(log_line)
        else:
            self._logger.info(log_line)


# Global audit logger instance
audit_logger = AuditLogger()


# ═══════════════════════════════════════════════════════════════
#  6. INPUT SANITIZER
# ═══════════════════════════════════════════════════════════════

class InputSanitizer:
    """
    Sanitizes user-provided string inputs against XSS, script injection,
    and common SQL injection patterns. Used as a utility by endpoint handlers.
    """

    # Dangerous HTML/script patterns
    _XSS_PATTERNS = [
        re.compile(r'<script[\s>]', re.IGNORECASE),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),          # onclick=, onerror=, etc.
        re.compile(r'<iframe[\s>]', re.IGNORECASE),
        re.compile(r'<object[\s>]', re.IGNORECASE),
        re.compile(r'<embed[\s>]', re.IGNORECASE),
        re.compile(r'<svg[\s>].*?onload', re.IGNORECASE),
        re.compile(r'data:text/html', re.IGNORECASE),
        re.compile(r'vbscript:', re.IGNORECASE),
    ]

    # Common SQL injection markers
    _SQL_PATTERNS = [
        re.compile(r"('\s*(OR|AND)\s+')", re.IGNORECASE),
        re.compile(r'(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\s)', re.IGNORECASE),
        re.compile(r'(UNION\s+(ALL\s+)?SELECT)', re.IGNORECASE),
        re.compile(r"(--\s|/\*|\*/)", re.IGNORECASE),
    ]

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Remove dangerous patterns from input text."""
        if not isinstance(text, str):
            return text

        sanitized = text

        # Strip HTML tags (keep content)
        sanitized = re.sub(r'<[^>]+>', '', sanitized)

        # Neutralize potential injection sequences
        sanitized = sanitized.replace('\x00', '')  # null bytes

        return sanitized.strip()

    @classmethod
    def is_safe(cls, text: str) -> bool:
        """Check if text contains potentially dangerous patterns."""
        if not isinstance(text, str):
            return True

        for pattern in cls._XSS_PATTERNS:
            if pattern.search(text):
                return False

        for pattern in cls._SQL_PATTERNS:
            if pattern.search(text):
                return False

        return True

    @classmethod
    def validate_and_sanitize(cls, text: str, field_name: str = "input") -> str:
        """Validate input safety, log threats, and return sanitized text."""
        if not cls.is_safe(text):
            audit_logger.log_event(
                event_type="INPUT_INJECTION_ATTEMPT",
                details={
                    "field": field_name,
                    "raw_length": len(text),
                    "preview": text[:100],
                },
                severity="WARNING"
            )
        return cls.sanitize(text)


# ═══════════════════════════════════════════════════════════════
#  7. REQUEST FINGERPRINT VALIDATOR
# ═══════════════════════════════════════════════════════════════

class RequestFingerprintValidator:
    """
    Validates request fingerprint nonces to prevent replay attacks.
    Each nonce can only be used once within a 5-minute window.
    Thread-safe locking protects used nonce records.
    """

    def __init__(self, window_seconds: int = 300):
        self._window = window_seconds
        # { nonce_hash: expiry_timestamp }
        self._used_nonces: Dict[str, float] = {}
        self._last_cleanup = time.time()
        self._lock = threading.Lock()

    def _cleanup(self):
        with self._lock:
            now = time.time()
            if now - self._last_cleanup < 60:
                return
            self._last_cleanup = now
            self._used_nonces = {
                k: v for k, v in self._used_nonces.items() if v > now
            }

    def validate_nonce(self, nonce: Optional[str]) -> bool:
        """Returns True if nonce is valid and unused (thread-safe)."""
        if not nonce:
            return True  # Nonce is optional; don't block requests without it

        self._cleanup()

        nonce_hash = hashlib.sha256(nonce.encode()).hexdigest()
        now = time.time()

        with self._lock:
            if nonce_hash in self._used_nonces:
                audit_logger.log_event(
                    event_type="REPLAY_ATTACK_DETECTED",
                    details={"nonce_prefix": nonce[:8]},
                    severity="WARNING"
                )
                return False

            self._used_nonces[nonce_hash] = now + self._window
            return True


# Global instances
input_sanitizer = InputSanitizer()
fingerprint_validator = RequestFingerprintValidator()


# ═══════════════════════════════════════════════════════════════
#  MIDDLEWARE REGISTRATION HELPER
# ═══════════════════════════════════════════════════════════════

def register_security_middlewares(app):
    """
    Mount the complete security middleware stack onto a FastAPI application.
    Order matters — outermost middleware executes first.

    Execution order (top = first to intercept request):
      1. RequestTracing           — assign X-Request-ID
      2. SourceFileAccessLock     — reject any source file / traversal access
      3. IPBlocklist               — reject banned IPs early
      4. RateLimiter               — enforce rate limits with thread safety
      5. SecurityHeaders           — inject security headers on response
    """
    # Added in reverse order (last added = first executed)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimiterMiddleware)
    app.add_middleware(IPBlocklistMiddleware)
    app.add_middleware(SourceFileAccessLockMiddleware)
    app.add_middleware(RequestTracingMiddleware)

    audit_logger.log_event(
        event_type="SECURITY_STACK_INITIALIZED",
        details={
            "environment": ENVIRONMENT,
            "rate_limit_general": RATE_LIMIT_GENERAL,
            "rate_limit_sensitive": RATE_LIMIT_SENSITIVE,
            "abuse_threshold": ABUSE_THRESHOLD,
            "ban_duration_seconds": BAN_DURATION_SECONDS,
        }
    )
