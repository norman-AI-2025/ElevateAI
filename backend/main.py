from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

load_dotenv()  # Loads variables from .env into your environment

from backend.pose_engine import process_kinematics
from backend.database import save_result, get_recent_history, get_profile, save_profile
from backend.chat_engine import init_chat_session, send_message

app = FastAPI()

# Enable CORS for frontend communication (Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # We will restrict this to your Netlify URL once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class JumpData(BaseModel):
    hip_y: List[float]
    l_ankle_y: List[float]
    r_ankle_y: List[float]
    times: List[float]

@app.get("/api/profile")
def read_profile():
    prof = get_profile()
    if prof:
        return {"exists": True, "profile": prof}
    return {"exists": False}

@app.post("/api/profile")
def write_profile(prof: dict):
    # Accepting a raw 'dict' bypasses FastAPI's strict blocking
    save_profile(prof)
    return {"success": True}

@app.post("/api/analyze_data")
def analyze_data(data: JumpData):
    prof = get_profile()
    weight = prof["weight_kg"] if prof else 75.0
    height_m = (prof["height_cm"] / 100.0) if prof else 1.81

    # Pass the dynamic height and weight to the physics engine
    analysis = process_kinematics(
        weight, height_m, data.hip_y, data.l_ankle_y, data.r_ankle_y, data.times
    )
    logged_data = save_result(analysis["metrics"])
    
    return {
        "metrics": logged_data,
        "curve": analysis["curve"]
    }

@app.get("/api/history")
def history():
    return get_recent_history()

@app.get("/api/chat/start")
def start_chat():
    return {"reply": init_chat_session()}

@app.post("/api/chat/message")
def chat(req: ChatRequest):
    return {"reply": send_message(req.message)}

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")