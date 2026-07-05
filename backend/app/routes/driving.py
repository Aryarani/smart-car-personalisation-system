from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DrivingInteraction
from app.schemas import DrivingInteractionCreate, SmartSuggestion
from app.auth import get_current_user
from app.ml_engine import predict_preferences, train_models

router = APIRouter(prefix="/api/driving", tags=["driving"])


@router.post("/interaction")
def log_interaction(
    data: DrivingInteractionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interaction = DrivingInteraction(
        user_id=user.id,
        outside_temp=data.outside_temp,
        set_ac_temp=data.set_ac_temp,
        time_of_day=data.time_of_day,
        day_of_week=data.day_of_week,
        music_genre_chosen=data.music_genre_chosen,
        seat_height=data.seat_height,
        seat_recline=data.seat_recline,
        seat_distance=data.seat_distance,
        speed_driven=data.speed_driven,
    )
    db.add(interaction)
    db.commit()
    return {"status": "logged"}


@router.get("/suggestions", response_model=SmartSuggestion)
def get_suggestions(
    outside_temp: float = 30.0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return predict_preferences(user.id, outside_temp, db)


@router.post("/train")
def trigger_training(db: Session = Depends(get_db)):
    """Manual trigger for model training (also runs every 12 hours)."""
    result = train_models(db)
    return result


@router.get("/interactions")
def get_interactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interactions = db.query(DrivingInteraction).filter(
        DrivingInteraction.user_id == user.id
    ).order_by(DrivingInteraction.timestamp.desc()).limit(50).all()
    return [
        {
            "id": i.id,
            "outside_temp": i.outside_temp,
            "set_ac_temp": i.set_ac_temp,
            "time_of_day": i.time_of_day,
            "music_genre_chosen": i.music_genre_chosen,
            "seat_height": i.seat_height,
            "seat_recline": i.seat_recline,
            "seat_distance": i.seat_distance,
            "timestamp": i.timestamp.isoformat(),
        }
        for i in interactions
    ]
