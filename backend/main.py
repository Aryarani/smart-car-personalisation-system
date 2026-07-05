from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import engine, SessionLocal, Base
from app.routes import auth, profile, driving
from app.routes.music import router as music_router
from app.ml_engine import train_models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Car Personalization System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(driving.router)
app.include_router(music_router)


def scheduled_training():
    """Runs every 12 hours to retrain models on all user data."""
    db = SessionLocal()
    try:
        result = train_models(db)
        print(f"[Scheduler] Model training complete: {result}")
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_training, "interval", hours=12)
scheduler.start()


@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()


@app.get("/")
def root():
    return {"message": "Smart Car Personalization API", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
