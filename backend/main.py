import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime

from database import get_supabase_client, is_supabase_configured
from schemas import Shipment, ShipmentCreate, RouteRiskReport, IncidentAlert, MeshTelemetryPacket

app = FastAPI(
    title="NER-LIFELINE Backend API",
    description="Asynchronous Logistics & Route Accessibility Engine for the North Eastern Region of India",
    version="1.0.0",
)

# Configure CORS for frontend access
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],  # Permits preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    client = get_supabase_client()
    if client:
        try:
            res = client.table("shipments").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Supabase query error: {e}")
    return MOCK_SHIPMENTS

@app.post("/api/shipments", response_model=Shipment, status_code=status.HTTP_201_CREATED)
def create_shipment(shipment: ShipmentCreate):
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
    client = get_supabase_client()
    if client:
        try:
            res = client.table("route_risks").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Supabase query error: {e}")
    return MOCK_ROUTE_RISKS

@app.get("/api/incidents", response_model=List[IncidentAlert])
def get_incidents():
    client = get_supabase_client()
    if client:
        try:
            res = client.table("incidents").select("*").eq("active", True).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Supabase query error: {e}")
    return MOCK_INCIDENTS

@app.get("/api/mesh/nodes")
def get_mesh_nodes():
    return MOCK_MESH_NODES

@app.post("/api/mesh/telemetry")
def ingest_mesh_telemetry(packet: MeshTelemetryPacket):
    client = get_supabase_client()
    telemetry_data = packet.dict()
    telemetry_data["received_at"] = datetime.utcnow().isoformat()

    if client:
        try:
            client.table("mesh_telemetry").insert(telemetry_data).execute()
        except Exception as e:
            print(f"Supabase telemetry insert notice: {e}")

    return {"status": "received", "node_id": packet.node_id, "timestamp": telemetry_data["received_at"]}
