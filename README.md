Markdown
# ElevateAI (Kinematix)
A full-stack biomechanics dashboard that utilizes AI and computer vision to track, analyze, and score Countermovement Jumps (CMJ) in real-time.

## Features
* **Live Kinematic Tracking:** Leverages Google MediaPipe for real-time skeleton pose estimation and dynamic pixel-to-meter calibration.
* **Physics Engine:** Calculates Max Power, Reactive Strength Index (RSI), and Peak Ground Reaction Force using NumPy-derived kinematics.
* **AI Coach:** Integrated Gemini AI backend to analyze performance trends and provide contextual athlete feedback.

## Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/athlete-performance-indicator.git](https://github.com/yourusername/athlete-performance-indicator.git)
Navigate into the directory and install the required Python dependencies:

Bash
pip install fastapi uvicorn google-genai pandas numpy mediapipe
Create a .env file in the root directory and add your Google Gemini API key:

Plaintext
GEMINI_API_KEY=your_api_key_here
Usage
Start the local server using Uvicorn:

Bash
uvicorn backend.main:app --reload
Open your browser and navigate to http://localhost:8000 to launch the dashboard and set up your athlete profile.
