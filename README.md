# Smart Car Personalization System

AI-powered personalized car settings that learn from driver behavior.

## Features
- User registration/login with password and fingerprint support
- Personalized AC, music, seat, mirror, lighting, speed limit settings
- ML model retrains every 12 hours on all driver interactions
- Manual override (turn off "Auto") for every feature
- Learner driver speed limit enforcement
- Outside temperature simulation for demo

## Run Locally

### Backend (Python)
```bash
cd smart-car-system/backend
python3 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React)
```bash
cd smart-car-system/frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Docs
With backend running: http://localhost:8000/docs