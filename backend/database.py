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
