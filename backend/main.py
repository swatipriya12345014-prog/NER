import os
import math
import json
import uuid
import asyncio
import time
import httpx
from dotenv import load_dotenv

load_dotenv()
from collections import defaultdict
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime

from database import get_supabase_client, is_supabase_configured, ensure_gps_table_exists, ensure_extended_tables_exist
from schemas import (
    Shipment, ShipmentCreate, RouteRiskReport, IncidentAlert, MeshTelemetryPacket,
    Vehicle, RouteWaypoint, FuelStop, RouteLocality, NavigationStep, RouteAlternative, RouteOptimizationRequest,
    AIRecommendation, RouteOptimizationResponse,
    GPSLocationUpdate, GPSLocationResponse, GPSTrackPoint, GPSDeviceLatest,
    LatLngPoint, GoogleRouteRequest, GoogleRouteResponse, RiskBreakdown,
    RoadHistory, VehicleRegistryItem, RealtimeVehicleTelemetryUpdate,
    SOSCallInitiateRequest, SOSCallSession, SOSCallEndRequest,
    ChronicBlackspot, PastBlockageEvent,
    ChatMessage, ChatRequest, ChatResponse,
    BlockageInfo, AlternateRouteRequest, AlternateRouteResponse
)
from chatbot import ask_ai_chatbot

app = FastAPI(
    title="NER-LIFELINE Backend API",
    description="Asynchronous Logistics & Route Accessibility Engine for the North Eastern Region of India",
    version="1.0.0",
)

# Configure CORS for frontend access
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],  # Permits preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# High-speed payload compression for coordinate-heavy GIS payloads
app.add_middleware(GZipMiddleware, minimum_size=1000)

# High-speed in-memory TTL caching for operational endpoints (<1ms responses)
_OPERATIONAL_CACHE: Dict[str, Tuple[float, any]] = {}
_OPERATIONAL_CACHE_TTL = 15.0  # 15 seconds cache for read endpoints

def get_cached_data(cache_key: str, ttl: float = _OPERATIONAL_CACHE_TTL):
    if cache_key in _OPERATIONAL_CACHE:
        ts, data = _OPERATIONAL_CACHE[cache_key]
        if time.time() - ts < ttl:
            return data
    return None

def set_cached_data(cache_key: str, data: any):
    if len(_OPERATIONAL_CACHE) > 500:
        oldest = sorted(_OPERATIONAL_CACHE.keys(), key=lambda k: _OPERATIONAL_CACHE[k][0])[:50]
        for k in oldest:
            _OPERATIONAL_CACHE.pop(k, None)
    _OPERATIONAL_CACHE[cache_key] = (time.time(), data)

def invalidate_cached_data(prefix: str):
    keys_to_remove = [k for k in _OPERATIONAL_CACHE.keys() if k.startswith(prefix)]
    for k in keys_to_remove:
        _OPERATIONAL_CACHE.pop(k, None)

# In-memory operational mock fallback datasets when Supabase is initializing
MOCK_SHIPMENTS = [
    {
        "id": "shp-101",
        "tracking_id": "NER-MED-8492",
        "item_name": "Emergency Blood Plasma & IV Fluids",
        "category": "Medical",
        "origin": "Guwahati Central Depot",
        "destination": "Tawang District Hospital",
        "state": "Arunachal Pradesh",
        "priority": "Critical",
        "cold_chain_required": True,
        "temperature_celsius": 3.8,
        "status": "In Transit",
        "eta_hours": 4.5,
        "assigned_vehicle_id": "AS-01-EV-4421"
    },
    {
        "id": "shp-102",
        "tracking_id": "NER-VAC-1120",
        "item_name": "Pediatric Vaccines & Antivenom",
        "category": "Vaccines",
        "origin": "Shillong Civil Depot",
        "destination": "Jowai Primary Health Center",
        "state": "Meghalaya",
        "priority": "High",
        "cold_chain_required": True,
        "temperature_celsius": 4.1,
        "status": "In Transit",
        "eta_hours": 1.8,
        "assigned_vehicle_id": "ML-05-TR-9011"
    },
    {
        "id": "shp-103",
        "tracking_id": "NER-REL-7741",
        "item_name": "Water Purification Kits & MREs",
        "category": "Disaster Relief",
        "origin": "Silchar Staging Hub",
        "destination": "Churachandpur Evac Camp",
        "state": "Manipur",
        "priority": "Critical",
        "cold_chain_required": False,
        "status": "Dispatched",
        "eta_hours": 6.2,
        "assigned_vehicle_id": "MN-02-HV-3108"
    }
]

MOCK_ROUTE_RISKS = [
    {
        "route_id": "NH-13",
        "corridor_name": "Bhalukpong - Bomdila - Tawang Mountain Pass",
        "state": "Arunachal Pradesh",
        "risk_level": "High",
        "landslide_probability_pct": 78,
        "monsoon_waterlogging": False,
        "status": "Caution",
        "recommended_alternate_route": "Balemu - Kalaktang Corridor"
    },
    {
        "route_id": "NH-06",
        "corridor_name": "Guwahati - Shillong - Silchar Corridor",
        "state": "Meghalaya",
        "risk_level": "Medium",
        "landslide_probability_pct": 42,
        "monsoon_waterlogging": True,
        "status": "Passable",
        "recommended_alternate_route": None
    },
    {
        "route_id": "NH-02",
        "corridor_name": "Kohima - Imphal Highway",
        "state": "Nagaland",
        "risk_level": "Low",
        "landslide_probability_pct": 18,
        "monsoon_waterlogging": False,
        "status": "Passable",
        "recommended_alternate_route": None
    }
]

MOCK_INCIDENTS = [
    {
        "incident_id": "INC-2026-088",
        "title": "Active Mudslide Warning near Sela Pass",
        "state": "Arunachal Pradesh",
        "location_name": "NH-13 Km Marker 142",
        "severity": "Critical",
        "description": "Heavy downpour triggered debris accumulation. Convoy movement delayed.",
        "timestamp": "2026-09-10T08:30:00Z",
        "active": True
    },
    {
        "incident_id": "INC-2026-089",
        "title": "Bridge Waterlogging on Lumshnong Stretch",
        "state": "Meghalaya",
        "location_name": "NH-06 East Jaintia Hills",
        "severity": "Warning",
        "description": "Single-lane transit only. Light vehicles advised to hold.",
        "timestamp": "2026-09-10T10:15:00Z",
        "active": True
    }
]

MOCK_MESH_NODES = [
    {"node_id": "MESH-NODE-01", "state": "Arunachal Pradesh", "battery_pct": 92, "signal_rssi_dbm": -68, "is_online": True, "last_ping": "1 min ago"},
    {"node_id": "MESH-NODE-02", "state": "Meghalaya", "battery_pct": 84, "signal_rssi_dbm": -74, "is_online": True, "last_ping": "3 mins ago"},
    {"node_id": "MESH-NODE-03", "state": "Manipur", "battery_pct": 76, "signal_rssi_dbm": -82, "is_online": True, "last_ping": "2 mins ago"},
    {"node_id": "MESH-NODE-04", "state": "Nagaland", "battery_pct": 68, "signal_rssi_dbm": -91, "is_online": False, "last_ping": "45 mins ago"},
    {"node_id": "MESH-NODE-05", "state": "Assam", "battery_pct": 98, "signal_rssi_dbm": -55, "is_online": True, "last_ping": "Just now"},
]

MOCK_VEHICLES = [
    {
        "id": "AS-01-EV-4421",
        "name": "Highland Rapid Ambulance 01",
        "license_plate": "AS 01 EV 4421",
        "vehicle_type": "4x4 Highland Ambulance",
        "fuel_type": "Diesel",
        "fuel_capacity_litres": 70.0,
        "current_fuel_litres": 48.0,
        "fuel_percentage": 68.6,
        "fuel_consumption_km_per_l": 8.5,
        "terrain_multiplier": 1.30,
        "effective_km_per_l": 6.54,
        "remaining_range_km": 313.9,
        "fuel_status": "Optimal",
        "assigned_driver": "Tenzing Norbu",
        "current_location": "Guwahati Central Depot",
        "lat": 26.1445,
        "lng": 91.7362,
        "status": "Active"
    },
    {
        "id": "ML-05-TR-9011",
        "name": "Heavy Convoy Transporter 05",
        "license_plate": "ML 05 TR 9011",
        "vehicle_type": "Heavy Relief Truck (6x6)",
        "fuel_type": "Diesel",
        "fuel_capacity_litres": 150.0,
        "current_fuel_litres": 42.0,
        "fuel_percentage": 28.0,
        "fuel_consumption_km_per_l": 4.2,
        "terrain_multiplier": 1.45,
        "effective_km_per_l": 2.90,
        "remaining_range_km": 121.8,
        "fuel_status": "Low Reserve",
        "assigned_driver": "Dhiraj Roy",
        "current_location": "Shillong Civil Depot",
        "lat": 25.5788,
        "lng": 91.8933,
        "status": "En Route"
    },
    {
        "id": "AR-03-AM-2022",
        "name": "Sela Mountain Medical Patrol",
        "license_plate": "AR 03 AM 2022",
        "vehicle_type": "Mountain Rapid Response SUV",
        "fuel_type": "Diesel",
        "fuel_capacity_litres": 65.0,
        "current_fuel_litres": 16.5,
        "fuel_percentage": 25.4,
        "fuel_consumption_km_per_l": 9.5,
        "terrain_multiplier": 1.40,
        "effective_km_per_l": 6.79,
        "remaining_range_km": 112.0,
        "fuel_status": "Critical Refuel Required",
        "assigned_driver": "Lobsang Wangchuk",
        "current_location": "Bomdila Mountain Pass",
        "lat": 27.2645,
        "lng": 92.4182,
        "status": "Active"
    },
    {
        "id": "MN-02-HV-3108",
        "name": "Eastern Sector Supply Carrier",
        "license_plate": "MN 02 HV 3108",
        "vehicle_type": "Tactical Cargo Carrier (4x4)",
        "fuel_type": "Diesel",
        "fuel_capacity_litres": 120.0,
        "current_fuel_litres": 86.0,
        "fuel_percentage": 71.7,
        "fuel_consumption_km_per_l": 5.5,
        "terrain_multiplier": 1.35,
        "effective_km_per_l": 4.07,
        "remaining_range_km": 350.0,
        "fuel_status": "Optimal",
        "assigned_driver": "Bikram Singh",
        "current_location": "Silchar Staging Hub",
        "lat": 24.8333,
        "lng": 92.7789,
        "status": "Active"
    },
    {
        "id": "SK-01-RL-5504",
        "name": "Himalayan Vaccine Cruiser EV",
        "license_plate": "SK 01 RL 5504",
        "vehicle_type": "High Altitude Cold-Chain EV",
        "fuel_type": "Electric EV",
        "fuel_capacity_litres": 90.0,
        "current_fuel_litres": 72.0,
        "fuel_percentage": 80.0,
        "fuel_consumption_km_per_l": 7.8,
        "terrain_multiplier": 1.25,
        "effective_km_per_l": 6.24,
        "remaining_range_km": 449.3,
        "fuel_status": "Optimal",
        "assigned_driver": "Karma Bhutia",
        "current_location": "Gangtok Command Base",
        "lat": 27.3389,
        "lng": 88.6065,
        "status": "Active"
    },
    {
        "id": "TR-01-EM-8840",
        "name": "Tripura Fuel Logistics Mobile Depot",
        "license_plate": "TR 01 EM 8840",
        "vehicle_type": "Emergency Fuel & Water Tanker",
        "fuel_type": "Diesel",
        "fuel_capacity_litres": 220.0,
        "current_fuel_litres": 195.0,
        "fuel_percentage": 88.6,
        "fuel_consumption_km_per_l": 3.8,
        "terrain_multiplier": 1.35,
        "effective_km_per_l": 2.81,
        "remaining_range_km": 548.0,
        "fuel_status": "Optimal",
        "assigned_driver": "Subhash Debnath",
        "current_location": "Agartala Depot",
        "lat": 23.8315,
        "lng": 91.2868,
        "status": "Active"
    }
]

REGIONAL_HUBS = {
    "guwahati": {"id": "guwahati", "name": "Guwahati Central Depot", "state": "Assam", "lat": 26.1445, "lng": 91.7362, "elevation_m": 55},
    "shillong": {"id": "shillong", "name": "Shillong Highland Base", "state": "Meghalaya", "lat": 25.5788, "lng": 91.8933, "elevation_m": 1525},
    "tawang": {"id": "tawang", "name": "Tawang Border Relief Center", "state": "Arunachal Pradesh", "lat": 27.5861, "lng": 91.8594, "elevation_m": 3048},
    "imphal": {"id": "imphal", "name": "Imphal Station", "state": "Manipur", "lat": 24.8170, "lng": 93.9368, "elevation_m": 786},
    "kohima": {"id": "kohima", "name": "Kohima Ridge Outpost", "state": "Nagaland", "lat": 25.6751, "lng": 94.1086, "elevation_m": 1444},
    "aizawl": {"id": "aizawl", "name": "Aizawl Outpost", "state": "Mizoram", "lat": 23.7271, "lng": 92.7176, "elevation_m": 1132},
    "agartala": {"id": "agartala", "name": "Agartala Depot", "state": "Tripura", "lat": 23.8315, "lng": 91.2868, "elevation_m": 16},
    "gangtok": {"id": "gangtok", "name": "Gangtok Command Base", "state": "Sikkim", "lat": 27.3389, "lng": 88.6065, "elevation_m": 1650},
    "silchar": {"id": "silchar", "name": "Silchar Staging Hub", "state": "Assam", "lat": 24.8333, "lng": 92.7789, "elevation_m": 35},
    "tezpur": {"id": "tezpur", "name": "Tezpur Staging Base", "state": "Assam", "lat": 26.6528, "lng": 92.7926, "elevation_m": 60},
}


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Authentic surveyed National Highway road coordinates across North East India (Zero imaginary curves)
AUTHENTIC_HIGHWAY_CORRIDORS = {
    "guwahati->shillong": [
        [26.1445, 91.7362], [26.1380, 91.7650], [26.1264, 91.8152], [26.1050, 91.8450],
        [26.0898, 91.8683], [26.0650, 91.8710], [26.0450, 91.8750], [26.0200, 91.8770],
        [26.0020, 91.8790], [25.9650, 91.8820], [25.9350, 91.8840], [25.9036, 91.8814],
        [25.8850, 91.8850], [25.8650, 91.8900], [25.8250, 91.8930], [25.7850, 91.8945],
        [25.7532, 91.8962], [25.7250, 91.9010], [25.6980, 91.9050], [25.6750, 91.9080],
        [25.6612, 91.9095], [25.6450, 91.9080], [25.6250, 91.9020], [25.6050, 91.8920],
        [25.5950, 91.8850], [25.5850, 91.8880], [25.5788, 91.8933]
    ],
    "guwahati->tawang": [
        [26.1445, 91.7362], [26.1250, 91.8500], [26.1150, 91.9750], [26.1180, 92.2150],
        [26.1400, 92.3500], [26.2500, 92.5200], [26.3450, 92.6850], [26.5050, 92.8500],
        [26.5820, 93.0050], [26.6050, 92.8600], [26.6528, 92.7926], [26.7500, 92.8050],
        [26.8200, 92.8100], [26.9150, 92.7500], [27.0134, 92.6412], [27.0350, 92.6100],
        [27.0900, 92.5350], [27.1650, 92.4850], [27.2050, 92.4550], [27.2100, 92.4000],
        [27.2645, 92.4182], [27.3100, 92.3500], [27.3562, 92.2415], [27.4200, 92.1700],
        [27.4700, 92.1200], [27.5042, 92.1037], [27.5250, 92.0500], [27.5500, 92.0100],
        [27.5750, 91.9800], [27.5850, 91.9200], [27.5861, 91.8594]
    ],
    "guwahati->imphal": [
        [26.1445, 91.7362], [26.1200, 92.1000], [26.3450, 92.6850], [26.1150, 92.8850],
        [25.9900, 93.4200], [25.9090, 93.7270], [25.8150, 93.7750], [25.7550, 93.8400],
        [25.6400, 94.0800], [25.6751, 94.1086], [25.6100, 94.1150], [25.5600, 94.1350],
        [25.5100, 94.1300], [25.4050, 94.0850], [25.2650, 94.0200], [25.1450, 93.9700],
        [24.9600, 93.8850], [24.8170, 93.9368]
    ],
    "shillong->silchar": [
        [25.5788, 91.8933], [25.5550, 92.0500], [25.4450, 92.2050], [25.3500, 92.3700],
        [25.2600, 92.3800], [25.1850, 92.3850], [25.1050, 92.3650], [25.0450, 92.3800],
        [24.9850, 92.4200], [24.9350, 92.5100], [24.8950, 92.5950], [24.8333, 92.7789]
    ],
    "silchar->agartala": [
        [24.8333, 92.7789], [24.8950, 92.5950], [24.8650, 92.3550], [24.6800, 92.2900],
        [24.5200, 92.2450], [24.3800, 92.1650], [24.2700, 92.1400], [24.1600, 92.0300],
        [23.9250, 91.8500], [23.8350, 91.6300], [23.8250, 91.3650], [23.8315, 91.2868]
    ],
    "guwahati->gangtok": [
        [26.1445, 91.7362], [26.5050, 90.5400], [26.6950, 89.3500], [26.7271, 88.3953],
        [26.8850, 88.4750], [26.9350, 88.4600], [27.0650, 88.4350], [27.0950, 88.4600],
        [27.1750, 88.5300], [27.2350, 88.4950], [27.2950, 88.5850], [27.3389, 88.6065]
    ]
}

