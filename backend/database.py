import os
from dotenv import load_dotenv
from typing import Optional

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
