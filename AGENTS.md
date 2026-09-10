# AGENTS.md — NER-LIFELINE System Directives & Architecture

Welcome to **NER-LIFELINE** (AI-Powered Smart Logistics & Accessibility Platform for the North Eastern Region of India).
All agents, subagents, and developers working on this codebase MUST adhere strictly to the directives and constraints outlined in this document.

---

## 1. Project Directory Architecture

The repository is organized into distinct functional layers:

```text
NER-LIFELINE/
├── frontend/          # React 19 + Vite + Tailwind CSS v4 UI layer
├── backend/           # FastAPI async backend + Supabase PostgreSQL client
├── hardware/          # IoT / LoRa / ESP32 mesh communication & telemetry
└── AGENTS.md          # Architectural rules, guidelines, and constraints
```

---

## 2. Core Architectural Invariants

### 🔑 Authentication: Firebase Auth
- **Login, Google OAuth, and user identity management** MUST be handled exclusively via **Firebase Authentication**.
- Supports Google OAuth 2.0 with account selection, role-based session persistence, and official emergency services credentials.
- Firebase credentials are configured in `frontend/.env` (and dashboard environments).
- Fallback configuration ensures preview and build stability without external breakage.

### 🗄️ Operational & Analytical Data: Supabase PostgreSQL
- **Supabase PostgreSQL** is the single source of truth for **operational data**:
  - Critical medical & disaster relief shipments.
  - Route risk indices, road blockage reports, and terrain vulnerability scores.
  - Emergency vehicle fleet statuses and driver telemetry.
  - Incident response dispatch logs and coordination feeds.
- Relational tables, foreign keys, row-level security (RLS), and geospatial attributes must be modeled in Supabase PostgreSQL.

### ⚡ Backend Engine: FastAPI
- **FastAPI** (Python 3.10+) serves as the API and asynchronous calculation engine:
  - Consumes vehicle and sensor telemetry from the hardware mesh.
  - Computes dynamic route risk indices (monsoon, landslide, road blockage).
  - Interfaces directly with Supabase PostgreSQL via the official Supabase Python client.
  - Provides RESTful JSON APIs and WebSocket streams to the `frontend/` UI.

---

## 3. Strict Prohibitions & Resource Limits

### 🚫 Map Library Prohibitions: NO Leaflet / React-Leaflet
- **DO NOT install or use `leaflet` or `react-leaflet` under any circumstances.**
- **DO NOT add any third-party map providers** (Mapbox, Google Maps API, Bing Maps, MapLibre, etc.) unless the team lead explicitly changes this requirement in writing.
- **Why?** Remote disaster logistics in North East India frequently encounter complete network blackouts and bandwidth constraints. External map SDKs cause massive payload bloat, brittle CDN dependencies, and rate limits.
- **Allowed Solutions**:
  1. **Official Sovereign Indian GIS**: **Bharat Maps / NIC Map Service** (`https://mapservice.gov.in/gismapserviceMVC`), the official National Informatics Centre / MeitY geospatial portal.
  2. **Offline Emergency Mode**: Lightweight, self-contained SVG/Canvas vector maps specifically tailored to the 8 North Eastern states with zero external network dependencies for complete blackout resilience.

### 🛑 MANDITORILY DO NOT USE EXTRA LIMITS
- Do NOT add external dependencies with paid tiers, strict rate limits, or billable API quotas.
- Every capability must function reliably within free tiers, open protocols, and offline-resilient local environments.
- Keep agent workflows, subagent invocations, and network requests token-efficient and bounded.

---

## 4. Communication & Hardware Resilience
- The `hardware/` layer specifies the **LIFELINE MESH** protocol:
  - Operating over LoRa (865–867 MHz India band) and ESP32 nodes.
  - Stores packets locally when gateways are unreachable and forwards when a mesh route opens (Store-and-Forward / DTN).
  - Ingested via FastAPI backend into Supabase PostgreSQL.

---

## 5. Development Guidelines
- Always verify build integrity: `npm run build` inside `frontend/`.
- Ensure type safety and clean modular separation between UI, business logic, and API clients.
- Never commit private service role master keys or sensitive API secrets.