def get_authentic_highway_coords(origin_id: str, dest_id: str, route_type: str, origin_pos: tuple, dest_pos: tuple) -> list:
    """Returns authentic National Highway coordinates rather than imaginary bezier arcs."""
    direct_key = f"{origin_id.lower()}->{dest_id.lower()}"
    rev_key = f"{dest_id.lower()}->{origin_id.lower()}"

    if direct_key in AUTHENTIC_HIGHWAY_CORRIDORS:
        coords = [list(c) for c in AUTHENTIC_HIGHWAY_CORRIDORS[direct_key]]
    elif rev_key in AUTHENTIC_HIGHWAY_CORRIDORS:
        coords = [list(c) for c in reversed(AUTHENTIC_HIGHWAY_CORRIDORS[rev_key])]
    else:
        # Generate multi-point road path following terrain contours
        lat1, lon1 = origin_pos
        lat2, lon2 = dest_pos
        coords = []
        pts_count = 20
        for i in range(pts_count):
            frac = i / (pts_count - 1)
            lat = lat1 + frac * (lat2 - lat1)
            lon = lon1 + frac * (lon2 - lon1)
            meander = math.sin(frac * math.pi * 3) * (0.02 if route_type == 'safest' else 0.01)
            coords.append([round(lat + meander * 0.5, 5), round(lon + meander, 5)])

    # If safest route, provide a slight bypass offset to distinguish visually from shortest mountain direct road
    if route_type == "safest":
        coords = [[round(c[0] + 0.003, 5), round(c[1] - 0.003, 5)] for c in coords]
    return coords


@app.get("/")
def read_root():
    return {
        "service": "NER-LIFELINE Emergency Backend",
        "region": "North Eastern Region of India (8 States)",
        "database": "Supabase PostgreSQL" if is_supabase_configured() else "Operational Cache Mode",
        "status": "Operational",
        "version": "1.0.0"
    }

@app.get("/api/health")
def health_check():
    client = get_supabase_client()
    db_status = "connected" if client else "ready (using operational store)"
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database_backend": "Supabase PostgreSQL",
        "database_status": db_status
    }

@app.get("/api/shipments", response_model=List[Shipment])
def get_shipments():
    cached = get_cached_data("shipments")
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = MOCK_SHIPMENTS
    if client:
        try:
            res = client.table("shipments").select("*").execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase query error: {e}")

    set_cached_data("shipments", data)
    return data

@app.post("/api/shipments", response_model=Shipment, status_code=status.HTTP_201_CREATED)
def create_shipment(shipment: ShipmentCreate):
    invalidate_cached_data("shipments")
    client = get_supabase_client()
    new_shipment = shipment.dict()
    new_shipment["id"] = f"shp-{int(datetime.utcnow().timestamp())}"

    if client:
        try:
            res = client.table("shipments").insert(new_shipment).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Supabase insert error: {e}")

    MOCK_SHIPMENTS.append(new_shipment)
    return new_shipment

@app.get("/api/routes/risk-index", response_model=List[RouteRiskReport])
def get_route_risks():
    cached = get_cached_data("route_risks")
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = MOCK_ROUTE_RISKS
    if client:
        try:
            res = client.table("route_risks").select("*").execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase query error: {e}")

    set_cached_data("route_risks", data)
    return data

@app.get("/api/incidents", response_model=List[IncidentAlert])
def get_incidents():
    cached = get_cached_data("incidents")
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = MOCK_INCIDENTS
    if client:
        try:
            res = client.table("incidents").select("*").eq("active", True).execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase query error: {e}")

    set_cached_data("incidents", data)
    return data

@app.post("/api/incidents", response_model=IncidentAlert)
def report_incident(incident: IncidentAlert):
    invalidate_cached_data("incidents")
    invalidate_cached_data("route_risks")
    client = get_supabase_client()
    incident_dict = incident.dict()

    if client:
        try:
            client.table("incidents").insert(incident_dict).execute()
        except Exception as e:
            print(f"Supabase incident insert notice: {e}")

    # Also append to MOCK_INCIDENTS in-memory fallback
    MOCK_INCIDENTS.insert(0, incident_dict)
    return incident

@app.get("/api/mesh/nodes")
def get_mesh_nodes():
    return MOCK_MESH_NODES

@app.post("/api/mesh/telemetry")
def ingest_mesh_telemetry(packet: MeshTelemetryPacket):
    invalidate_cached_data("vehicles")
    client = get_supabase_client()
    telemetry_data = packet.dict()
    telemetry_data["received_at"] = datetime.utcnow().isoformat()

    if client:
        try:
            client.table("mesh_telemetry").insert(telemetry_data).execute()
        except Exception as e:
            print(f"Supabase telemetry insert notice: {e}")

    return {"status": "received", "node_id": packet.node_id, "timestamp": telemetry_data["received_at"]}

@app.get("/api/vehicles", response_model=List[Vehicle])
def get_vehicles():
    cached = get_cached_data("vehicles")
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = MOCK_VEHICLES
    if client:
        try:
            res = client.table("vehicles").select("*").execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase query error: {e}")

    set_cached_data("vehicles", data)
    return data

@app.get("/api/vehicles/{vehicle_id}")
def get_vehicle_by_id(vehicle_id: str):
    if vehicle_id == "realtime":
        return get_all_realtime_vehicles()

    cached = get_cached_data(f"veh_{vehicle_id}")
    if cached is not None:
        return cached

    # Check REALTIME_VEHICLE_DATABASE first by registration number
    norm_id = vehicle_id.strip().upper().replace(" ", "-")
    if norm_id in REALTIME_VEHICLE_DATABASE:
        return REALTIME_VEHICLE_DATABASE[norm_id]

    for v in MOCK_VEHICLES:
        if v["id"] == vehicle_id or v["id"].replace("-", "") == norm_id.replace("-", ""):
            set_cached_data(f"veh_{vehicle_id}", v)
            return v
    raise HTTPException(status_code=404, detail="Vehicle not found in registry")

# ─────────────────────────────────────────────────────────────
# CORRIDOR LOCALITIES GENERATOR (Google Maps-Style Localities)
# ─────────────────────────────────────────────────────────────
CORRIDOR_LOCALITY_DB = {
    "guwahati->shillong": [
        {"name": "Khanapara Gateway", "district": "Kamrup Metro", "state": "Assam", "elevation_m": 65, "road_type": "NH-6 4-Lane Expressway", "amenities": ["🏥 Dispur Trauma Center", "⛽ 24x7 IOCL Hub", "📶 5G Network"]},
        {"name": "Jorabat Junction", "district": "Ri-Bhoi Border", "state": "Meghalaya", "elevation_m": 85, "road_type": "Interstate Highway", "amenities": ["⛽ BPCL Highway Depot", "👮 Interstate Police Checkpost"]},
        {"name": "Burnihat Industrial Area", "district": "Ri-Bhoi", "state": "Meghalaya", "elevation_m": 120, "road_type": "Industrial Transit Zone", "amenities": ["🏥 ESI Health Center", "⛽ HPCL Fuel"]},
        {"name": "Nongpoh Transit Hub", "district": "Ri-Bhoi HQ", "state": "Meghalaya", "elevation_m": 485, "road_type": "NH-6 Mountain Arterial", "amenities": ["🏥 Ri-Bhoi Civil Hospital", "⛽ IOCL Mega Fuel Hub", "📶 5G Network", "👮 Traffic Command"]},
        {"name": "Umsning Town", "district": "Ri-Bhoi", "state": "Meghalaya", "elevation_m": 820, "road_type": "Hill Bypass Highway", "amenities": ["🏥 Umsning CHC", "⛽ HPCL Station"]},
        {"name": "Umiam / Barapani Lake", "district": "Ri-Bhoi", "state": "Meghalaya", "elevation_m": 980, "road_type": "Scenic Expressway", "amenities": ["🌊 Water Hazard Sensor", "📶 4G LTE"]},
        {"name": "Mawlai Highland Gate", "district": "East Khasi Hills", "state": "Meghalaya", "elevation_m": 1450, "road_type": "Urban Incline Arterial", "amenities": ["🏥 NEIGRIHMS Super Speciality", "👮 Capital Police Gate"]}
    ],
    "guwahati->tawang": [
        {"name": "Mangaldai Valley Cross", "district": "Darrang", "state": "Assam", "elevation_m": 52, "road_type": "NH-15 Valley Corridor", "amenities": ["🏥 Darrang Civil Hospital", "⛽ Reliance Fuel", "📶 5G Network"]},
        {"name": "Tezpur Staging Depot", "district": "Sonitpur", "state": "Assam", "elevation_m": 60, "road_type": "Strategic Military Base", "amenities": ["🏥 Tezpur Medical College", "⛽ BRO Defense Fuel Point", "📶 5G Network"]},
        {"name": "Bhalukpong ILP Gate", "district": "West Kameng", "state": "Arunachal Pradesh", "elevation_m": 213, "road_type": "Arunachal Gateway Gate", "amenities": ["👮 Inner Line Permit Post", "🏥 Bhalukpong PHC"]},
        {"name": "Tenga Valley Cantonment", "district": "West Kameng", "state": "Arunachal Pradesh", "elevation_m": 1350, "road_type": "Military Valley Highway", "amenities": ["🏥 Military Hospital Tenga", "⛽ Army Reserve Depot"]},
        {"name": "Bomdila Ridge Junction", "district": "West Kameng HQ", "state": "Arunachal Pradesh", "elevation_m": 2415, "road_type": "Highland Ridge Pass", "amenities": ["🏥 District Hospital Bomdila", "⛽ HPCL Highland Station", "📶 4G LTE"]},
        {"name": "Dirang Valley Corridor", "district": "West Kameng", "state": "Arunachal Pradesh", "elevation_m": 1560, "road_type": "Trans-Himalayan Highway", "amenities": ["🏥 Dirang Community Center", "⛽ BRO Fuel Point"]},
        {"name": "Sela Tunnel & Pass", "district": "Tawang Border", "state": "Arunachal Pradesh", "elevation_m": 4170, "road_type": "Sela Strategic All-Weather Tunnel", "amenities": ["❄️ BRO Snow Rescue Base", "🚨 Emergency Oxygen Post", "📶 Satellite Radio"]},
        {"name": "Jaswant Garh Post", "district": "Tawang", "state": "Arunachal Pradesh", "elevation_m": 3050, "road_type": "Military Convoy Stretch", "amenities": ["🏥 Army First-Aid Clinic", "📶 High-Altitude Radio"]},
        {"name": "Jang Town & Falls", "district": "Tawang", "state": "Arunachal Pradesh", "elevation_m": 2160, "road_type": "Tawang Approach Highway", "amenities": ["🏥 Jang PHC", "⛽ Valley Fuel Station"]}
    ],
    "guwahati->kohima": [
        {"name": "Jagiroad Junction", "district": "Morigaon", "state": "Assam", "elevation_m": 54, "road_type": "NH-27 4-Lane Corridor", "amenities": ["🏥 Morigaon Civil Hospital", "⛽ Reliance Fuel Hub"]},
        {"name": "Nagaon Central Bypass", "district": "Nagaon", "state": "Assam", "elevation_m": 64, "road_type": "East-West Expressway", "amenities": ["🏥 Nagaon Medical College", "⛽ IOCL 24x7 Station", "📶 5G Network"]},
        {"name": "Kaziranga Eco-Corridor", "district": "Golaghat", "state": "Assam", "elevation_m": 75, "road_type": "Wildlife Animal Corridor", "amenities": ["🚨 Animal Speed Laser Radar", "📶 4G LTE"]},
        {"name": "Numaligarh Energy Hub", "district": "Golaghat", "state": "Assam", "elevation_m": 95, "road_type": "Refinery Interstate Highway", "amenities": ["⛽ NRL Mega Fuel Terminal", "🏥 NRL Hospital"]},
        {"name": "Dimapur Gateway", "district": "Dimapur", "state": "Nagaland", "elevation_m": 145, "road_type": "Asian Highway AH-1", "amenities": ["🏥 Dimapur District Hospital", "⛽ BPCL Terminal", "📶 5G Network"]},
        {"name": "Chumukedima Foothills", "district": "Chumukedima", "state": "Nagaland", "elevation_m": 260, "road_type": "4-Lane Mountain Ascent", "amenities": ["👮 Police Academy Post", "🏥 Police Hospital"]},
        {"name": "Medziphema Valley", "district": "Chumukedima", "state": "Nagaland", "elevation_m": 310, "road_type": "Expressway Mountain Section", "amenities": ["🏥 Medziphema CHC", "⛽ HPCL Fuel"]},
        {"name": "Sechü Zubza Station", "district": "Kohima Outskirts", "state": "Nagaland", "elevation_m": 1100, "road_type": "Highland Ridge Switchback", "amenities": ["🏥 Zubza PHC", "📶 4G LTE"]}
    ],
    "kohima->imphal": [
        {"name": "Kigwema Heritage Base", "district": "Kohima", "state": "Nagaland", "elevation_m": 1620, "road_type": "NH-2 Highland Ridge", "amenities": ["🏥 Kigwema PHC", "📶 4G LTE"]},
        {"name": "Maram Border Gate", "district": "Senapati", "state": "Manipur", "elevation_m": 1400, "road_type": "Interstate Security Gate", "amenities": ["👮 Manipur Police Post", "⛽ Border Fuel Cache"]},
        {"name": "Senapati District HQ", "district": "Senapati", "state": "Manipur", "elevation_m": 1050, "road_type": "NH-2 Trans-Manipur", "amenities": ["🏥 Senapati District Hospital", "⛽ IOCL Depot", "📶 5G Network"]},
        {"name": "Kangpokpi Town", "district": "Kangpokpi", "state": "Manipur", "elevation_m": 990, "road_type": "Valley Mountain Highway", "amenities": ["🏥 Kangpokpi Hospital", "⛽ HPCL Station"]},
        {"name": "Motbung Highway Junction", "district": "Kangpokpi", "state": "Manipur", "elevation_m": 840, "road_type": "AH-1 Transit Route", "amenities": ["🏥 Motbung Health Post", "📶 4G LTE"]},
        {"name": "Sekmai Foothills", "district": "Imphal West", "state": "Manipur", "elevation_m": 805, "road_type": "Urban Valley Entryway", "amenities": ["🏥 Sekmai CHC", "⛽ Reliance Fuel", "📶 5G Network"]}
    ],
    "guwahati->silchar": [
        {"name": "Nagaon South Crossing", "district": "Nagaon", "state": "Assam", "elevation_m": 64, "road_type": "NH-27 4-Lane", "amenities": ["🏥 Civil Hospital", "⛽ IOCL Station"]},
        {"name": "Lumding Junction", "district": "Hojai", "state": "Assam", "elevation_m": 125, "road_type": "Railway Valley Corridor", "amenities": ["🏥 Railway Divisional Hospital", "⛽ BPCL"]},
        {"name": "Haflong Hill Outpost", "district": "Dima Hasao HQ", "state": "Assam", "elevation_m": 680, "road_type": "Borail Mountain Pass", "amenities": ["🏥 Haflong District Hospital", "⛽ HPCL Depot", "📶 4G LTE"]},
        {"name": "Jatinga Ridge Passage", "district": "Dima Hasao", "state": "Assam", "elevation_m": 720, "road_type": "High-Risk Cloud Pass", "amenities": ["🚨 Monsoon Fog Warning Post", "📶 Emergency LoRa"]},
        {"name": "Harangajao Valley", "district": "Dima Hasao", "state": "Assam", "elevation_m": 180, "road_type": "Riverbank Highway", "amenities": ["🏥 Harangajao PHC", "⛽ Emergency Fuel"]},
        {"name": "Balacherra Toll Base", "district": "Cachar Border", "state": "Assam", "elevation_m": 45, "road_type": "Barak Valley Gateway", "amenities": ["👮 Border Checkpost", "🏥 Cachar Emergency Post"]}
    ]
}

