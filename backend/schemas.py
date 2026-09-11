from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ShipmentBase(BaseModel):
    tracking_id: str
    item_name: str
    category: str = Field(..., description="E.g., Medical, Disaster Relief, Food Ration, Vaccines")
    origin: str
    destination: str
    state: str = Field(..., description="One of the 8 NER states")
    priority: str = Field(default="Normal", description="Critical, High, Normal")
    cold_chain_required: bool = False
    temperature_celsius: Optional[float] = None
    status: str = Field(default="In Transit", description="Dispatched, In Transit, Delivered, Delayed")
    eta_hours: float
    assigned_vehicle_id: Optional[str] = None

class ShipmentCreate(ShipmentBase):
    pass

class Shipment(ShipmentBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RouteRiskReport(BaseModel):
    route_id: str
    corridor_name: str
    state: str
    risk_level: str = Field(..., description="Low, Medium, High, Extreme")
    landslide_probability_pct: int
    monsoon_waterlogging: bool
    status: str = Field(default="Passable", description="Passable, Caution, Blocked")
    recommended_alternate_route: Optional[str] = None

class IncidentAlert(BaseModel):
    incident_id: str
    title: str
    state: str
    location_name: str
    severity: str = Field(..., description="Critical, Warning, Info")
    description: str
    timestamp: str
    active: bool = True

class MeshTelemetryPacket(BaseModel):
    node_id: str
    state: str
    battery_pct: int
    signal_rssi_dbm: int
    is_online: bool
    lat: Optional[float] = None
    lng: Optional[float] = None
    payload_message: Optional[str] = None
    timestamp: Optional[str] = None

class Vehicle(BaseModel):
    id: str
    name: str
    license_plate: str
    vehicle_type: str = Field(..., description="E.g., 4x4 Highland Ambulance, Heavy Relief Truck (6x6), Rapid Response SUV, Evacuation Bus")
    fuel_type: str = Field(default="Diesel", description="Diesel, Petrol, Electric EV")
    fuel_capacity_litres: float
    current_fuel_litres: float
    fuel_percentage: float
    fuel_consumption_km_per_l: float = Field(..., description="Base fuel economy (km per litre)")
    terrain_multiplier: float = Field(default=1.35, description="Mountain grade resistance multiplier (1.2 to 1.7x in NER)")
    effective_km_per_l: float = Field(..., description="Terrain-adjusted fuel economy in mountain roads")
    remaining_range_km: float
    fuel_status: str = Field(..., description="Optimal, Adequate, Low Reserve, Critical Refuel Required")
    assigned_driver: str
    current_location: str
    lat: float
    lng: float
    status: str = Field(default="Active", description="Active, En Route, Refueling, Maintenance")

class RouteWaypoint(BaseModel):
    name: str
    lat: float
    lng: float
    elevation_m: int
    landmark_type: str = Field(..., description="depot, mountain_pass, checkpost, fuel_depot, bridge")

class FuelStop(BaseModel):
    name: str
    location: str
    lat: float
    lng: float
    fuel_type_available: str
    distance_from_origin_km: float
    is_emergency_cache: bool = False

class RouteLocality(BaseModel):
    name: str
    district: Optional[str] = None
    state: Optional[str] = None
    lat: float
    lng: float
    elevation_m: int
    distance_from_origin_km: float
    eta_mins: int
    road_type: str = Field(default="National Highway", description="4-Lane NH, Mountain Pass, Valley Bypass, Ghat Section")
    amenities: List[str] = Field(default_factory=list, description="Available emergency and transit amenities")

class NavigationStep(BaseModel):
    step_number: int
    instruction: str
    distance_km: float
    duration_text: Optional[str] = None
    maneuver: Optional[str] = "straight"
    lat: Optional[float] = None
    lng: Optional[float] = None

class RouteAlternative(BaseModel):
    route_type: str = Field(..., description="'shortest' or 'safest'")
    title: str
    corridor_name: str
    distance_km: float
    eta_hours: float
    duration_text: Optional[str] = None
    fuel_required_litres: float
    fuel_sufficient: bool
    fuel_margin_litres: float = Field(..., description="Positive if surplus, negative if fuel deficit")
    remaining_fuel_after_trip_litres: float
    risk_score: int = Field(..., description="0 (Safest) to 100 (Most Dangerous)")
    risk_level: str = Field(..., description="Low, Medium, High, Extreme")
    landslide_probability_pct: int
    monsoon_waterlogging: bool
    elevation_gain_m: int
    hazards_encountered: List[str]
    fuel_stops: List[FuelStop]
    waypoints: List[RouteWaypoint]
    localities: List[RouteLocality] = Field(default_factory=list, description="Towns, localities, and areas along the route")
    navigation_steps: List[NavigationStep] = Field(default_factory=list, description="Turn-by-turn road instructions")
    coordinates: List[List[float]] = Field(..., description="List of [lat, lng] for rendering polyline")

class RouteOptimizationRequest(BaseModel):
    origin_hub_id: str
    destination_hub_id: str
    vehicle_id: Optional[str] = None
    simulated_fuel_litres: Optional[float] = None
    simulated_consumption_rate: Optional[float] = None

class AIRecommendation(BaseModel):
    recommended_route_type: str
    headline: str
    rationale: str
    fuel_feasibility_verdict: str
    safety_verdict: str
    refuel_advisory: Optional[str] = None

class RouteOptimizationResponse(BaseModel):
    origin: dict
    destination: dict
    vehicle_telemetry: dict
    shortest_route: RouteAlternative
    safest_route: RouteAlternative
    ai_recommendation: AIRecommendation
    is_real_google_route: Optional[bool] = False
    provider: Optional[str] = "Lifeline Highway Routing Engine"


# ─────────────────────────────────────────────────────────────
# REAL-TIME GPS NAVIGATOR SCHEMAS
# ─────────────────────────────────────────────────────────────

class GPSLocationUpdate(BaseModel):
    """Incoming GPS location packet from a field device or browser."""
    device_id: str = Field(..., description="Vehicle ID or unique device identifier")
    lat: float = Field(..., description="Latitude in decimal degrees")
    lng: float = Field(..., description="Longitude in decimal degrees")
    altitude_m: Optional[float] = Field(None, description="Altitude in meters above sea level")
    speed_kmh: Optional[float] = Field(None, description="Ground speed in km/h")
    heading_deg: Optional[float] = Field(None, description="Compass heading 0-360 degrees")
    accuracy_m: Optional[float] = Field(None, description="GPS accuracy radius in meters")
    timestamp: Optional[str] = Field(None, description="ISO8601 timestamp when reading was taken")

class GPSLocationResponse(BaseModel):
    """Server response after accepting a GPS update."""
    id: str
    device_id: str
    lat: float
    lng: float
    altitude_m: Optional[float] = None
    speed_kmh: Optional[float] = None
    heading_deg: Optional[float] = None
    accuracy_m: Optional[float] = None
    timestamp: str
    received_at: str

class GPSTrackPoint(BaseModel):
    """A single point in a device's GPS track history."""
    lat: float
    lng: float
    altitude_m: Optional[float] = None
    speed_kmh: Optional[float] = None
    heading_deg: Optional[float] = None
    accuracy_m: Optional[float] = None
    timestamp: str

class GPSDeviceLatest(BaseModel):
    """Latest known position for a tracked device."""
    device_id: str
    lat: float
    lng: float
    altitude_m: Optional[float] = None
    speed_kmh: Optional[float] = None
    heading_deg: Optional[float] = None
    accuracy_m: Optional[float] = None
    timestamp: str
    received_at: str
    track_points_count: int = 0


# ─────────────────────────────────────────────────────────────
# GOOGLE ROUTES API & ROUTE RISK SCHEMAS (PHASE 2 & PHASE 4)
# ─────────────────────────────────────────────────────────────

class LatLngPoint(BaseModel):
    latitude: float
    longitude: float

class GoogleRouteRequest(BaseModel):
    origin: LatLngPoint
    destination: LatLngPoint
    vehicle_id: Optional[str] = None
    weather_condition: Optional[str] = None
    road_condition: Optional[str] = None

class RiskBreakdown(BaseModel):
    rainfall_score: int = Field(..., description="0-40 based on precipitation/monsoon")
    road_condition_score: int = Field(..., description="0-25 based on road surface & ghat steepness")
    incident_score: int = Field(..., description="0-20 based on active landslides and road blockage proximity")
    historical_vulnerability_score: int = Field(..., description="0-15 based on historical terrain risk")
    total_risk_score: int = Field(..., description="0-100 aggregated risk index")
    risk_level: str = Field(..., description="LOW (0-30), MEDIUM (31-60), HIGH (61-100)")
    verdict: str
    recommendation: str

class GoogleRouteResponse(BaseModel):
    distance: dict = Field(..., description="Meters, km, and formatted text")
    duration: dict = Field(..., description="Seconds, hours, and formatted text")
    route: dict = Field(..., description="Coordinates array [[lat, lng], ...], polyline string, and summary")
    source: str = Field(default="Google Routes API")
    risk_assessment: Optional[RiskBreakdown] = None


# ─────────────────────────────────────────────────────────────
# ROAD HISTORIES, REALTIME VEHICLE REGISTRY & SOS CALL SCHEMAS
# ─────────────────────────────────────────────────────────────

class ChronicBlackspot(BaseModel):
    km_marker: str
    name: str
    hazard_type: str
    risk_rating: str
    notes: Optional[str] = None

class PastBlockageEvent(BaseModel):
    date: str
    event: str
    duration_hours: float
    cleared_by: str
    severity: str
    notes: Optional[str] = None

class RoadHistory(BaseModel):
    road_id: str
    road_name: str
    corridor: str
    state: str
    total_length_km: float
    terrain_classification: str
    historical_landslides_count: int
    historical_floods_count: int
    avg_clearance_time_hours: float
    worst_season: str
    current_condition: str
    risk_index: int
    chronic_blackspots: List[ChronicBlackspot] = []
    past_blockage_events: List[PastBlockageEvent] = []
    last_inspected: str

class VehicleRegistryItem(BaseModel):
    vehicle_number: str
    vehicle_name: str
    vehicle_type: str
    driver_name: str
    driver_phone: Optional[str] = None
    fuel_percentage: float = 100.0
    speed_kmh: float = 0.0
    lat: float
    lng: float
    altitude_m: Optional[float] = None
    current_road: Optional[str] = None
    destination: Optional[str] = None
    cargo_manifest: Optional[str] = None
    status: str = "Active"  # Active, Distress, En Route, Diverted, Maintenance
    is_online: bool = True
    mesh_node_id: Optional[str] = None
    last_ping: str

class RealtimeVehicleTelemetryUpdate(BaseModel):
    vehicle_number: str
    lat: float
    lng: float
    altitude_m: Optional[float] = None
    speed_kmh: Optional[float] = None
    fuel_percentage: Optional[float] = None
    status: Optional[str] = None
    current_road: Optional[str] = None
    cargo_manifest: Optional[str] = None

class SOSCallInitiateRequest(BaseModel):
    vehicle_number: str
    driver_name: str
    driver_phone: Optional[str] = None
    gps_lat: float
    gps_lng: float
    location_name: str
    emergency_type: str = "GENERAL_SOS"
    channel: Optional[str] = "VHF 146.2 MHz / LoRa Sat-Bridge"

class SOSCallSession(BaseModel):
    call_id: str
    vehicle_number: str
    driver_name: str
    driver_phone: Optional[str] = None
    gps_lat: float
    gps_lng: float
    location_name: str
    emergency_type: str
    responder_unit: str
    responder_officer: str
    responder_phone: Optional[str] = "+91 78110 75355"
    status: str  # CONNECTING, CONNECTED, DISPATCHED, COMPLETED
    channel: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int = 0
    dispatcher_greeting: str
    transcript_logs: List[Dict[str, str]] = []

class SOSCallEndRequest(BaseModel):
    call_id: str
    duration_seconds: int
    resolution_notes: Optional[str] = None

class ChatMessage(BaseModel):
    role: str = "user"  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: Optional[str] = "en"
    context: Optional[Dict[str, str]] = None

class ChatResponse(BaseModel):
    answer: str
    source: str  # "ai_knowledge", "math_engine", "code_engine", "ner_logistics", "conversational", "universal_reasoning"
    suggestions: Optional[List[str]] = []
    timestamp: str

class BlockageInfo(BaseModel):
    blockage_id: str
    road_name: str
    highway: str
    location_name: str
    lat: float
    lng: float
    reason: str
    status: str = "CLOSED"
    clearing_eta: str
    diversion_corridor: str
    reported_at: Optional[str] = None

class AlternateRouteRequest(BaseModel):
    origin_hub_id: str = "guwahati"
    destination_hub_id: str = "tawang"
    blocked_road_id: Optional[str] = None
    blockage_lat: Optional[float] = None
    blockage_lng: Optional[float] = None
    vehicle_id: Optional[str] = None
    weather_condition: Optional[str] = "Monsoon Rain"

class AlternateRouteResponse(BaseModel):
    blocked: bool
    blockage_details: Optional[Dict[str, Any]] = None
    primary_route_status: str  # "BLOCKED / IMPASSABLE", "RESTRICTED", "PASSABLE"
    ai_alternate_route: RouteAlternative
    comparison: Dict[str, Any]
    ai_advisory: str
    recommended_action: str
    voice_announcement: str
