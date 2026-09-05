from google import genai
from google.genai import errors
from backend.database import get_recent_history

client = genai.Client()
chat_session = None

def init_chat_session():
    global chat_session
    try:
        # Using gemini-3-flash which has a refreshed free tier pool
        chat_session = client.chats.create(model="gemini-3.5-flash")
        
        history = get_recent_history()
        if history:
            prompt = f"I am an athlete using ElevateAI. My recent jumps: {history}. Summarize my power trend in 2 sentences, then ask how I am feeling today."
        else:
            prompt = "I am an athlete building a jump tracker called ElevateAI. Greet me in 1 sentence."
            
        response = chat_session.send_message(prompt)
        return response.text
    except Exception as e:
        print(f"\n--- AI CHAT INITIALIZATION ERROR ---\n{e}\n-----------------------------------\n")
        return "Hey athlete! Welcome to ElevateAI. (API Quota limit reached for today—metrics and tracking remain fully operational!)"

def send_message(msg: str):
    global chat_session
    try:
        if chat_session is None: 
            init_chat_session()
            
        live_history = get_recent_history()
        dynamic_prompt = (
            f"[System Background Data: The athlete's latest jump records are currently: {live_history}]\n\n"
            f"Athlete says: {msg}"
        )
        
        response = chat_session.send_message(dynamic_prompt)
        return response.text
    except Exception as e:
        print(f"\n--- AI MESSAGE ERROR ---\n{e}\n------------------------\n")
        return "Your daily AI quota limit has been reached. Feel free to keep measuring jumps—your force curves and tracking data are fully saved!"