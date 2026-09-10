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
        # Try a lightweight query to verify the table exists
        client.table("gps_locations").select("id").limit(1).execute()
        print("GPS: gps_locations table verified in Supabase.")
        return True
    except Exception as e:
        print(f"GPS: gps_locations table not found or not accessible: {e}")
        print("GPS: Please create the table using the SQL schema in database.py comments.")
        return False
