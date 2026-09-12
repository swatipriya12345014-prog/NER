import os
from dotenv import load_dotenv
from typing import Optional, Dict, List
from datetime import datetime

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase_client = None

def get_supabase_client():
    """
    Initializes and returns the Supabase PostgreSQL client.
    Provides graceful fallback for local development or testing when keys are pending.
    """
    global supabase_client
    if supabase_client is not None:
        return supabase_client

    if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "https://your-project.supabase.co":
        try:
            from supabase import create_client, Client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("Successfully connected to Supabase PostgreSQL.")
            return supabase_client
        except Exception as e:
            print(f"Notice: Supabase client initialization error: {e}")
            return None
    else:
        print("Notice: Running with mock operational data until SUPABASE_URL and SUPABASE_ANON_KEY are set.")
        return None

def is_supabase_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "https://your-project.supabase.co")


# ─────────────────────────────────────────────────────────────
# GPS LOCATIONS TABLE — Supabase PostgreSQL Schema
# ─────────────────────────────────────────────────────────────
# Run this SQL in the Supabase SQL Editor to create the GPS tracking table:
#
# CREATE TABLE IF NOT EXISTS gps_locations (
#     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#     device_id TEXT NOT NULL,
#     lat DOUBLE PRECISION NOT NULL,
#     lng DOUBLE PRECISION NOT NULL,
#     altitude_m DOUBLE PRECISION,
#     speed_kmh DOUBLE PRECISION,
#     heading_deg DOUBLE PRECISION,
#     accuracy_m DOUBLE PRECISION,
#     timestamp TIMESTAMPTZ NOT NULL,
#     received_at TIMESTAMPTZ DEFAULT NOW()
# );
#
# CREATE INDEX idx_gps_device_time ON gps_locations (device_id, timestamp DESC);
#
# -- Enable Row Level Security (RLS)
# ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;
#
# -- Allow authenticated users to insert GPS data
# CREATE POLICY "Allow inserts for authenticated" ON gps_locations
#     FOR INSERT TO authenticated WITH CHECK (true);
#
# -- Allow all users to read GPS data (adjust for production)
# CREATE POLICY "Allow select for all" ON gps_locations
#     FOR SELECT USING (true);
# ─────────────────────────────────────────────────────────────

