from pydantic import BaseModel, Field
from typing import Optional, List
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