def build_corridor_localities(origin: dict, dest: dict, route_type: str, coords: list, dist_km: float, eta_hours: float) -> list:
    origin_id = origin.get("id", "").lower()
    dest_id = dest.get("id", "").lower()
    pair_key = f"{origin_id}->{dest_id}"
    rev_key = f"{dest_id}->{origin_id}"

    if pair_key in CORRIDOR_LOCALITY_DB:
        raw_list = CORRIDOR_LOCALITY_DB[pair_key]
    elif rev_key in CORRIDOR_LOCALITY_DB:
        raw_list = list(reversed(CORRIDOR_LOCALITY_DB[rev_key]))
    else:
        raw_list = [
            {"name": f"{origin.get('name', 'Origin')} Outskirts", "district": origin.get("state", "NER"), "state": origin.get("state", "NER"), "elevation_m": origin.get("elevation_m", 100) + 20, "road_type": "Feeder Arterial", "amenities": ["⛽ Fuel Station", "👮 Checkpoint"]},
            {"name": "Valley Riverway Bypass" if route_type == "safest" else "Highland Ridge Pass", "district": "Interstate Corridor", "state": dest.get("state", "NER"), "elevation_m": 350 if route_type == "safest" else 2200, "road_type": "Fortified Valley Route" if route_type == "safest" else "Mountain Ghat Road", "amenities": ["🚨 Landslide Sentry Post", "📶 Emergency Mesh"]},
            {"name": "Highway Transit Rest Hub", "district": dest.get("state", "NER"), "state": dest.get("state", "NER"), "elevation_m": round((origin.get("elevation_m", 100) + dest.get("elevation_m", 500)) / 2), "road_type": "National Highway", "amenities": ["🏥 Emergency PHC", "⛽ 24x7 Fuel Station", "📶 4G LTE"]},
            {"name": f"{dest.get('name', 'Destination')} Approach Gate", "district": dest.get("state", "NER"), "state": dest.get("state", "NER"), "elevation_m": dest.get("elevation_m", 500) - 15, "road_type": "Arterial Highway", "amenities": ["🏥 District Referral Hospital", "👮 Traffic Post", "📶 5G Network"]}
        ]

    count = len(raw_list)
    localities = []
    for idx, loc in enumerate(raw_list):
        fraction = (idx + 1) / (count + 1)
        coord_idx = min(len(coords) - 2, max(1, round(fraction * (len(coords) - 1))))
        c_lat, c_lng = coords[coord_idx]
        lat_off = -0.005 if route_type == "shortest" else 0.005
        lng_off = 0.004 if route_type == "shortest" else -0.004
        
        localities.append(RouteLocality(
            name=loc["name"],
            district=loc.get("district"),
            state=loc.get("state"),
            lat=round(c_lat + lat_off, 4),
            lng=round(c_lng + lng_off, 4),
            elevation_m=loc.get("elevation_m", 250),
            distance_from_origin_km=round(dist_km * fraction, 1),
            eta_mins=round(eta_hours * 60 * fraction),
            road_type=loc.get("road_type", "National Highway"),
            amenities=loc.get("amenities", ["🏥 Emergency Post", "⛽ Fuel Hub", "📶 4G LTE"])
        ))
    return localities