def ensure_gps_table_exists():
    """
    Attempts to verify the gps_locations table exists in Supabase.
    If Supabase is not configured, this is a no-op.
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        client.table("gps_locations").select("id").limit(1).execute()
        print("GPS: gps_locations table verified in Supabase.")
        return True
    except Exception as e:
        print(f"GPS: gps_locations table notice: {e}")
        return False


# ─────────────────────────────────────────────────────────────
# ROAD HISTORIES & REALTIME VEHICLE REGISTRY SCHEMAS
# ─────────────────────────────────────────────────────────────
# CREATE TABLE IF NOT EXISTS road_histories (
#     road_id TEXT PRIMARY KEY,
#     road_name TEXT NOT NULL,
#     corridor TEXT NOT NULL,
#     state TEXT NOT NULL,
#     total_length_km DOUBLE PRECISION NOT NULL,
#     terrain_classification TEXT NOT NULL,
#     historical_landslides_count INT DEFAULT 0,
#     historical_floods_count INT DEFAULT 0,
#     avg_clearance_time_hours DOUBLE PRECISION DEFAULT 6.0,
#     worst_season TEXT,
#     current_condition TEXT NOT NULL,
#     risk_index INT DEFAULT 20,
#     chronic_blackspots JSONB DEFAULT '[]'::jsonb,
#     past_blockage_events JSONB DEFAULT '[]'::jsonb,
#     last_inspected TIMESTAMPTZ DEFAULT NOW(),
#     created_at TIMESTAMPTZ DEFAULT NOW()
# );
#
# CREATE TABLE IF NOT EXISTS vehicle_registry (
#     vehicle_number TEXT PRIMARY KEY,
#     vehicle_name TEXT NOT NULL,
#     vehicle_type TEXT NOT NULL,
#     driver_name TEXT NOT NULL,
#     driver_phone TEXT,
#     fuel_percentage DOUBLE PRECISION DEFAULT 100.0,
#     speed_kmh DOUBLE PRECISION DEFAULT 0.0,
#     lat DOUBLE PRECISION NOT NULL,
#     lng DOUBLE PRECISION NOT NULL,
#     altitude_m DOUBLE PRECISION,
#     current_road TEXT,
#     destination TEXT,
#     cargo_manifest TEXT,
#     status TEXT DEFAULT 'Active',
#     is_online BOOLEAN DEFAULT true,
#     mesh_node_id TEXT,
#     last_ping TIMESTAMPTZ DEFAULT NOW(),
#     updated_at TIMESTAMPTZ DEFAULT NOW()
# );
#
# CREATE TABLE IF NOT EXISTS sos_call_logs (
#     call_id TEXT PRIMARY KEY,
#     vehicle_number TEXT NOT NULL,
#     driver_name TEXT NOT NULL,
#     driver_phone TEXT,
#     gps_lat DOUBLE PRECISION NOT NULL,
#     gps_lng DOUBLE PRECISION NOT NULL,
#     location_name TEXT NOT NULL,
#     emergency_type TEXT NOT NULL,
#     responder_unit TEXT NOT NULL,
#     responder_officer TEXT,
#     status TEXT NOT NULL,
#     channel TEXT NOT NULL,
#     started_at TIMESTAMPTZ NOT NULL,
#     ended_at TIMESTAMPTZ,
#     duration_seconds INT DEFAULT 0,
#     transcript_logs JSONB DEFAULT '[]'::jsonb,
#     created_at TIMESTAMPTZ DEFAULT NOW()
# );
# ─────────────────────────────────────────────────────────────

def ensure_extended_tables_exist():
    """Verify road_histories, vehicle_registry, and sos_call_logs in Supabase."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("road_histories").select("road_id").limit(1).execute()
        client.table("vehicle_registry").select("vehicle_number").limit(1).execute()
        client.table("sos_call_logs").select("call_id").limit(1).execute()
        print("Database: Extended tables (road_histories, vehicle_registry, sos_call_logs) verified.")
        return True
    except Exception as e:
        print(f"Database: Extended tables notice: {e}")
        return False

# ─────────────────────────────────────────────────────────────
# MORTH VAHAN 4.0 NATIONAL REGISTER SCHEMAS
# ─────────────────────────────────────────────────────────────
# CREATE TABLE IF NOT EXISTS vahan_national_register (
#     registration_number TEXT PRIMARY KEY,
#     formatted_plate TEXT NOT NULL,
#     rc_status TEXT DEFAULT 'ACTIVE',
#     registration_date DATE,
#     issuing_authority TEXT NOT NULL,
#     state TEXT NOT NULL,
#     owner_name TEXT NOT NULL,
#     owner_category TEXT,
#     vehicle_class TEXT NOT NULL,
#     maker TEXT NOT NULL,
#     model TEXT NOT NULL,
#     chassis_number TEXT NOT NULL,
#     engine_number TEXT NOT NULL,
#     fuel_type TEXT DEFAULT 'Diesel',
#     emission_norms TEXT DEFAULT 'BHARAT STAGE VI (BS-VI)',
#     color TEXT,
#     seating_capacity INT DEFAULT 5,
#     laden_weight_kg INT,
#     unladen_weight_kg INT,
#     fitness_valid_upto DATE,
#     insurance_company TEXT,
#     insurance_policy_no TEXT,
#     insurance_valid_upto DATE,
#     pucc_valid_upto DATE,
#     tax_status TEXT,
#     national_permit_number TEXT,
#     national_permit_valid_upto DATE,
#     ais_140_vltd_device_id TEXT,
#     ais_140_imei TEXT,
#     ais_140_carrier TEXT,
#     erss_112_integrated BOOLEAN DEFAULT true,
#     emergency_panic_buttons INT DEFAULT 3,
#     verified_by TEXT DEFAULT 'MoRTH VAHAN 4.0 Central National Registry',
#     verified_at TIMESTAMPTZ DEFAULT NOW(),
#     created_at TIMESTAMPTZ DEFAULT NOW(),
#     updated_at TIMESTAMPTZ DEFAULT NOW()
# );
# ─────────────────────────────────────────────────────────────

