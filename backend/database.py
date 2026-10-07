import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials not found in .env file. Please check your configuration.")

# Initialize the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_profile():
    """Fetch the most recently created athlete profile from the cloud."""
    try:
        response = supabase.table("athlete_profile").select("*").order("created_at", desc=True).limit(1).execute()
        if response.data:
            return response.data[0]
        
        # Return None so the frontend knows to trigger the setup popup
        return None 
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return None

def save_profile(data):
    """Save a new athlete profile to the cloud database."""
    try:
        # Strictly filter incoming frontend data to match the exact SQL columns
        clean_data = {
            "name": data.get("name", data.get("full_name", "Athlete")),
            "age": data.get("age"),
            "height_cm": data.get("height_cm", data.get("height")),
            "weight_kg": data.get("weight_kg", data.get("weight"))
        }
        
        # Remove any empty values so Supabase doesn't get confused
        clean_data = {k: v for k, v in clean_data.items() if v is not None}
        
        response = supabase.table("athlete_profile").insert(clean_data).execute()
        return response.data
    except Exception as e:
        print(f"Error saving profile: {e}")
        return None

def save_result(data):
    """Save a new jump test telemetry result to the cloud."""
    try:
        response = supabase.table("jump_history").insert(data).execute()
        return response.data
    except Exception as e:
        print(f"Error saving result: {e}")
        return None

def get_recent_history():
    """Fetch all jump history for the charts and historical tables."""
    try:
        response = supabase.table("jump_history").select("*").order("timestamp", desc=False).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []