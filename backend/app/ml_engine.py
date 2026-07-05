"""
ML Engine for Smart Car Personalization.
Trains per-user models every 12 hours.

- AC model: outside_temp + time_of_day + day_of_week → preferred AC temp
  (learns that user likes 18°C when it's 40°C outside, 24°C when it's 10°C, etc.)
- Music model: time_of_day + day_of_week → genre
  (learns that user plays jazz in the morning, rock in the evening, etc.)
- Seat model: (no context features) → seat positions
  (learns the user's consistent seat preference)
"""
import pickle
import os
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sqlalchemy.orm import Session
from app.models import DrivingInteraction, ModelMetadata, User

MODEL_DIR = "ml_models"
os.makedirs(MODEL_DIR, exist_ok=True)

MAX_INTERACTIONS_PER_USER = 200

MUSIC_GENRES = [
    "pop", "rock", "jazz", "classical", "hip-hop",
    "electronic", "country", "r&b", "metal", "indie"
]


def _genre_to_index(genre: str) -> int:
    g = genre.lower()
    return MUSIC_GENRES.index(g) if g in MUSIC_GENRES else 0


def _index_to_genre(idx: int) -> str:
    return MUSIC_GENRES[idx] if 0 <= idx < len(MUSIC_GENRES) else "pop"


def _user_model_path(user_id: int, model_name: str) -> str:
    user_dir = os.path.join(MODEL_DIR, f"user_{user_id}")
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, f"{model_name}.pkl")


def _train_user_models(user_id: int, interactions: list) -> dict:
    """Train models for a single user on their interaction history."""
    if len(interactions) < 3:
        return {"status": "insufficient_data", "count": len(interactions)}

    # --- AC Temperature Model ---
    # Features: outside_temp, time_of_day (0-23), day_of_week (0-6)
    # Target: the AC temp the user chose given that context
    ac_features = []
    ac_targets = []
    for i in interactions:
        ac_features.append([i.outside_temp, i.time_of_day, i.day_of_week])
        ac_targets.append(i.set_ac_temp)

    ac_model = RandomForestRegressor(
        n_estimators=30, max_depth=5, random_state=42
    )
    ac_model.fit(np.array(ac_features), np.array(ac_targets))
    pickle.dump(ac_model, open(_user_model_path(user_id, "ac"), "wb"))

    # --- Music Genre Model ---
    # Features: time_of_day, day_of_week
    # Target: genre index (learns morning vs evening vs weekend preferences)
    music_features = []
    music_targets = []
    for i in interactions:
        music_features.append([i.time_of_day, i.day_of_week])
        music_targets.append(_genre_to_index(i.music_genre_chosen))

    genre_model = RandomForestClassifier(
        n_estimators=30, max_depth=5, random_state=42
    )
    genre_model.fit(np.array(music_features), np.array(music_targets))
    pickle.dump(genre_model, open(_user_model_path(user_id, "genre"), "wb"))

    # --- Seat Position Model ---
    # No context features — just learns the user's average/preferred position
    seat_targets = []
    for i in interactions:
        seat_targets.append([i.seat_height, i.seat_recline, i.seat_distance])

    seat_model = RandomForestRegressor(
        n_estimators=30, max_depth=3, random_state=42
    )
    # Use a dummy feature (constant) since seat is mostly static per user
    dummy_X = np.ones((len(seat_targets), 1))
    seat_model.fit(dummy_X, np.array(seat_targets))
    pickle.dump(seat_model, open(_user_model_path(user_id, "seat"), "wb"))

    return {"status": "trained", "count": len(interactions)}


def train_models(db: Session) -> dict:
    """Train per-user models for all users who have interactions."""
    all_interactions = db.query(DrivingInteraction).all()
    total = len(all_interactions)

    if total < 3:
        return {"status": "insufficient_data", "count": total}

    # Group interactions by user
    by_user = {}
    for i in all_interactions:
        by_user.setdefault(i.user_id, []).append(i)

    trained_users = 0
    for user_id, user_interactions in by_user.items():
        result = _train_user_models(user_id, user_interactions)
        if result["status"] == "trained":
            trained_users += 1

    # Rolling window cleanup: keep only the latest 200 interactions per user
    deleted = 0
    for user_id, user_interactions in by_user.items():
        if len(user_interactions) > MAX_INTERACTIONS_PER_USER:
            sorted_interactions = sorted(
                user_interactions, key=lambda x: x.timestamp, reverse=True
            )
            old_ids = [i.id for i in sorted_interactions[MAX_INTERACTIONS_PER_USER:]]
            db.query(DrivingInteraction).filter(
                DrivingInteraction.id.in_(old_ids)
            ).delete(synchronize_session=False)
            deleted += len(old_ids)

    # Update metadata
    now = datetime.now(timezone.utc)
    for model_type in ["ac_temp", "music_genre", "seat_position"]:
        meta = db.query(ModelMetadata).filter(
            ModelMetadata.model_type == model_type
        ).first()
        if meta:
            meta.last_trained = now
            meta.sample_count = total
        else:
            db.add(ModelMetadata(
                model_type=model_type, last_trained=now, sample_count=total
            ))
    db.commit()

    return {
        "status": "trained",
        "sample_count": total,
        "users_trained": trained_users,
        "old_records_cleaned": deleted,
        "trained_at": now.isoformat(),
    }


def predict_preferences(user_id: int, outside_temp: float, db: Session) -> dict:
    """Predict personalized settings for a specific driver."""
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.id == user_id).first()

    defaults = {
        "suggested_ac_temp": 22.0,
        "suggested_music_genre": "pop",
        "suggested_seat": {"height": 50, "recline": 30, "distance": 50},
        "suggested_speed_limit": 40 if (user and user.is_learner) else None,
        "confidence": 0.0,
        "model_last_trained": None,
    }

    ac_path = _user_model_path(user_id, "ac")
    genre_path = _user_model_path(user_id, "genre")
    seat_path = _user_model_path(user_id, "seat")

    if not all(os.path.exists(p) for p in [ac_path, genre_path, seat_path]):
        return defaults

    ac_model = pickle.load(open(ac_path, "rb"))
    genre_model = pickle.load(open(genre_path, "rb"))
    seat_model = pickle.load(open(seat_path, "rb"))

    # AC: predict based on outside temp + current time context
    ac_features = np.array([[outside_temp, now.hour, now.weekday()]])
    ac_temp = float(ac_model.predict(ac_features)[0])
    # Clamp to reasonable range
    ac_temp = max(16.0, min(30.0, ac_temp))

    # Music: predict based on current time context
    music_features = np.array([[now.hour, now.weekday()]])
    genre_idx = int(genre_model.predict(music_features)[0])

    # Seat: predict (static per user)
    seat_pred = seat_model.predict(np.array([[1]]))[0]

    # Confidence based on how much data this user has
    user_count = db.query(DrivingInteraction).filter(
        DrivingInteraction.user_id == user_id
    ).count()

    meta = db.query(ModelMetadata).filter(
        ModelMetadata.model_type == "ac_temp"
    ).first()

    return {
        "suggested_ac_temp": round(ac_temp, 1),
        "suggested_music_genre": _index_to_genre(genre_idx),
        "suggested_seat": {
            "height": int(round(seat_pred[0])),
            "recline": int(round(seat_pred[1])),
            "distance": int(round(seat_pred[2])),
        },
        "suggested_speed_limit": 40 if (user and user.is_learner) else None,
        "confidence": min(0.95, user_count / 50),
        "model_last_trained": meta.last_trained.isoformat() if meta else None,
    }