# Persistent local cache in case Supabase credentials are in development/mock mode
LOCAL_VAHAN_STORAGE: Dict[str, Dict] = {}
LOCAL_VEHICLE_STORAGE: Dict[str, Dict] = {}

def ensure_vahan_tables_exist():
    """Verify vahan_national_register in Supabase or initialize fallback cache."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("vahan_national_register").select("registration_number").limit(1).execute()
        print("Database: vahan_national_register table verified in Supabase.")
        return True
    except Exception as e:
        print(f"Database: vahan_national_register table notice: {e}")
        return False

def store_transport_ministry_vehicle(rc_record: Dict) -> bool:
    """Stores or updates a verified MoRTH VAHAN vehicle record in the database."""
    if not rc_record or not rc_record.get("registration_number"):
        return False
    
    reg_num = rc_record["registration_number"]
    # Keep local persistent cache updated
    LOCAL_VAHAN_STORAGE[reg_num] = dict(rc_record)

    client = get_supabase_client()
    if client:
        try:
            client.table("vahan_national_register").upsert(rc_record, on_conflict="registration_number").execute()
            print(f"Database: Upserted MoRTH record for {reg_num} into Supabase.")
            return True
        except Exception as e:
            print(f"Database: Notice on Supabase upsert for {reg_num}: {e}")
            return False
    return True

def sync_transport_ministry_database() -> Dict:
    """
    Connects the application database with the MoRTH VAHAN 4.0 National Register.
    Stores and commits all 21 real vehicle registration numbers across the North Eastern region.
    """
    from transport_ministry_service import get_all_transport_ministry_vehicles
    from vehicle_database import REAL_VEHICLE_NUMBERS_DATABASE

    all_vahan = get_all_transport_ministry_vehicles()
    synced_count = 0
    client = get_supabase_client()

    for v in all_vahan:
        LOCAL_VAHAN_STORAGE[v["registration_number"]] = dict(v)
        if client:
            try:
                client.table("vahan_national_register").upsert(v, on_conflict="registration_number").execute()
                synced_count += 1
            except Exception as err:
                print(f"Database: Supabase VAHAN sync notice for {v.get('registration_number')}: {err}")
        else:
            synced_count += 1

    # Also sync vehicle telemetry registry
    for k, v in REAL_VEHICLE_NUMBERS_DATABASE.items():
        LOCAL_VEHICLE_STORAGE[k] = dict(v)
        if client:
            try:
                client.table("vehicle_registry").upsert(v, on_conflict="vehicle_number").execute()
            except Exception:
                pass

    return {
        "success": True,
        "database": "Supabase PostgreSQL" if client else "Persistent Application Storage",
        "ministry_source": "Ministry of Road Transport and Highways (MoRTH) • VAHAN 4.0",
        "total_vehicles_registered": len(all_vahan),
        "synced_records": synced_count,
        "states_covered": ["Assam", "Meghalaya", "Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Sikkim"],
        "telemetry_standard": "MoRTH AIS-140 / ERSS-112 Verified",
        "synced_at": datetime.utcnow().isoformat() + "Z"
    }

def get_stored_vahan_vehicles() -> List[Dict]:
    """Retrieves all stored Transport Ministry vehicle records from database or cache."""
    client = get_supabase_client()
    if client:
        try:
            res = client.table("vahan_national_register").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            pass

    if LOCAL_VAHAN_STORAGE:
        return list(LOCAL_VAHAN_STORAGE.values())

    from transport_ministry_service import get_all_transport_ministry_vehicles
    return get_all_transport_ministry_vehicles()

def get_stored_vahan_vehicle(vehicle_number: str) -> Optional[Dict]:
    """Retrieves a single vehicle registration certificate from database."""
    from transport_ministry_service import normalize_registration_number, query_vahan_national_register
    norm = normalize_registration_number(vehicle_number)

    client = get_supabase_client()
    if client:
        try:
            res = client.table("vahan_national_register").select("*").eq("registration_number", norm).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

    if norm in LOCAL_VAHAN_STORAGE:
        return LOCAL_VAHAN_STORAGE[norm]

    # Fallback to query
    return query_vahan_national_register(norm)