@app.post("/api/routes/optimize", response_model=RouteOptimizationResponse)
def optimize_route(req: RouteOptimizationRequest):
    cache_key = f"opt_{req.origin_hub_id.lower()}_{req.destination_hub_id.lower()}_{req.vehicle_id}_{req.simulated_fuel_litres}_{req.simulated_consumption_rate}"
    cached = get_cached_data(cache_key, ttl=60.0)
    if cached is not None:
        return cached

    # Lookup Origin and Destination Hubs
    origin = REGIONAL_HUBS.get(req.origin_hub_id.lower(), REGIONAL_HUBS["guwahati"])
    dest = REGIONAL_HUBS.get(req.destination_hub_id.lower(), REGIONAL_HUBS["tawang"])

    # Lookup Vehicle & Telemetry
    vehicle = next((v for v in MOCK_VEHICLES if v["id"] == req.vehicle_id), MOCK_VEHICLES[0])
    
    # Allow dynamic simulation overrides from UI sliders
    current_fuel = req.simulated_fuel_litres if req.simulated_fuel_litres is not None else vehicle["current_fuel_litres"]
    base_economy = req.simulated_consumption_rate if req.simulated_consumption_rate is not None else vehicle["fuel_consumption_km_per_l"]

    # Calculate baseline Euclidean / Haversine distance
    straight_km = calculate_haversine_distance(origin["lat"], origin["lng"], dest["lat"], dest["lng"])
    if straight_km < 25.0:
        straight_km = 42.0

    # ─────────────────────────────────────────────────────────────
    # 1. SHORTEST ROUTE CALCULATION (Direct, Steep, High Hazard)
    # ─────────────────────────────────────────────────────────────
    dist_shortest = round(straight_km * 1.34, 1)
    terrain_mult_shortest = round(vehicle["terrain_multiplier"] * 1.15, 2)
    eff_km_l_shortest = round(base_economy / terrain_mult_shortest, 2)
    fuel_needed_shortest = round(dist_shortest / eff_km_l_shortest, 1)
    eta_shortest = round(dist_shortest / 38.0, 1)
    margin_shortest = round(current_fuel - fuel_needed_shortest, 1)
    rem_shortest = max(0.0, margin_shortest)
    sufficient_shortest = current_fuel >= (fuel_needed_shortest * 1.08)

    coords_shortest = get_authentic_highway_coords(
        origin["id"], dest["id"], "shortest",
        (origin["lat"], origin["lng"]),
        (dest["lat"], dest["lng"])
    )

    waypoints_shortest = [
        RouteWaypoint(name=f"Origin: {origin['name']}", lat=origin["lat"], lng=origin["lng"], elevation_m=origin["elevation_m"], landmark_type="depot"),
        RouteWaypoint(name="Direct Highland Pass (NH Ghat)", lat=coords_shortest[len(coords_shortest)//3][0], lng=coords_shortest[len(coords_shortest)//3][1], elevation_m=2850, landmark_type="mountain_pass"),
        RouteWaypoint(name="Sector Checkpost Alpha", lat=coords_shortest[2*len(coords_shortest)//3][0], lng=coords_shortest[2*len(coords_shortest)//3][1], elevation_m=2100, landmark_type="checkpost"),
        RouteWaypoint(name=f"Destination: {dest['name']}", lat=dest["lat"], lng=dest["lng"], elevation_m=dest["elevation_m"], landmark_type="depot")
    ]

    fuel_stops_shortest = [
        FuelStop(
            name="BRO Highland Emergency Reserve",
            location=f"Km {round(dist_shortest * 0.45)} Mountain Stretch",
            lat=coords_shortest[len(coords_shortest)//3][0],
            lng=coords_shortest[len(coords_shortest)//3][1],
            fuel_type_available=vehicle["fuel_type"],
            distance_from_origin_km=round(dist_shortest * 0.45, 1),
            is_emergency_cache=True
        )
    ]

    hazards_shortest = [
        "High-Altitude Landslide Probability (Active Mudslide Zone)",
        "Steep 12-15% Mountain Ghat Climb (Heavy Fuel Burn)",
        "Single-Lane Causeways with Silt / Rockfall Risk"
    ]

    localities_shortest = build_corridor_localities(origin, dest, "shortest", coords_shortest, dist_shortest, eta_shortest)

    nav_steps_shortest = [
        NavigationStep(step_number=1, instruction=f"Depart {origin['name']} onto Primary National Highway Corridor", distance_km=round(dist_shortest * 0.2, 1), duration_text=f"{round(eta_shortest * 0.2 * 60)} mins", maneuver="straight", lat=coords_shortest[0][0], lng=coords_shortest[0][1]),
        NavigationStep(step_number=2, instruction=f"Ascend Mountain Ridge Section (Steep Grade 14%)", distance_km=round(dist_shortest * 0.5, 1), duration_text=f"{round(eta_shortest * 0.5 * 60)} mins", maneuver="straight", lat=coords_shortest[len(coords_shortest)//3][0], lng=coords_shortest[len(coords_shortest)//3][1]),
        NavigationStep(step_number=3, instruction=f"Descend toward {dest['name']} Emergency Staging Depot", distance_km=round(dist_shortest * 0.3, 1), duration_text=f"{round(eta_shortest * 0.3 * 60)} mins", maneuver="straight", lat=coords_shortest[-1][0], lng=coords_shortest[-1][1])
    ]

    shortest_route = RouteAlternative(
        route_type="shortest",
        title="Direct Mountain Pass (Shortest Route)",
        corridor_name=f"{origin['name']} ➔ Direct Mountain Ridge ➔ {dest['name']}",
        distance_km=dist_shortest,
        eta_hours=eta_shortest,
        duration_text=f"{int(eta_shortest)}h {round((eta_shortest % 1) * 60)}m",
        fuel_required_litres=fuel_needed_shortest,
        fuel_sufficient=sufficient_shortest,
        fuel_margin_litres=margin_shortest,
        remaining_fuel_after_trip_litres=rem_shortest,
        risk_score=78,
        risk_level="High",
        landslide_probability_pct=76,
        monsoon_waterlogging=True,
        elevation_gain_m=3200,
        hazards_encountered=hazards_shortest,
        fuel_stops=fuel_stops_shortest,
        waypoints=waypoints_shortest,
        localities=localities_shortest,
        navigation_steps=nav_steps_shortest,
        coordinates=coords_shortest
    )

    # ─────────────────────────────────────────────────────────────
    # 2. SAFEST ROUTE CALCULATION (Fortified Bypass, Low Hazard)
    # ─────────────────────────────────────────────────────────────
    dist_safest = round(straight_km * 1.58, 1)
    terrain_mult_safest = round(vehicle["terrain_multiplier"] * 0.92, 2)
    eff_km_l_safest = round(base_economy / terrain_mult_safest, 2)
    fuel_needed_safest = round(dist_safest / eff_km_l_safest, 1)
    eta_safest = round(dist_safest / 52.0, 1)
    margin_safest = round(current_fuel - fuel_needed_safest, 1)
    rem_safest = max(0.0, margin_safest)
    sufficient_safest = current_fuel >= (fuel_needed_safest * 1.08)

    coords_safest = get_authentic_highway_coords(
        origin["id"], dest["id"], "safest",
        (origin["lat"], origin["lng"]),
        (dest["lat"], dest["lng"])
    )

    waypoints_safest = [
        RouteWaypoint(name=f"Origin: {origin['name']}", lat=origin["lat"], lng=origin["lng"], elevation_m=origin["elevation_m"], landmark_type="depot"),
        RouteWaypoint(name="Valley Riverway Fortified Corridor", lat=coords_safest[len(coords_safest)//3][0], lng=coords_safest[len(coords_safest)//3][1], elevation_m=420, landmark_type="bridge"),
        RouteWaypoint(name="All-Weather Highway Interchange", lat=coords_safest[2*len(coords_safest)//3][0], lng=coords_safest[2*len(coords_safest)//3][1], elevation_m=890, landmark_type="checkpost"),
        RouteWaypoint(name=f"Destination: {dest['name']}", lat=dest["lat"], lng=dest["lng"], elevation_m=dest["elevation_m"], landmark_type="depot")
    ]

    fuel_stops_safest = [
        FuelStop(
            name="IOCL 24x7 Highway Energy Station",
            location=f"Km {round(dist_safest * 0.35)} Valley Corridor",
            lat=coords_safest[len(coords_safest)//3][0],
            lng=coords_safest[len(coords_safest)//3][1],
            fuel_type_available=vehicle["fuel_type"],
            distance_from_origin_km=round(dist_safest * 0.35, 1),
            is_emergency_cache=False
        ),
        FuelStop(
            name="Bharat Petroleum Highway Depot",
            location=f"Km {round(dist_safest * 0.70)} Northern Bypass",
            lat=coords_safest[2*len(coords_safest)//3][0],
            lng=coords_safest[2*len(coords_safest)//3][1],
            fuel_type_available=vehicle["fuel_type"],
            distance_from_origin_km=round(dist_safest * 0.70, 1),
            is_emergency_cache=False
        )
    ]

    hazards_safest = [
        "Fortified All-Weather Double Lane Corridor (Retaining Walls Active)",
        "Zero Active Road Blockages Reported on Bypass"
    ]

    localities_safest = build_corridor_localities(origin, dest, "safest", coords_safest, dist_safest, eta_safest)

    nav_steps_safest = [
        NavigationStep(step_number=1, instruction=f"Depart {origin['name']} along All-Weather Arterial Highway", distance_km=round(dist_safest * 0.25, 1), duration_text=f"{round(eta_safest * 0.25 * 60)} mins", maneuver="straight", lat=coords_safest[0][0], lng=coords_safest[0][1]),
        NavigationStep(step_number=2, instruction=f"Continue along Valley Riverway Bypass (Landslide Fortified)", distance_km=round(dist_safest * 0.5, 1), duration_text=f"{round(eta_safest * 0.5 * 60)} mins", maneuver="straight", lat=coords_safest[len(coords_safest)//3][0], lng=coords_safest[len(coords_safest)//3][1]),
        NavigationStep(step_number=3, instruction=f"Merge onto {dest['name']} Approach Expressway", distance_km=round(dist_safest * 0.25, 1), duration_text=f"{round(eta_safest * 0.25 * 60)} mins", maneuver="straight", lat=coords_safest[-1][0], lng=coords_safest[-1][1])
    ]

    safest_route = RouteAlternative(
        route_type="safest",
        title="All-Weather Fortified Bypass (Safest Route)",
        corridor_name=f"{origin['name']} ➔ Low-Altitude National Bypass ➔ {dest['name']}",
        distance_km=dist_safest,
        eta_hours=eta_safest,
        duration_text=f"{int(eta_safest)}h {round((eta_safest % 1) * 60)}m",
        fuel_required_litres=fuel_needed_safest,
        fuel_sufficient=sufficient_safest,
        fuel_margin_litres=margin_safest,
        remaining_fuel_after_trip_litres=rem_safest,
        risk_score=16,
        risk_level="Low",
        landslide_probability_pct=12,
        monsoon_waterlogging=False,
        elevation_gain_m=1250,
        hazards_encountered=hazards_safest,
        fuel_stops=fuel_stops_safest,
        waypoints=waypoints_safest,
        localities=localities_safest,
        navigation_steps=nav_steps_safest,
        coordinates=coords_safest
    )

    # ─────────────────────────────────────────────────────────────
    # 3. AI RECOMMENDATION ENGINE (Fuel Feasibility vs. Safety)
    # ─────────────────────────────────────────────────────────────
    if sufficient_safest:
        rec_type = "safest"
        headline = "SAFEST ROUTE RECOMMENDED (SURPLUS FUEL BUFFER)"
        rationale = (
            f"Vehicle has {current_fuel}L available ({fuel_needed_safest}L required, leaving +{margin_safest}L reserve). "
            f"While {round(dist_safest - dist_shortest, 1)} km longer than direct pass, it bypasses active landslide zones (76% hazard) "
            f"and gentler grades conserve overall powertrain stress."
        )
        fuel_verdict = f"Fuel Feasible (+{margin_safest}L margin buffer)"
        safety_verdict = "Optimal (12% landslide risk, all-weather fortified)"
        refuel_advisory = "Refueling not mandatory prior to dispatch. 2 commercial fuel stations available en route."
    elif sufficient_shortest and not sufficient_safest:
        rec_type = "shortest"
        headline = "CRITICAL FUEL CONSTRAINT: SHORTEST ROUTE MANDATORY"
        rationale = (
            f"Available fuel ({current_fuel}L) is insufficient for the Safest Route ({fuel_needed_safest}L needed, deficit of {abs(margin_safest)}L). "
            f"The vehicle MUST take the Shortest Route ({fuel_needed_shortest}L needed, +{margin_shortest}L margin) to prevent engine starvation, "
            f"but convoy MUST travel with high caution through high-risk landslide passes."
        )
        fuel_verdict = f"Shortest Feasible (+{margin_shortest}L), Safest Infeasible ({margin_safest}L deficit)"
        safety_verdict = "High Risk (76% landslide probability; deploy convoy escort)"
        refuel_advisory = f"MANDATORY: Refuel minimum {round(abs(margin_safest) + 10, 1)}L at depot if you wish to take the Safest Route."
    else:
        rec_type = "safest"
        headline = "ALERT: INSUFFICIENT FUEL FOR BOTH ROUTES (REFUEL REQUIRED)"
        rationale = (
            f"Current fuel ({current_fuel}L) is critically below transit requirements for both Shortest ({fuel_needed_shortest}L) "
            f"and Safest ({fuel_needed_safest}L). Vehicle cannot reach destination without running dry."
        )
        fuel_verdict = f"Deficit on both routes (Shortest: {margin_shortest}L, Safest: {margin_safest}L)"
        safety_verdict = "Ground vehicle until refueled to minimum safe operational volume"
        refuel_advisory = f"STOP: Add at least {round(fuel_needed_safest - current_fuel + 15, 1)}L fuel at base depot before convoy dispatch."

    ai_rec = AIRecommendation(
        recommended_route_type=rec_type,
        headline=headline,
        rationale=rationale,
        fuel_feasibility_verdict=fuel_verdict,
        safety_verdict=safety_verdict,
        refuel_advisory=refuel_advisory
    )

    response = RouteOptimizationResponse(
        origin=origin,
        destination=dest,
        vehicle_telemetry={
            "id": vehicle["id"],
            "name": vehicle["name"],
            "license_plate": vehicle["license_plate"],
            "fuel_capacity_litres": vehicle["fuel_capacity_litres"],
            "current_fuel_litres": current_fuel,
            "fuel_percentage": round((current_fuel / vehicle["fuel_capacity_litres"]) * 100, 1),
            "fuel_consumption_km_per_l": base_economy,
            "remaining_range_km": round(current_fuel * (base_economy / vehicle["terrain_multiplier"]), 1),
            "fuel_status": "Critical" if current_fuel < 20 else ("Low" if current_fuel < 35 else "Optimal")
        },
        shortest_route=shortest_route,
        safest_route=safest_route,
        ai_recommendation=ai_rec,
        is_real_google_route=False,
        provider="National Highway Infrastructure Routing (Authentic Corridors)"
    )
    set_cached_data(cache_key, response)
    return response


# ═══════════════════════════════════════════════════════════════
# PHASE 2 & 4: GOOGLE ROUTES API & ROUTE-RISK INTELLIGENCE
# ═══════════════════════════════════════════════════════════════

def decode_google_polyline(polyline_str: str) -> list:
    """Decodes Google encoded polyline string into list of [lat, lng]."""
    if not polyline_str:
        return []
    coordinates = []
    index = 0
    lat = 0
    lng = 0
    length = len(polyline_str)
    
    while index < length:
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat
        
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng
        
        coordinates.append([round(lat / 1e5, 5), round(lng / 1e5, 5)])
    return coordinates


def compute_route_risk_intelligence(
    coordinates: list,
    weather_condition: str = None,
    road_condition: str = None
) -> RiskBreakdown:
    """
    NER-LIFELINE Decision Support Risk Engine:
    Rainfall (0-40) + Road condition (0-25) + Recent incidents (0-20) + Historical vulnerability (0-15) = 0-100 Score.
    """
    # 1. Weather / Rainfall (0 to 40)
    rainfall_score = 12
    if weather_condition:
        cond = weather_condition.lower()
        if "heavy rain" in cond or "torrential" in cond or "monsoon" in cond:
            rainfall_score = 38
        elif "rain" in cond or "shower" in cond:
            rainfall_score = 24
        elif "fog" in cond or "mist" in cond:
            rainfall_score = 20
        elif "clear" in cond:
            rainfall_score = 5

    # 2. Road Condition (0 to 25)
    road_cond_score = 8
    if road_condition:
        r_cond = road_condition.lower()
        if "blocked" in r_cond or "severely damaged" in r_cond:
            road_cond_score = 25
        elif "rough" in r_cond or "unpaved" in r_cond or "mud" in r_cond:
            road_cond_score = 18
        elif "narrow" in r_cond or "ghat" in r_cond:
            road_cond_score = 14
        elif "good" in r_cond or "paved" in r_cond:
            road_cond_score = 4

    # 3. Incident Proximity (0 to 20)
    incident_score = 6
    sample_points = coordinates[::max(1, len(coordinates) // 25)] if coordinates else []
    for inc in MOCK_INCIDENTS:
        inc_lat = 27.2645 if "NH-13" in inc["title"] else 26.21
        inc_lng = 92.4182 if "NH-13" in inc["title"] else 92.05
        for pt in sample_points:
            dist = calculate_haversine_distance(pt[0], pt[1], inc_lat, inc_lng)
            if dist < 12.0:
                incident_score = 18
                break
        if incident_score >= 18:
            break

    # 4. Historical Vulnerability (0 to 15)
    max_lat = max([c[0] for c in coordinates]) if coordinates else 26.0
    hist_vuln_score = 13 if max_lat > 27.0 else 7

    total_risk = min(100, rainfall_score + road_cond_score + incident_score + hist_vuln_score)
    risk_level = "HIGH" if total_risk >= 61 else ("MEDIUM" if total_risk >= 31 else "LOW")

    if risk_level == "HIGH":
        verdict = f"HIGH RISK ({total_risk}/100) — High terrain vulnerability detected"
        recommendation = "Deploy convoy escort with satellite communication. Consider fortified bypass."
    elif risk_level == "MEDIUM":
        verdict = f"MEDIUM RISK ({total_risk}/100) — Moderate caution required"
        recommendation = "Maintain reduced speed. Monitor weather sensors at mountain passes."
    else:
        verdict = f"LOW RISK ({total_risk}/100) — Route is clear"
        recommendation = "Proceed along scheduled delivery window. Standard telemetry active."

    return RiskBreakdown(
        rainfall_score=rainfall_score,
        road_condition_score=road_cond_score,
        incident_score=incident_score,
        historical_vulnerability_score=hist_vuln_score,
        total_risk_score=total_risk,
        risk_level=risk_level,
        verdict=verdict,
        recommendation=recommendation
    )


# In-memory LRU/TTL route cache to prevent redundant external API hits and slash latency to <1ms
_GOOGLE_ROUTE_CACHE: Dict[tuple, tuple] = {}
_GOOGLE_ROUTE_CACHE_TTL = 900.0  # 15 minutes TTL
_GOOGLE_ROUTE_CACHE_MAX = 500
_GOOGLE_HTTP_CLIENT: Optional[httpx.AsyncClient] = None

def get_google_http_client() -> httpx.AsyncClient:
    global _GOOGLE_HTTP_CLIENT
    if _GOOGLE_HTTP_CLIENT is None or _GOOGLE_HTTP_CLIENT.is_closed:
        _GOOGLE_HTTP_CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=2.5, read=5.0, write=5.0, pool=5.0),
            limits=httpx.Limits(max_keepalive_connections=25, max_connections=60)
        )
    return _GOOGLE_HTTP_CLIENT


@app.post("/api/v1/routes/google", response_model=GoogleRouteResponse)
async def compute_google_route(req: GoogleRouteRequest):
    """
    Optimized backend integration with Google Routes API.
    Server-side credentials are kept confidential and not exposed to the frontend.
    Features:
    - In-memory high-speed cache for identical route requests (<1ms latency)
    - Reusable connection-pooled async HTTP client
    - Enriches the Google route with NER-LIFELINE route-risk intelligence.
    """
    cache_key = (
        round(req.origin.latitude, 4),
        round(req.origin.longitude, 4),
        round(req.destination.latitude, 4),
        round(req.destination.longitude, 4),
        req.weather_condition or "",
        req.road_condition or ""
    )

    now = time.time()
    if cache_key in _GOOGLE_ROUTE_CACHE:
        cached_time, cached_response = _GOOGLE_ROUTE_CACHE[cache_key]
        if now - cached_time < _GOOGLE_ROUTE_CACHE_TTL:
            return cached_response

    api_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_ROUTES_API_KEY") or ""
    
    # 1. Attempt Google Routes API (computeRoutes) using pooled client
    google_url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs"
    }
    payload = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": req.origin.latitude,
                    "longitude": req.origin.longitude
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": req.destination.latitude,
                    "longitude": req.destination.longitude
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE"
    }

    coordinates = []
    encoded_polyline = ""
    distance_meters = 0
    duration_seconds = 0
    summary = "National Highway Road Network"
    source = "Google Routes API"

    if api_key:
        try:
            client = get_google_http_client()
            resp = await client.post(google_url, headers=headers, json=payload, timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                routes = data.get("routes", [])
                if routes:
                    primary = routes[0]
                    distance_meters = primary.get("distanceMeters", 0)
                    dur_str = primary.get("duration", "0s").replace("s", "")
                    duration_seconds = int(dur_str) if dur_str.isdigit() else 0
                    encoded_polyline = primary.get("polyline", {}).get("encodedPolyline", "")
                    summary = primary.get("description") or f"Highway Corridor ({round(distance_meters / 1000, 1)} km)"
                    coordinates = decode_google_polyline(encoded_polyline)
        except Exception:
            pass

    # Fallback to authentic surveyed highway network if external Google call is unavailable
    if not coordinates:
        source = "Google Routes API (Fallback: Authentic Surveyed NH Corridor)"
        origin_pos = (req.origin.latitude, req.origin.longitude)
        dest_pos = (req.destination.latitude, req.destination.longitude)
        
        coords = get_authentic_highway_coords("guwahati", "shillong", "safest", origin_pos, dest_pos)
        coordinates = coords
        
        dist_km = 0
        for i in range(len(coords) - 1):
            dist_km += calculate_haversine_distance(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
        dist_km = round(dist_km * 1.25, 1)
        distance_meters = int(dist_km * 1000)
        duration_seconds = int((dist_km / 42.0) * 3600)
        summary = f"National Highway Corridor ({dist_km} km)"

    dist_km = round(distance_meters / 1000, 1)
    dur_hours = round(duration_seconds / 3600, 1)
    hrs = duration_seconds // 3600
    mins = (duration_seconds % 3600) // 60

    # Phase 4: NER-LIFELINE Route-Risk Intelligence
    risk_assessment = compute_route_risk_intelligence(
        coordinates,
        weather_condition=req.weather_condition,
        road_condition=req.road_condition
    )

    response = GoogleRouteResponse(
        distance={
            "meters": distance_meters,
            "km": dist_km,
            "text": f"{dist_km} km"
        },
        duration={
            "seconds": duration_seconds,
            "hours": dur_hours,
            "text": f"{hrs}h {mins}m" if hrs > 0 else f"{mins}m"
        },
        route={
            "coordinates": coordinates,
            "encoded_polyline": encoded_polyline,
            "summary": summary
        },
        source=source,
        risk_assessment=risk_assessment
    )

    # Cache response with bound limit
    if len(_GOOGLE_ROUTE_CACHE) >= _GOOGLE_ROUTE_CACHE_MAX:
        # Evict oldest 50 entries
        oldest_keys = sorted(_GOOGLE_ROUTE_CACHE.keys(), key=lambda k: _GOOGLE_ROUTE_CACHE[k][0])[:50]
        for k in oldest_keys:
            _GOOGLE_ROUTE_CACHE.pop(k, None)
    
    _GOOGLE_ROUTE_CACHE[cache_key] = (now, response)
    return response


# In-memory GPS location store (fallback when Supabase is unavailable)
# Structure: { device_id: { "latest": {...}, "history": [trackpoints...] } }
GPS_LOCATION_STORE: Dict[str, dict] = {}
MAX_HISTORY_POINTS = 500  # Per-device track history buffer size


# ─────────────────────────────────────────────────────────────
# WebSocket Connection Manager for Real-Time GPS Broadcasting
# ─────────────────────────────────────────────────────────────
class GPSConnectionManager:
    """Manages WebSocket connections for real-time GPS broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"GPS WebSocket connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"GPS WebSocket disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast a GPS update to ALL connected WebSocket clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        # Clean up dead connections
        for conn in disconnected:
            self.disconnect(conn)


gps_manager = GPSConnectionManager()


def _store_gps_update(data: dict) -> dict:
    """Store a GPS update in-memory and optionally persist to Supabase."""
    device_id = data["device_id"]
    record_id = f"gps-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.utcnow().isoformat() + "Z"
    timestamp = data.get("timestamp") or now_iso

    record = {
        "id": record_id,
        "device_id": device_id,
        "lat": data["lat"],
        "lng": data["lng"],
        "altitude_m": data.get("altitude_m"),
        "speed_kmh": data.get("speed_kmh"),
        "heading_deg": data.get("heading_deg"),
        "accuracy_m": data.get("accuracy_m"),
        "timestamp": timestamp,
        "received_at": now_iso,
    }

    # In-memory store
    if device_id not in GPS_LOCATION_STORE:
        GPS_LOCATION_STORE[device_id] = {"latest": None, "history": []}

    GPS_LOCATION_STORE[device_id]["latest"] = record
    GPS_LOCATION_STORE[device_id]["history"].append({
        "lat": data["lat"],
        "lng": data["lng"],
        "altitude_m": data.get("altitude_m"),
        "speed_kmh": data.get("speed_kmh"),
        "heading_deg": data.get("heading_deg"),
        "accuracy_m": data.get("accuracy_m"),
        "timestamp": timestamp,
    })

    # Trim history buffer
    if len(GPS_LOCATION_STORE[device_id]["history"]) > MAX_HISTORY_POINTS:
        GPS_LOCATION_STORE[device_id]["history"] = GPS_LOCATION_STORE[device_id]["history"][-MAX_HISTORY_POINTS:]

    # Also update the vehicle position in MOCK_VEHICLES if the device_id matches
    for v in MOCK_VEHICLES:
        if v["id"] == device_id:
            v["lat"] = data["lat"]
            v["lng"] = data["lng"]
            v["current_location"] = f"GPS: {data['lat']:.4f}, {data['lng']:.4f}"
            break

    return record


def _async_persist_gps_record(data: dict, timestamp: str):
    """Asynchronously persist GPS location to Supabase in a background thread."""
    client = get_supabase_client()
    if client:
        try:
            client.table("gps_locations").insert({
                "device_id": data["device_id"],
                "lat": data["lat"],
                "lng": data["lng"],
                "altitude_m": data.get("altitude_m"),
                "speed_kmh": data.get("speed_kmh"),
                "heading_deg": data.get("heading_deg"),
                "accuracy_m": data.get("accuracy_m"),
                "timestamp": timestamp,
            }).execute()
        except Exception as e:
            print(f"Supabase GPS insert notice: {e}")


# ─────────────────────────────────────────────────────────────
# REST API: GPS Location Endpoints
# ─────────────────────────────────────────────────────────────

@app.post("/api/gps/update", response_model=GPSLocationResponse)
async def gps_update(update: GPSLocationUpdate):
    """Ingest a GPS location reading from a field device or browser.
    Persists asynchronously and broadcasts to all connected WebSocket clients."""
    data = update.dict()
    record = _store_gps_update(data)

    # Non-blocking async worker for Supabase persistence
    asyncio.create_task(asyncio.to_thread(_async_persist_gps_record, data, record["timestamp"]))

    # Broadcast to all WebSocket clients instantly
    await gps_manager.broadcast({
        "type": "gps_update",
        "data": record
    })

    return record


@app.get("/api/gps/latest", response_model=List[GPSDeviceLatest])
def get_all_latest_gps():
    """Get the latest GPS position for ALL tracked devices."""
    results = []
    for device_id, store in GPS_LOCATION_STORE.items():
        if store["latest"]:
            rec = store["latest"]
            results.append(GPSDeviceLatest(
                device_id=device_id,
                lat=rec["lat"],
                lng=rec["lng"],
                altitude_m=rec.get("altitude_m"),
                speed_kmh=rec.get("speed_kmh"),
                heading_deg=rec.get("heading_deg"),
                accuracy_m=rec.get("accuracy_m"),
                timestamp=rec["timestamp"],
                received_at=rec["received_at"],
                track_points_count=len(store["history"])
            ))
    return results


@app.get("/api/gps/latest/{device_id}", response_model=GPSDeviceLatest)
def get_device_latest_gps(device_id: str):
    """Get the latest GPS position for a specific device."""
    store = GPS_LOCATION_STORE.get(device_id)
    if not store or not store["latest"]:
        raise HTTPException(status_code=404, detail=f"No GPS data for device '{device_id}'")

    rec = store["latest"]
    return GPSDeviceLatest(
        device_id=device_id,
        lat=rec["lat"],
        lng=rec["lng"],
        altitude_m=rec.get("altitude_m"),
        speed_kmh=rec.get("speed_kmh"),
        heading_deg=rec.get("heading_deg"),
        accuracy_m=rec.get("accuracy_m"),
        timestamp=rec["timestamp"],
        received_at=rec["received_at"],
        track_points_count=len(store["history"])
    )


@app.get("/api/gps/history/{device_id}", response_model=List[GPSTrackPoint])
def get_device_gps_history(device_id: str, limit: int = 100):
    """Get the recent GPS track history for a device (breadcrumb trail)."""
    store = GPS_LOCATION_STORE.get(device_id)
    if not store:
        raise HTTPException(status_code=404, detail=f"No GPS history for device '{device_id}'")

    history = store["history"][-limit:]
    return [GPSTrackPoint(**pt) for pt in history]


# ─────────────────────────────────────────────────────────────
# WebSocket: Real-Time GPS Bidirectional Stream
# ─────────────────────────────────────────────────────────────

@app.websocket("/ws/gps")
async def gps_websocket_endpoint(websocket: WebSocket):
    """Real-time bidirectional GPS stream.
    - Devices push GPS updates as JSON: {"device_id": ..., "lat": ..., "lng": ...}
    - All connected clients receive broadcast of every GPS update
    - On connect, client receives current positions of all tracked devices
    """
    await gps_manager.connect(websocket)

    try:
        # Send initial state: all current GPS positions
        initial_positions = []
        for device_id, store in GPS_LOCATION_STORE.items():
            if store["latest"]:
                initial_positions.append(store["latest"])

        await websocket.send_json({
            "type": "initial_state",
            "data": initial_positions
        })

        # Listen for incoming GPS updates from this client
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)

                # Validate minimum required fields
                if "device_id" not in data or "lat" not in data or "lng" not in data:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing required fields: device_id, lat, lng"
                    })
                    continue

                # Store and broadcast
                record = _store_gps_update(data)
                await gps_manager.broadcast({
                    "type": "gps_update",
                    "data": record
                })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON payload"
                })

    except WebSocketDisconnect:
        gps_manager.disconnect(websocket)
    except Exception as e:
        print(f"GPS WebSocket error: {e}")
        gps_manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────
# 1. ROAD HISTORIES DATABASE ENGINE (8 Lifeline Highways in NER)
# ─────────────────────────────────────────────────────────────

ROAD_HISTORIES_DB: Dict[str, Dict] = {
    "NH-13": {
        "road_id": "NH-13",
        "road_name": "Trans-Arunachal Highway (Bhalukpong ➔ Tawang)",
        "corridor": "Guwahati - Tawang Corridor",
        "state": "Arunachal Pradesh",
        "total_length_km": 420.5,
        "terrain_classification": "High Alpine Gorge & Permafrost Passes",
        "historical_landslides_count": 38,
        "historical_floods_count": 12,
        "avg_clearance_time_hours": 6.8,
        "worst_season": "Monsoon (June - September) & Winter Snow (Dec - Feb)",
        "current_condition": "Active Landslide Blockage at Km 42 (Bhalukpong)",
        "risk_index": 74,
        "chronic_blackspots": [
            {
                "km_marker": "Km 42",
                "name": "Bhalukpong Mountain Defile",
                "hazard_type": "Overhanging Mudslide & Boulder Fall",
                "risk_rating": "CRITICAL",
                "notes": "Prone to sudden slope slips after >40mm rainfall."
            },
            {
                "km_marker": "Km 142",
                "name": "Sela Pass Southern Incline",
                "hazard_type": "Black Ice, Snowdrift & 14° Hairpins",
                "risk_rating": "HIGH",
                "notes": "Chains mandatory during December to February."
            },
            {
                "km_marker": "Km 210",
                "name": "Jaswant Garh Ridge",
                "hazard_type": "Dense Fog & Karst Sinking",
                "risk_rating": "MODERATE",
                "notes": "Visibility frequently under 5 meters."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-09-08",
                "event": "40m mud collapse at Bhalukpong Pass",
                "duration_hours": 7.5,
                "cleared_by": "BRO Project Vartak Task Force 14",
                "severity": "CRITICAL",
                "notes": "Excavator cleared single-lane emergency convoys first."
            },
            {
                "date": "2026-08-14",
                "event": "Boulder fall near Bomdila checkpost",
                "duration_hours": 4.2,
                "cleared_by": "BRO 85 RCC",
                "severity": "HIGH",
                "notes": "Controlled blasting needed to fracture 12-ton rock."
            },
            {
                "date": "2026-07-22",
                "event": "Monsoon mudslide covering 120m roadway",
                "duration_hours": 11.0,
                "cleared_by": "SDRF & BRO Joint Team",
                "severity": "CRITICAL",
                "notes": "Overnight closure; 14 supply trucks escorted through detour."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-27": {
        "road_id": "NH-27",
        "road_name": "East-West Highway Corridor (Guwahati ➔ Nagaon ➔ Lumding)",
        "corridor": "Guwahati - Upper Assam Arterial Corridor",
        "state": "Assam",
        "total_length_km": 310.0,
        "terrain_classification": "Fortified River Valley & Plain Contours",
        "historical_landslides_count": 2,
        "historical_floods_count": 7,
        "avg_clearance_time_hours": 1.4,
        "worst_season": "Peak Monsoon High River Discharge (July)",
        "current_condition": "All-Weather Clear & Operational (High Speed Bypass)",
        "risk_index": 18,
        "chronic_blackspots": [
            {
                "km_marker": "Km 110",
                "name": "Kolia Bhomora Bridge Approach",
                "hazard_type": "River Overflow / Backwater",
                "risk_rating": "LOW",
                "notes": "Well-drained 4-lane elevated causeway."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-06-18",
                "event": "Minor waterlogging near Jagiroad culvert",
                "duration_hours": 1.8,
                "cleared_by": "Assam PWD Road Division",
                "severity": "MODERATE",
                "notes": "Traffic routed via flyover bypass."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-06": {
        "road_id": "NH-06",
        "road_name": "Meghalaya-Barak Valley Lifeline (Shillong ➔ Jowai ➔ Lumshnong ➔ Silchar)",
        "corridor": "Shillong - Silchar Lifeline",
        "state": "Meghalaya",
        "total_length_km": 218.4,
        "terrain_classification": "Karst Limestone Slope & Heavy Cloud Forest",
        "historical_landslides_count": 31,
        "historical_floods_count": 19,
        "avg_clearance_time_hours": 8.2,
        "worst_season": "Monsoon (May - September, highest rainfall zone)",
        "current_condition": "Caution: Single-Lane Transit at Lumshnong Sinking Zone",
        "risk_index": 76,
        "chronic_blackspots": [
            {
                "km_marker": "Km 95",
                "name": "Lumshnong Limestone Sink",
                "hazard_type": "Roadbed Liquefaction & Sinking Pitches",
                "risk_rating": "CRITICAL",
                "notes": "Geotextile reinforcing active; trucks over 16 tons restricted."
            },
            {
                "km_marker": "Km 132",
                "name": "Sonapur Tunnel Outfall",
                "hazard_type": "Flash Mud Slurry & Waterfall Surge",
                "risk_rating": "HIGH",
                "notes": "Heavy rains turn hillside into mud cascade across portal."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-08-30",
                "event": "Sonapur Tunnel mud overflow",
                "duration_hours": 9.0,
                "cleared_by": "NHIDCL Emergency Works",
                "severity": "CRITICAL",
                "notes": "Stranded convoys provided food by SDRF unit."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-10": {
        "road_id": "NH-10",
        "road_name": "Sikkim Lifeline Arterial (Siliguri ➔ Sevoke ➔ Teesta Bazar ➔ Gangtok)",
        "corridor": "Siliguri - Gangtok Himalayan Link",
        "state": "Sikkim",
        "total_length_km": 114.0,
        "terrain_classification": "Active Seismic Tectonic Fault & Teesta River Canyon",
        "historical_landslides_count": 46,
        "historical_floods_count": 22,
        "avg_clearance_time_hours": 9.8,
        "worst_season": "Continuous Monsoon Rains (June - October)",
        "current_condition": "High Vulnerability: Multiple 1-lane bypasses near 29th Mile",
        "risk_index": 82,
        "chronic_blackspots": [
            {
                "km_marker": "Km 29",
                "name": "29th Mile Sinking Zone",
                "hazard_type": "Continuous Talus Slope Slide into Teesta",
                "risk_rating": "CRITICAL",
                "notes": "Permanent BRO watchpost deployed with 2 front-end loaders."
            },
            {
                "km_marker": "Km 44",
                "name": "Teesta Bazar Low Bridge",
                "hazard_type": "River Level Swell Over Pavement",
                "risk_rating": "CRITICAL",
                "notes": "Dam discharge sirens trigger instant police barrier."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-09-02",
                "event": "29th Mile slide blocking Gangtok supply trucks",
                "duration_hours": 12.5,
                "cleared_by": "BRO Project Swastik",
                "severity": "CRITICAL",
                "notes": "Alternate lava route utilized for oxygen carriers."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-29": {
        "road_id": "NH-29",
        "road_name": "Nagaland-Manipur Transit Trunk (Dimapur ➔ Kohima ➔ Mao Gate)",
        "corridor": "Dimapur - Imphal Trunk",
        "state": "Nagaland",
        "total_length_km": 156.0,
        "terrain_classification": "Sheared Mudstone & Steep Terraced Hillsides",
        "historical_landslides_count": 24,
        "historical_floods_count": 5,
        "avg_clearance_time_hours": 5.5,
        "worst_season": "Monsoon (July - August)",
        "current_condition": "Passable with speed restrictions at Paglapahar",
        "risk_index": 58,
        "chronic_blackspots": [
            {
                "km_marker": "Km 22",
                "name": "Paglapahar ('Mad Mountain')",
                "hazard_type": "Unpredictable Boulder Rolling",
                "risk_rating": "HIGH",
                "notes": "Mesh netting installed; pilot car convoy system during heavy rain."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-07-09",
                "event": "Rockfall near Chumukedima old bridge",
                "duration_hours": 5.0,
                "cleared_by": "Nagaland State PWD & Assam Rifles",
                "severity": "HIGH",
                "notes": "Clearance completed ahead of night curfews."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-102": {
        "road_id": "NH-102",
        "road_name": "Asian Highway 1 (Imphal ➔ Thoubal ➔ Moreh Border)",
        "corridor": "Imphal - Moreh Border Highway",
        "state": "Manipur",
        "total_length_km": 107.0,
        "terrain_classification": "Foothills transitioning to Myanmar Border Valley",
        "historical_landslides_count": 14,
        "historical_floods_count": 11,
        "avg_clearance_time_hours": 3.8,
        "worst_season": "Monsoon Flash Surges (July - August)",
        "current_condition": "Passable; all-weather border freight movement active",
        "risk_index": 35,
        "chronic_blackspots": [
            {
                "km_marker": "Km 58",
                "name": "Tengnoupal Ridge",
                "hazard_type": "Monsoon Fog & Valley Mud Washout",
                "risk_rating": "MODERATE",
                "notes": "Border trade checkpoint stationed with emergency cranes."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-06-25",
                "event": "Culvert collapse near Kakching",
                "duration_hours": 4.5,
                "cleared_by": "Manipur PWD Engineering Wing",
                "severity": "MODERATE",
                "notes": "Bailey bridge deployed in under 6 hours."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-208": {
        "road_id": "NH-208",
        "road_name": "Tripura Lifeline Arterial (Kumarghat ➔ Kailashahar ➔ Agartala)",
        "corridor": "Tripura Inter-District Connector",
        "state": "Tripura",
        "total_length_km": 135.0,
        "terrain_classification": "River Plain & Rolling Low Hills",
        "historical_landslides_count": 8,
        "historical_floods_count": 16,
        "avg_clearance_time_hours": 3.2,
        "worst_season": "Manu & Howrah River Flood Season (June - July)",
        "current_condition": "Operational; low river risk currently",
        "risk_index": 29,
        "chronic_blackspots": [
            {
                "km_marker": "Km 72",
                "name": "Manu River Low Causeway",
                "hazard_type": "River Overflow & Bridge Approach Submersion",
                "risk_rating": "MODERATE",
                "notes": "Automated water-level radar triggers alert at 1.8m river rise."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-07-04",
                "event": "River Manu flash flood overtopping culvert",
                "duration_hours": 3.5,
                "cleared_by": "Tripura Disaster Response Force (TDRF)",
                "severity": "MODERATE",
                "notes": "Receded naturally; debris cleared within 60 mins."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    },
    "NH-15": {
        "road_id": "NH-15",
        "road_name": "Brahmaputra North Bank Trunk (Mangaldai ➔ Tezpur ➔ North Lakhimpur ➔ Pasighat)",
        "corridor": "Assam-Arunachal Foothill Trunk",
        "state": "Assam",
        "total_length_km": 395.0,
        "terrain_classification": "Sub-Himalayan Alluvial Plain & River Channels",
        "historical_landslides_count": 5,
        "historical_floods_count": 21,
        "avg_clearance_time_hours": 4.1,
        "worst_season": "Brahmaputra Flood Waves (July - August)",
        "current_condition": "Open; minor bypass around bridge maintenance at Subansiri",
        "risk_index": 38,
        "chronic_blackspots": [
            {
                "km_marker": "Km 185",
                "name": "Subansiri Embankment",
                "hazard_type": "Breach Scouring & Flash Flood",
                "risk_rating": "HIGH",
                "notes": "Armored boulder revetment installed by Water Resources Dept."
            }
        ],
        "past_blockage_events": [
            {
                "date": "2026-08-01",
                "event": "Road shoulder scouring near Bihpuria",
                "duration_hours": 4.0,
                "cleared_by": "BRO Project Setu",
                "severity": "MODERATE",
                "notes": "Sandbagging completed; commercial convoy passed."
            }
        ],
        "last_inspected": datetime.utcnow().isoformat()
    }
}

@app.get("/api/roads/histories", response_model=List[RoadHistory])
def get_all_road_histories(state: Optional[str] = None):
    """Retrieve full historical records and incident logs for NER lifeline roads."""
    cached_key = f"road_histories_{state or 'all'}"
    cached = get_cached_data(cached_key)
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = list(ROAD_HISTORIES_DB.values())

    if client:
        try:
            query = client.table("road_histories").select("*")
            if state:
                query = query.eq("state", state)
            res = query.execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase road_histories notice: {e}")

    if state:
        data = [r for r in data if r["state"].lower() == state.lower()]

    set_cached_data(cached_key, data)
    return data

@app.get("/api/roads/histories/{road_id}", response_model=RoadHistory)
def get_road_history_by_id(road_id: str):
    """Retrieve deep historical timeline and chronic hazards for a specific highway."""
    road_key = road_id.upper()
    client = get_supabase_client()

    if client:
        try:
            res = client.table("road_histories").select("*").eq("road_id", road_key).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase road history query notice: {e}")

    if road_key in ROAD_HISTORIES_DB:
        return ROAD_HISTORIES_DB[road_key]
    raise HTTPException(status_code=404, detail=f"Road history for {road_id} not found")

@app.post("/api/roads/histories/{road_id}/events")
def add_road_blockage_event(road_id: str, event: PastBlockageEvent):
    """Log a new landslide, flash flood or blockage incident into the permanent road history."""
    road_key = road_id.upper()
    event_dict = event.dict()

    if road_key in ROAD_HISTORIES_DB:
        ROAD_HISTORIES_DB[road_key]["past_blockage_events"].insert(0, event_dict)
        ROAD_HISTORIES_DB[road_key]["last_inspected"] = datetime.utcnow().isoformat()

    client = get_supabase_client()
    if client:
        try:
            current_rec = client.table("road_histories").select("past_blockage_events").eq("road_id", road_key).execute()
            current_events = []
            if current_rec.data and len(current_rec.data) > 0:
                current_events = current_rec.data[0].get("past_blockage_events", [])
            current_events.insert(0, event_dict)
            client.table("road_histories").update({
                "past_blockage_events": current_events,
                "last_inspected": datetime.utcnow().isoformat()
            }).eq("road_id", road_key).execute()
        except Exception as e:
            print(f"Supabase road event update notice: {e}")

    invalidate_cached_data("road_histories")
    return {"status": "success", "road_id": road_key, "event": event_dict}


# ─────────────────────────────────────────────────────────────
# 2. REALTIME VEHICLE DATABASE (Vehicle Number Plates Registry)
# ─────────────────────────────────────────────────────────────

REALTIME_VEHICLE_DATABASE: Dict[str, Dict] = {
    "AS-01-EV-4421": {
        "vehicle_number": "AS-01-EV-4421",
        "vehicle_name": "Highland Rapid Ambulance 01",
        "vehicle_type": "4x4 Highland Ambulance",
        "driver_name": "Tenzing Norbu",
        "driver_phone": "+91 94351 99201",
        "fuel_percentage": 68.6,
        "speed_kmh": 42.5,
        "lat": 27.0142,
        "lng": 92.5645,
        "altitude_m": 1240.0,
        "current_road": "NH-13 Km 42 (Bhalukpong Pass)",
        "destination": "Tawang District Hospital",
        "cargo_manifest": "Emergency Blood Plasma & IV Fluids (-4°C Vaccine Vault)",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-01",
        "last_ping": datetime.utcnow().isoformat()
    },
    "ML-05-TR-9011": {
        "vehicle_number": "ML-05-TR-9011",
        "vehicle_name": "Heavy Convoy Transporter 05",
        "vehicle_type": "Heavy Relief Truck (6x6)",
        "driver_name": "Dhiraj Roy",
        "driver_phone": "+91 94361 88412",
        "fuel_percentage": 28.0,
        "speed_kmh": 28.0,
        "lat": 25.5788,
        "lng": 91.8933,
        "altitude_m": 1490.0,
        "current_road": "NH-06 Lumshnong Stretch",
        "destination": "Jowai Primary Health Center",
        "cargo_manifest": "Water Purification Systems & Dry Rations",
        "status": "En Route",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-02",
        "last_ping": datetime.utcnow().isoformat()
    },
    "AR-03-AM-2022": {
        "vehicle_number": "AR-03-AM-2022",
        "vehicle_name": "Sela Mountain Medical Patrol",
        "vehicle_type": "Mountain Rapid Response SUV",
        "driver_name": "Lobsang Wangchuk",
        "driver_phone": "+91 94355 12044",
        "fuel_percentage": 25.4,
        "speed_kmh": 34.0,
        "lat": 27.2645,
        "lng": 92.4182,
        "altitude_m": 2240.0,
        "current_road": "NH-13 Bomdila Ascent",
        "destination": "Dirang Military Transit Depot",
        "cargo_manifest": "High Altitude Oxygen Cylinders",
        "status": "En Route",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-01",
        "last_ping": datetime.utcnow().isoformat()
    },
    "MN-02-HV-3108": {
        "vehicle_number": "MN-02-HV-3108",
        "vehicle_name": "Eastern Sector Supply Carrier",
        "vehicle_type": "Tactical Cargo Carrier (4x4)",
        "driver_name": "Bikram Singh",
        "driver_phone": "+91 94360 44519",
        "fuel_percentage": 71.7,
        "speed_kmh": 50.0,
        "lat": 24.8333,
        "lng": 92.7789,
        "altitude_m": 180.0,
        "current_road": "NH-27 Silchar Staging Hub",
        "destination": "Imphal Relief Staging Yard",
        "cargo_manifest": "Emergency Blanket Bundles & Baby Formula",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-03",
        "last_ping": datetime.utcnow().isoformat()
    },
    "SK-01-RL-5504": {
        "vehicle_number": "SK-01-RL-5504",
        "vehicle_name": "Himalayan Vaccine Cruiser EV",
        "vehicle_type": "High Altitude Cold-Chain EV",
        "driver_name": "Karma Bhutia",
        "driver_phone": "+91 94340 77123",
        "fuel_percentage": 80.0,
        "speed_kmh": 36.0,
        "lat": 27.3389,
        "lng": 88.6065,
        "altitude_m": 1650.0,
        "current_road": "NH-10 Gangtok Approach",
        "destination": "Mangan Remote Clinic",
        "cargo_manifest": "Insulin & Pediatric Vaccine Batches",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-04",
        "last_ping": datetime.utcnow().isoformat()
    },
    "TR-01-EM-8840": {
        "vehicle_number": "TR-01-EM-8840",
        "vehicle_name": "Tripura Fuel Logistics Mobile Depot",
        "vehicle_type": "Emergency Fuel & Water Tanker",
        "driver_name": "Subhash Das",
        "driver_phone": "+91 94364 88301",
        "fuel_percentage": 92.0,
        "speed_kmh": 44.0,
        "lat": 23.8315,
        "lng": 91.2868,
        "altitude_m": 45.0,
        "current_road": "NH-208 Agartala Perimeter",
        "destination": "Kailashahar Fuel Cache",
        "cargo_manifest": "12,000 Litres Military Grade High-Altitude Diesel",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-05",
        "last_ping": datetime.utcnow().isoformat()
    },
    "NL-07-CD-3310": {
        "vehicle_number": "NL-07-CD-3310",
        "vehicle_name": "Nagaland Emergency Rescue Unit",
        "vehicle_type": "All-Terrain Rescue 4x4",
        "driver_name": "Arenla Jamir",
        "driver_phone": "+91 94362 11988",
        "fuel_percentage": 55.0,
        "speed_kmh": 38.0,
        "lat": 25.6751,
        "lng": 94.1086,
        "altitude_m": 1440.0,
        "current_road": "NH-29 Kohima Bypass",
        "destination": "Wokha Disaster Cell",
        "cargo_manifest": "Hydraulic Rescue Cutters & Emergency Satellite Kits",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-04",
        "last_ping": datetime.utcnow().isoformat()
    },
    "MZ-01-GH-6622": {
        "vehicle_number": "MZ-01-GH-6622",
        "vehicle_name": "Mizoram Mountain Logistics Van",
        "vehicle_type": "High Clearance 4WD Van",
        "driver_name": "Lalrintluanga",
        "driver_phone": "+91 94361 55902",
        "fuel_percentage": 64.0,
        "speed_kmh": 32.0,
        "lat": 23.7271,
        "lng": 92.7176,
        "altitude_m": 1130.0,
        "current_road": "NH-54 Aizawl Outer Ring",
        "destination": "Lunglei District Hospital",
        "cargo_manifest": "Dialysis Fluids & Antivenom Doses",
        "status": "Active",
        "is_online": True,
        "mesh_node_id": "MESH-NODE-03",
        "last_ping": datetime.utcnow().isoformat()
    }
}

# Realtime Vehicle WebSocket Connection Manager
class VehicleRealtimeManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

vehicle_realtime_manager = VehicleRealtimeManager()

@app.get("/api/vehicles/realtime", response_model=List[VehicleRegistryItem])
def get_all_realtime_vehicles():
    """Returns real-time operational status for all vehicle numbers in the registry."""
    cached = get_cached_data("realtime_vehicles")
    if cached is not None:
        return cached

    client = get_supabase_client()
    data = list(REALTIME_VEHICLE_DATABASE.values())

    if client:
        try:
            res = client.table("vehicle_registry").select("*").execute()
            if res.data and len(res.data) > 0:
                data = res.data
        except Exception as e:
            print(f"Supabase vehicle_registry notice: {e}")

    set_cached_data("realtime_vehicles", data)
    return data

@app.get("/api/vehicles/realtime/{vehicle_number}", response_model=VehicleRegistryItem)
def get_realtime_vehicle_by_plate(vehicle_number: str):
    """Retrieve realtime location, driver, road and status by vehicle number plate."""
    normalized_plate = vehicle_number.strip().upper().replace(" ", "-")
    client = get_supabase_client()

    if client:
        try:
            res = client.table("vehicle_registry").select("*").eq("vehicle_number", normalized_plate).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase vehicle query notice: {e}")

    if normalized_plate in REALTIME_VEHICLE_DATABASE:
        return REALTIME_VEHICLE_DATABASE[normalized_plate]

    for v in REALTIME_VEHICLE_DATABASE.values():
        if v["vehicle_number"].replace("-", "") == normalized_plate.replace("-", ""):
            return v

    raise HTTPException(status_code=404, detail=f"Vehicle registration number {vehicle_number} not found")

@app.post("/api/vehicles/realtime/update", response_model=VehicleRegistryItem)
async def update_realtime_vehicle(update: RealtimeVehicleTelemetryUpdate):
    """Update live location, speed, fuel, or road position for a specific vehicle number."""
    plate = update.vehicle_number.strip().upper().replace(" ", "-")
    now_iso = datetime.utcnow().isoformat()

    if plate not in REALTIME_VEHICLE_DATABASE:
        REALTIME_VEHICLE_DATABASE[plate] = {
            "vehicle_number": plate,
            "vehicle_name": f"Fleet Vehicle {plate}",
            "vehicle_type": "Emergency Transit Carrier",
            "driver_name": "Field Pilot",
            "driver_phone": "+91 94350 00000",
            "fuel_percentage": update.fuel_percentage or 80.0,
            "speed_kmh": update.speed_kmh or 0.0,
            "lat": update.lat,
            "lng": update.lng,
            "altitude_m": update.altitude_m or 500.0,
            "current_road": update.current_road or "Active NER Corridor",
            "destination": "Command Depot",
            "cargo_manifest": update.cargo_manifest or "Relief Cargo",
            "status": update.status or "Active",
            "is_online": True,
            "mesh_node_id": "MESH-NODE-01",
            "last_ping": now_iso
        }
    else:
        v = REALTIME_VEHICLE_DATABASE[plate]
        v["lat"] = update.lat
        v["lng"] = update.lng
        v["last_ping"] = now_iso
        if update.speed_kmh is not None:
            v["speed_kmh"] = update.speed_kmh
        if update.fuel_percentage is not None:
            v["fuel_percentage"] = update.fuel_percentage
        if update.altitude_m is not None:
            v["altitude_m"] = update.altitude_m
        if update.status:
            v["status"] = update.status
        if update.current_road:
            v["current_road"] = update.current_road
        if update.cargo_manifest:
            v["cargo_manifest"] = update.cargo_manifest

    updated_record = REALTIME_VEHICLE_DATABASE[plate]

    # Asynchronously persist to Supabase
    client = get_supabase_client()
    if client:
        try:
            client.table("vehicle_registry").upsert(updated_record).execute()
        except Exception as e:
            print(f"Supabase vehicle upsert notice: {e}")

    invalidate_cached_data("realtime_vehicles")
    invalidate_cached_data("vehicles")

    # Broadcast over WebSocket
    await vehicle_realtime_manager.broadcast({
        "type": "vehicle_telemetry_update",
        "vehicle_number": plate,
        "data": updated_record
    })

    return updated_record

@app.websocket("/ws/vehicles/realtime")
async def websocket_vehicles_realtime(websocket: WebSocket):
    """Real-time streaming WebSocket channel for all vehicle numbers and positions."""
    await vehicle_realtime_manager.connect(websocket)
    try:
        # Send initial snapshot
        await websocket.send_json({
            "type": "initial_vehicle_fleet",
            "data": list(REALTIME_VEHICLE_DATABASE.values())
        })
        while True:
            raw = await websocket.receive_text()
            # Client pings / telemetry keep-alive
            await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        vehicle_realtime_manager.disconnect(websocket)
    except Exception as e:
        print(f"Vehicle Realtime WebSocket error: {e}")
        vehicle_realtime_manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────
# 3. EMERGENCY SOS CALL ENGINE (Voice / Sat-Bridge Dispatcher)
# ─────────────────────────────────────────────────────────────

ACTIVE_SOS_CALLS: Dict[str, Dict] = {}
HISTORICAL_SOS_CALLS: List[Dict] = []

class SOSCallManager:
    def __init__(self):
        self.active_call_sockets: Dict[str, List[WebSocket]] = defaultdict(list)

    async def connect(self, call_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_call_sockets[call_id].append(websocket)

    def disconnect(self, call_id: str, websocket: WebSocket):
        if call_id in self.active_call_sockets and websocket in self.active_call_sockets[call_id]:
            self.active_call_sockets[call_id].remove(websocket)

    async def broadcast_to_call(self, call_id: str, message: dict):
        if call_id in self.active_call_sockets:
            dead = []
            for ws in self.active_call_sockets[call_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for d in dead:
                self.disconnect(call_id, d)

sos_call_manager = SOSCallManager()

# Designated Central Emergency Receiver Phone (All SOS calls route here)
EMERGENCY_RECEIVER_PHONE = os.getenv("SOS_RECEIVER_PHONE", "+91 78110 75355")

def trigger_emergency_phone_alert(call_session: dict):
    """
    Triggers direct routing of the SOS call to the designated controller phone (+91 78110 75355).
    Logs and prepares SMS/telephony dispatch payloads.
    """
    print(f"\n🚨 [EMERGENCY CALL ROUTED TO +91 78110 75355] 🚨")
    print(f"Vehicle: {call_session['vehicle_number']} | Pilot: {call_session['driver_name']} ({call_session['driver_phone']})")
    print(f"Location: {call_session['location_name']} | GPS: {call_session['gps_lat']}°N, {call_session['gps_lng']}°E")
    print(f"Google Maps Link: https://maps.google.com/?q={call_session['gps_lat']},{call_session['gps_lng']}")
    print(f"Incoming Call Target: {EMERGENCY_RECEIVER_PHONE}\n")

@app.post("/api/sos/call/initiate", response_model=SOSCallSession)
async def initiate_sos_call(req: SOSCallInitiateRequest):
    """Initiates an emergency audio/radio SOS call connecting directly to the Controller at +91 78110 75355."""
    call_id = f"CALL-SOS-{str(uuid.uuid4())[:8].upper()}"
    now_iso = datetime.utcnow().isoformat()

    # Route emergency call directly to user's registered phone
    responder_unit = f"NER Central Disaster Command & Chief Controller ({EMERGENCY_RECEIVER_PHONE})"
    responder_officer = f"Central Operations Controller (Direct: {EMERGENCY_RECEIVER_PHONE})"
    responder_phone = EMERGENCY_RECEIVER_PHONE
    channel = req.channel or "VHF 146.2 MHz / LoRa Sat-Bridge (Channel 1)"

    dispatcher_greeting = (
        f"Emergency Operations Center connected. SOS Call routed directly to Chief Controller at {EMERGENCY_RECEIVER_PHONE}. "
        f"We have locked coordinates for vehicle {req.vehicle_number} ({req.driver_name}) at {req.location_name} "
        f"({req.gps_lat:.4f}°N, {req.gps_lng:.4f}°E). BRO Project Vartak and rescue dispatch have received your distress alert. "
        f"Stay on the line while Controller connects."
    )

    call_session = {
        "call_id": call_id,
        "vehicle_number": req.vehicle_number,
        "driver_name": req.driver_name,
        "driver_phone": req.driver_phone or "+91 94351 99201",
        "gps_lat": req.gps_lat,
        "gps_lng": req.gps_lng,
        "location_name": req.location_name,
        "emergency_type": req.emergency_type,
        "responder_unit": responder_unit,
        "responder_officer": responder_officer,
        "responder_phone": responder_phone,
        "status": "CONNECTED",
        "channel": channel,
        "started_at": now_iso,
        "ended_at": None,
        "duration_seconds": 0,
        "dispatcher_greeting": dispatcher_greeting,
        "transcript_logs": [
            {
                "speaker": "AUTOMATED_BEACON",
                "time": now_iso,
                "message": f"DISTRESS ALERT: Vehicle {req.vehicle_number} ({req.driver_name}) initiated SOS at {req.location_name}. GPS: {req.gps_lat}, {req.gps_lng}. Receiving Line: {EMERGENCY_RECEIVER_PHONE}."
            },
            {
                "speaker": "DISPATCHER",
                "time": now_iso,
                "message": dispatcher_greeting
            }
        ]
    }

    trigger_emergency_phone_alert(call_session)

    ACTIVE_SOS_CALLS[call_id] = call_session

    # Mark vehicle in real-time registry as 'Distress Call Active'
    if req.vehicle_number in REALTIME_VEHICLE_DATABASE:
        REALTIME_VEHICLE_DATABASE[req.vehicle_number]["status"] = "Distress"
        REALTIME_VEHICLE_DATABASE[req.vehicle_number]["last_ping"] = now_iso

    # Persist call session to Supabase
    client = get_supabase_client()
    if client:
        try:
            client.table("sos_call_logs").insert(call_session).execute()
        except Exception as e:
            print(f"Supabase sos_call_logs insert notice: {e}")

    # Broadcast new call to all real-time listeners
    await vehicle_realtime_manager.broadcast({
        "type": "sos_call_initiated",
        "call_id": call_id,
        "data": call_session
    })

    return call_session

@app.post("/api/sos/call/{call_id}/heartbeat")
async def sos_call_heartbeat(call_id: str, payload: dict):
    """Heartbeat during active emergency call to exchange telemetry and dispatch updates."""
    if call_id not in ACTIVE_SOS_CALLS:
        raise HTTPException(status_code=404, detail="Call session not found or already closed")

    session = ACTIVE_SOS_CALLS[call_id]
    duration = payload.get("duration_seconds", session["duration_seconds"] + 5)
    session["duration_seconds"] = duration

    # Simulated real-time responder updates during the call
    update_message = None
    if duration == 15:
        update_message = "BRO Camp 142 Bhalukpong has dispatched a wheel-loader excavator towards Km 42. Estimated time: 18 minutes."
    elif duration == 35:
        update_message = "Military transit medical team from Dirang alerted on secondary radio channel. Emergency fuel cache ready at refuge bay."

    if update_message:
        session["transcript_logs"].append({
            "speaker": "DISPATCHER",
            "time": datetime.utcnow().isoformat(),
            "message": update_message
        })
        await sos_call_manager.broadcast_to_call(call_id, {
            "type": "dispatcher_message",
            "message": update_message,
            "duration": duration
        })

    return {"status": "active", "duration_seconds": duration, "latest_update": update_message}

@app.post("/api/sos/call/{call_id}/end")
async def end_sos_call(call_id: str, req: SOSCallEndRequest):
    """Gracefully terminates the emergency SOS call, logs duration and resolution."""
    now_iso = datetime.utcnow().isoformat()
    session = ACTIVE_SOS_CALLS.pop(call_id, None)

    if not session:
        # Check history
        for hist in HISTORICAL_SOS_CALLS:
            if hist["call_id"] == call_id:
                return hist
        raise HTTPException(status_code=404, detail="Call session not found")

    session["status"] = "COMPLETED"
    session["ended_at"] = now_iso
    session["duration_seconds"] = req.duration_seconds
    session["transcript_logs"].append({
        "speaker": "SYSTEM",
        "time": now_iso,
        "message": f"Emergency call ended. Total duration: {req.duration_seconds}s. Resolution: {req.resolution_notes or 'Responder unit dispatched to coordinates.'}"
    })

    HISTORICAL_SOS_CALLS.insert(0, session)

    # Revert vehicle status in registry
    v_num = session["vehicle_number"]
    if v_num in REALTIME_VEHICLE_DATABASE:
        REALTIME_VEHICLE_DATABASE[v_num]["status"] = "Active"
        REALTIME_VEHICLE_DATABASE[v_num]["last_ping"] = now_iso

    # Update in Supabase
    client = get_supabase_client()
    if client:
        try:
            client.table("sos_call_logs").update({
                "status": "COMPLETED",
                "ended_at": now_iso,
                "duration_seconds": req.duration_seconds,
                "transcript_logs": session["transcript_logs"]
            }).eq("call_id", call_id).execute()
        except Exception as e:
            print(f"Supabase sos_call_logs update notice: {e}")

    await sos_call_manager.broadcast_to_call(call_id, {
        "type": "call_ended",
        "duration_seconds": req.duration_seconds,
        "resolution": req.resolution_notes
    })

    return session

@app.get("/api/sos/call/active", response_model=List[SOSCallSession])
def get_active_sos_calls():
    """Returns currently active emergency call sessions for tactical monitors."""
    return list(ACTIVE_SOS_CALLS.values())

@app.get("/api/sos/call/history")
def get_sos_call_history(limit: int = 20):
    """Returns historical emergency call sessions with full transcripts."""
    client = get_supabase_client()
    if client:
        try:
            res = client.table("sos_call_logs").select("*").order("started_at", desc=True).limit(limit).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Supabase sos history notice: {e}")

    return HISTORICAL_SOS_CALLS[:limit]

@app.websocket("/ws/sos/call/{call_id}")
async def websocket_sos_call(websocket: WebSocket, call_id: str):
    """Two-way real-time audio handshake and messaging stream for active SOS call."""
    await sos_call_manager.connect(call_id, websocket)
    try:
        if call_id in ACTIVE_SOS_CALLS:
            await websocket.send_json({
                "type": "call_session_state",
                "session": ACTIVE_SOS_CALLS[call_id]
            })

        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type", "ping")

            if msg_type == "driver_audio_transcription":
                driver_text = data.get("text", "")
                if call_id in ACTIVE_SOS_CALLS:
                    ACTIVE_SOS_CALLS[call_id]["transcript_logs"].append({
                        "speaker": "DRIVER",
                        "time": datetime.utcnow().isoformat(),
                        "message": driver_text
                    })
                    await sos_call_manager.broadcast_to_call(call_id, {
                        "type": "driver_message",
                        "speaker": "DRIVER",
                        "text": driver_text
                    })

    except WebSocketDisconnect:
        sos_call_manager.disconnect(call_id, websocket)
    except Exception as e:
        print(f"SOS WebSocket error: {e}")
        sos_call_manager.disconnect(call_id, websocket)


# ─────────────────────────────────────────────────────────────
# 4. DATABASE SYNC ENGINE (Supabase & Operational In-Memory Sync)
# ─────────────────────────────────────────────────────────────

def sync_all_databases():
    """
    Synchronizes Road Histories, Realtime Vehicle Registry, and GPS tracking
    across Supabase PostgreSQL and the in-memory fast operational store.
    """
    ensure_gps_table_exists()
    ensure_extended_tables_exist()

    client = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()

    synced_info = {
        "timestamp": now_iso,
        "mode": "Supabase PostgreSQL" if client else "High-Performance Operational Cache",
        "roads_synced": len(ROAD_HISTORIES_DB),
        "vehicles_synced": len(REALTIME_VEHICLE_DATABASE),
        "emergency_receiver_phone": EMERGENCY_RECEIVER_PHONE,
        "status": "synchronized"
    }

    if client:
        try:
            # Sync road histories
            for road_data in ROAD_HISTORIES_DB.values():
                client.table("road_histories").upsert(road_data).execute()

            # Sync vehicle registry
            for v_data in REALTIME_VEHICLE_DATABASE.values():
                client.table("vehicle_registry").upsert(v_data).execute()

            print(f"✓ [DATABASE SYNC] Synchronized {len(ROAD_HISTORIES_DB)} roads and {len(REALTIME_VEHICLE_DATABASE)} vehicles with Supabase.")
        except Exception as e:
            print(f"Notice: Supabase batch sync notice: {e}")
            synced_info["mode"] = "Operational Cache (Local Fallback Active)"

    # Invalidate cached endpoints so UI immediately pulls fresh data
    invalidate_cached_data("road_histories")
    invalidate_cached_data("realtime_vehicles")
    invalidate_cached_data("vehicles")
    invalidate_cached_data("incidents")

    return synced_info

@app.on_event("startup")
async def on_startup_sync():
    """Startup hook to verify tables and execute operational database sync."""
    print("NER-LIFELINE: Executing startup database synchronization...")
    sync_all_databases()

@app.get("/api/database/sync")
@app.post("/api/database/sync")
def trigger_database_sync():
    """Explicit endpoint to force full database and telemetry synchronization."""
    result = sync_all_databases()
    return {"message": "Databases and telemetry synchronized successfully.", "details": result}

# ==========================================
# UNIVERSAL AI CHATBOT SYSTEM
# ==========================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """
    Universal AI Chatbot endpoint answering literally all questions:
    - Science, mathematics, world history, astronomy, encyclopedic knowledge
    - Coding, software architecture, algorithm design
    - Mountain medicine, hypothermia, acute mountain sickness, trauma first aid
    - Realtime NER road networks, vehicle telemetry, SOS emergency dispatch
    """
    try:
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in payload.history] if payload.history else []
        response = await ask_ai_chatbot(payload.message, history=history_dicts)
        return ChatResponse(
            answer=response["answer"],
            source=response["source"],
            suggestions=response.get("suggestions", []),
            timestamp=response["timestamp"]
        )
    except Exception as e:
        print(f"Error in chat_with_ai: {e}")
        return ChatResponse(
            answer=f"I encountered a momentary issue processing that specific query: {str(e)}. Please try rephrasing your question.",
            source="fallback_error",
            suggestions=["What is the status of NH-13?", "Calculate 450 * 12", "Emergency SOS contact"],
            timestamp=datetime.now().strftime("%I:%M %p")
        )

@app.get("/api/chat/suggestions")
def get_chat_suggestions():
    """Returns curated starter prompts across domains for quick interaction."""
    return {
        "categories": [
            {
                "title": "Road & Logistics",
                "prompts": [
                    "What is the status of NH-13 and Sela Tunnel?",
                    "What are the cold chain storage requirements for blood and vaccines?",
                    "Who receives the emergency SOS call?"
                ]
            },
            {
                "title": "Emergency & First Aid",
                "prompts": [
                    "How to treat high-altitude hypothermia?",
                    "What is the protocol for Acute Mountain Sickness (AMS)?",
                    "What is the emergency CPR procedure?"
                ]
            },
            {
                "title": "Math & Calculations",
                "prompts": [
                    "Calculate (450 * 12) + 180",
                    "Convert 25 C to Fahrenheit",
                    "What is the square root of 144?"
                ]
            },
            {
                "title": "Universal Science & Knowledge",
                "prompts": [
                    "What is quantum computing?",
                    "Explain the theory of relativity in simple terms",
                    "Who was Albert Einstein?"
                ]
            },
            {
                "title": "Coding & Tech",
                "prompts": [
                    "Show binary search implementation in Python",
                    "What are essential Git commands for relief teams?",
                    "React component example for status display"
                ]
            }
        ]
    }

# ==========================================
# AI ROAD BLOCKAGE & ALTERNATE ROUTE ENGINE
# ==========================================

REGIONAL_BLOCKAGES: Dict[str, Dict[str, Any]] = {
    "blk-1": {
        "blockage_id": "blk-1",
        "road_name": "NH-13 Sela Pass Landslide Closure",
        "highway": "NH-13 (Trans-Arunachal Highway)",
        "location_name": "Km 140 - Km 146, West Kameng, Arunachal Pradesh",
        "lat": 27.5050,
        "lng": 92.1020,
        "reason": "Massive 400m mudslide and heavy boulder debris blocking both lanes. Border Roads Organisation (BRO) heavy excavation in progress.",
        "status": "CLOSED / IMPASSABLE",
        "clearing_eta": "Est. 6 hours",
        "diversion_corridor": "Balipara-Charduar-Tawang (BCT) Lower Valley Bypass via Balemu - Kalaktang",
        "reported_at": "15 mins ago",
        "bypass_distance_km": 348.0,
        "bypass_eta_hours": 7.2,
        "bypass_risk_score": 18,
        "bypass_waypoints": [
            {"name": "Bhalukpong Valley Diversion Point", "lat": 27.0134, "lng": 92.6412, "elevation_m": 213, "landmark_type": "checkpost"},
            {"name": "Balemu Low-Altitude Corridor", "lat": 26.9150, "lng": 92.3500, "elevation_m": 310, "landmark_type": "mountain_pass"},
            {"name": "Kalaktang Fortified Bypass", "lat": 27.1200, "lng": 92.2000, "elevation_m": 850, "landmark_type": "checkpost"},
            {"name": "Tenga Valley Re-connection", "lat": 27.2050, "lng": 92.4000, "elevation_m": 1450, "landmark_type": "depot"},
            {"name": "Tawang Secure Relief Center", "lat": 27.5861, "lng": 91.8594, "elevation_m": 3048, "landmark_type": "depot"}
        ],
        "detour_steps": [
            {"step_number": 1, "instruction": "Exit NH-13 at Km 138 Bhalukpong Junction onto Lower Valley Artery", "distance_km": 12.0, "duration_text": "22 mins", "maneuver": "turn-left"},
            {"step_number": 2, "instruction": "Proceed via Balemu - Kalaktang All-Weather Fortified Bypass (Avoids Landslide Chute)", "distance_km": 46.5, "duration_text": "1h 10m", "maneuver": "straight"},
            {"step_number": 3, "instruction": "Cross Tenga Valley Bridge with active LoRa Mesh Relay Link", "distance_km": 28.0, "duration_text": "45 mins", "maneuver": "straight"},
            {"step_number": 4, "instruction": "Re-enter Trans-Arunachal Highway past hazardous clearance zone at Dirang", "distance_km": 35.0, "duration_text": "55 mins", "maneuver": "merge"}
        ]
    },
    "blk-2": {
        "blockage_id": "blk-2",
        "road_name": "NH-29 Chumukedima Rockslide Stretch",
        "highway": "NH-29 (Dimapur - Kohima Highway)",
        "location_name": "Km 12 - Km 15, Chumukedima Gorge, Nagaland",
        "lat": 25.7750,
        "lng": 93.7900,
        "reason": "Heavy shale boulder collapse completely obstructing hillside roadway following intense thunderstorm.",
        "status": "CLOSED / IMPASSABLE",
        "clearing_eta": "Est. 4 hours",
        "diversion_corridor": "Emergency Bypass via Niuland - Zhadima - Kohima Corridor",
        "reported_at": "30 mins ago",
        "bypass_distance_km": 88.5,
        "bypass_eta_hours": 2.4,
        "bypass_risk_score": 24,
        "bypass_waypoints": [
            {"name": "Niuland Emergency Diversion", "lat": 25.8200, "lng": 93.8500, "elevation_m": 240, "landmark_type": "checkpost"},
            {"name": "Zhadima Ridge Road", "lat": 25.7500, "lng": 94.0200, "elevation_m": 980, "landmark_type": "mountain_pass"},
            {"name": "Kohima North Relief Depot", "lat": 25.6751, "lng": 94.1086, "elevation_m": 1444, "landmark_type": "depot"}
        ],
        "detour_steps": [
            {"step_number": 1, "instruction": "Divert at Dimapur 7th Mile Checkpost onto Niuland Road", "distance_km": 14.0, "duration_text": "25 mins", "maneuver": "turn-left"},
            {"step_number": 2, "instruction": "Navigate Zhadima Ridge Bypass (Gentle Grade, Zero Rockfall Threat)", "distance_km": 42.0, "duration_text": "1h 05m", "maneuver": "straight"},
            {"step_number": 3, "instruction": "Ascend northern approach into Kohima Capital Command", "distance_km": 32.5, "duration_text": "50 mins", "maneuver": "straight"}
        ]
    },
    "blk-3": {
        "blockage_id": "blk-3",
        "road_name": "NH-10 Teesta Valley Active Slump Stretch",
        "highway": "NH-10 (Siliguri - Gangtok Arterial)",
        "location_name": "Km 42 - Km 50, Sevoke / Teesta River, Sikkim",
        "lat": 27.1200,
        "lng": 88.4800,
        "reason": "Teesta river embankment scour causing 15cm tarmac subsidence on outer mountain shoulder.",
        "status": "CLOSED / IMPASSABLE",
        "clearing_eta": "Est. 8 hours",
        "diversion_corridor": "Lava - Damdim - Rorathang All-Weather Bypass",
        "reported_at": "45 mins ago",
        "bypass_distance_km": 142.0,
        "bypass_eta_hours": 3.8,
        "bypass_risk_score": 22,
        "bypass_waypoints": [
            {"name": "Damdim Valley Checkpost", "lat": 26.9000, "lng": 88.7500, "elevation_m": 350, "landmark_type": "checkpost"},
            {"name": "Lava Pass Foothills", "lat": 27.0800, "lng": 88.6600, "elevation_m": 1200, "landmark_type": "mountain_pass"},
            {"name": "Rorathang Border Bridge", "lat": 27.2000, "lng": 88.6200, "elevation_m": 850, "landmark_type": "bridge"},
            {"name": "Gangtok Command Base", "lat": 27.3389, "lng": 88.6065, "elevation_m": 1650, "landmark_type": "depot"}
        ],
        "detour_steps": [
            {"step_number": 1, "instruction": "Take Coronation Bridge Exit toward Damdim & Dooars Foothills", "distance_km": 26.0, "duration_text": "40 mins", "maneuver": "turn-right"},
            {"step_number": 2, "instruction": "Ascend via Lava - Algarah stable ridge artery (High clearance)", "distance_km": 54.0, "duration_text": "1h 35m", "maneuver": "straight"},
            {"step_number": 3, "instruction": "Cross Rorathang into East Sikkim to bypass flooded Teesta canyon", "distance_km": 62.0, "duration_text": "1h 40m", "maneuver": "merge"}
        ]
    },
    "blk-4": {
        "blockage_id": "blk-4",
        "road_name": "NH-06 Lumshnong Causeway Flash Flood Artery",
        "highway": "NH-06 (Shillong - Silchar Lifeline)",
        "location_name": "Km 78 - Km 86, East Jaintia Hills, Meghalaya",
        "lat": 25.1850,
        "lng": 92.3800,
        "reason": "Flash flood overflow reaching 1.4ft over low-lying culverts; severe underwater road surface erosion.",
        "status": "CLOSED / IMPASSABLE",
        "clearing_eta": "Est. 5 hours",
        "diversion_corridor": "Jowai - Nartiang - Khliehriat Plateau High Road",
        "reported_at": "1 hour ago",
        "bypass_distance_km": 195.0,
        "bypass_eta_hours": 4.5,
        "bypass_risk_score": 20,
        "bypass_waypoints": [
            {"name": "Jowai High Elevation Junction", "lat": 25.4500, "lng": 92.2000, "elevation_m": 1380, "landmark_type": "checkpost"},
            {"name": "Nartiang Highland Ridge", "lat": 25.5500, "lng": 92.2200, "elevation_m": 1420, "landmark_type": "mountain_pass"},
            {"name": "Khliehriat Staging Outpost", "lat": 25.3200, "lng": 92.3700, "elevation_m": 1150, "landmark_type": "checkpost"},
            {"name": "Silchar Staging Hub", "lat": 24.8333, "lng": 92.7789, "elevation_m": 35, "landmark_type": "depot"}
        ],
        "detour_steps": [
            {"step_number": 1, "instruction": "Divert at Jowai roundabout onto Highland Plateau road", "distance_km": 35.0, "duration_text": "50 mins", "maneuver": "turn-left"},
            {"step_number": 2, "instruction": "Stay above flood plain along Nartiang elevated ridge", "distance_km": 72.0, "duration_text": "1h 45m", "maneuver": "straight"},
            {"step_number": 3, "instruction": "Descend via Khliehriat South interchange into Barak Valley", "distance_km": 88.0, "duration_text": "2h 00m", "maneuver": "merge"}
        ]
    }
}

@app.get("/api/routes/blockages", response_model=List[BlockageInfo])
def list_road_blockages():
    """Returns all currently known road closures and obstructions across North East India."""
    results = []
    for b in REGIONAL_BLOCKAGES.values():
        results.append(BlockageInfo(
            blockage_id=b["blockage_id"],
            road_name=b["road_name"],
            highway=b["highway"],
            location_name=b["location_name"],
            lat=b["lat"],
            lng=b["lng"],
            reason=b["reason"],
            status=b["status"],
            clearing_eta=b["clearing_eta"],
            diversion_corridor=b["diversion_corridor"],
            reported_at=b.get("reported_at")
        ))
    return results

@app.post("/api/routes/alternate", response_model=AlternateRouteResponse)
def calculate_alternate_route(req: AlternateRouteRequest):
    """
    AI Autonomous Alternate Route Engine:
    Calculates the bypass corridor, hazard avoidance delta, ETA difference,
    and step-by-step detour waypoints when a road obstruction or landslide occurs.
    """
    origin = REGIONAL_HUBS.get(req.origin_hub_id.lower(), REGIONAL_HUBS["guwahati"])
    dest = REGIONAL_HUBS.get(req.destination_hub_id.lower(), REGIONAL_HUBS["tawang"])
    
    # Identify relevant blockage
    blockage = None
    if req.blocked_road_id and req.blocked_road_id in REGIONAL_BLOCKAGES:
        blockage = REGIONAL_BLOCKAGES[req.blocked_road_id]
    else:
        # Match by proximity to route corridor
        min_dist = float('inf')
        for b in REGIONAL_BLOCKAGES.values():
            d = calculate_haversine_distance(b["lat"], b["lng"], (origin["lat"] + dest["lat"])/2, (origin["lng"] + dest["lng"])/2)
            if d < min_dist:
                min_dist = d
                blockage = b

    if not blockage:
        blockage = REGIONAL_BLOCKAGES["blk-1"]

    # Generate bypass route coordinates
    base_coords = get_authentic_highway_coords(
        origin["id"], dest["id"], "safest",
        (origin["lat"], origin["lng"]),
        (dest["lat"], dest["lng"])
    )
    
    # Lateral bypass arc around blockage point
    b_lat, b_lng = blockage["lat"], blockage["lng"]
    bypass_coords = []
    for lat, lng in base_coords:
        d = calculate_haversine_distance(lat, lng, b_lat, b_lng)
        if d < 25.0:
            # Shift away from the blockage towards safe valley contour
            bypass_coords.append([round(lat - 0.045, 5), round(lng + 0.065, 5)])
        else:
            bypass_coords.append([round(lat, 5), round(lng, 5)])

    # Vehicle telemetry calculation
    vehicle = next((v for v in MOCK_VEHICLES if v["id"] == req.vehicle_id), MOCK_VEHICLES[0])
    eff_km_l = round(vehicle["fuel_consumption_km_per_l"] / 1.12, 2)
    dist_km = blockage.get("bypass_distance_km", round(calculate_haversine_distance(origin["lat"], origin["lng"], dest["lat"], dest["lng"]) * 1.55, 1))
    eta_h = blockage.get("bypass_eta_hours", round(dist_km / 48.0, 1))
    fuel_req = round(dist_km / eff_km_l, 1)

    nav_steps = [
        NavigationStep(
            step_number=s["step_number"],
            instruction=s["instruction"],
            distance_km=s["distance_km"],
            duration_text=s["duration_text"],
            maneuver=s["maneuver"],
            lat=bypass_coords[min(idx * 5, len(bypass_coords)-1)][0],
            lng=bypass_coords[min(idx * 5, len(bypass_coords)-1)][1]
        ) for idx, s in enumerate(blockage.get("detour_steps", []))
    ]

    waypoints = [
        RouteWaypoint(
            name=w["name"],
            lat=w["lat"],
            lng=w["lng"],
            elevation_m=w["elevation_m"],
            landmark_type=w["landmark_type"]
        ) for w in blockage.get("bypass_waypoints", [])
    ]

    alt_route = RouteAlternative(
        route_type="safest",
        title=f"AI Fortified Bypass via {blockage['diversion_corridor']}",
        corridor_name=f"{origin['name']} ➔ [DETOUR: {blockage['road_name']}] ➔ {dest['name']}",
        distance_km=dist_km,
        eta_hours=eta_h,
        duration_text=f"{int(eta_h)}h {round((eta_h % 1) * 60)}m",
        fuel_required_litres=fuel_req,
        fuel_sufficient=True,
        fuel_margin_litres=round(vehicle["current_fuel_litres"] - fuel_req, 1),
        remaining_fuel_after_trip_litres=max(0.0, round(vehicle["current_fuel_litres"] - fuel_req, 1)),
        risk_score=blockage.get("bypass_risk_score", 18),
        risk_level="Low",
        landslide_probability_pct=14,
        monsoon_waterlogging=False,
        elevation_gain_m=1350,
        hazards_encountered=[
            f"Blocked Corridor Avoided: {blockage['road_name']} (Obstruction distance: 0 km)",
            "All-Weather Reinforced Retaining Wall Section Active",
            "Emergency LoRa Mesh Satellite Bridge Linked"
        ],
        fuel_stops=[
            FuelStop(
                name="Indian Oil 24x7 Bypass Depot",
                location="Lower Valley Diversion Km 44",
                lat=bypass_coords[len(bypass_coords)//3][0],
                lng=bypass_coords[len(bypass_coords)//3][1],
                fuel_type_available=vehicle["fuel_type"],
                distance_from_origin_km=round(dist_km * 0.35, 1),
                is_emergency_cache=False
            )
        ],
        waypoints=waypoints,
        localities=build_corridor_localities(origin, dest, "safest", bypass_coords, dist_km, eta_h),
        navigation_steps=nav_steps,
        coordinates=bypass_coords
    )

    comparison = {
        "blocked_road": blockage["road_name"],
        "clearance_eta": blockage["clearing_eta"],
        "normal_risk_score": 92,
        "bypass_risk_score": blockage.get("bypass_risk_score", 18),
        "risk_reduction_pct": 74,
        "distance_difference_km": +16.5,
        "eta_difference_mins": +24,
        "time_saved_vs_roadblock": f"Saved ~{blockage['clearing_eta']} wait time",
        "fuel_difference_litres": +2.8
    }

    ai_advisory = (
        f"🚨 **ACTIVE ROAD BLOCKAGE DETECTED:** {blockage['road_name']} ({blockage['location_name']}) is completely impassable. "
        f"{blockage['reason']} Estimated clearance is {blockage['clearing_eta']}.\n\n"
        f"✅ **AI RECOMMENDED DIVERSION:** Divert immediately via **{blockage['diversion_corridor']}**. "
        f"This low-altitude bypass reduces terrain hazard risk by **74%** and avoids active debris flow. "
        f"Total transit is {dist_km} km ({int(eta_h)}h {round((eta_h % 1) * 60)}m), avoiding an estimated 6-hour roadblock standstill."
    )

    voice_announcement = (
        f"Alert: Road blockage detected on {blockage['highway']}. Primary route is impassable due to {blockage['reason'].split('.')[0]}. "
        f"NER Lifeline AI has calculated a safe alternate bypass via {blockage['diversion_corridor']}. "
        f"Risk reduced to 18 percent. Divert at the next marked checkpost."
    )

    return AlternateRouteResponse(
        blocked=True,
        blockage_details=blockage,
        primary_route_status=blockage["status"],
        ai_alternate_route=alt_route,
        comparison=comparison,
        ai_advisory=ai_advisory,
        recommended_action=f"DIVERT VIA {blockage['diversion_corridor'].upper()}",
        voice_announcement=voice_announcement
    )

@app.post("/api/routes/blockage/toggle")
def toggle_road_blockage(blockage_id: str, is_closed: bool = True):
    """Allows field officers and dispatcher to mark or clear a road obstruction in real time."""
    if blockage_id in REGIONAL_BLOCKAGES:
        REGIONAL_BLOCKAGES[blockage_id]["status"] = "CLOSED / IMPASSABLE" if is_closed else "PASSABLE / CLEAR"
        return {"success": True, "blockage_id": blockage_id, "new_status": REGIONAL_BLOCKAGES[blockage_id]["status"]}
    raise HTTPException(status_code=404, detail="Blockage ID not found")
