from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_learner = Column(Boolean, default=False)
    fingerprint_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    profile = relationship("DriverProfile", back_populates="user", uselist=False)
    interactions = relationship("DrivingInteraction", back_populates="user")


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    ac_temp_preference = Column(Float, default=22.0)
    seat_position = Column(JSON, default=lambda: {
        "height": 50, "recline": 30, "distance": 50
    })
    music_genre = Column(String, default="pop")
    mirror_positions = Column(JSON, default=lambda: {
        "left": {"x": 50, "y": 50}, "right": {"x": 50, "y": 50}
    })
    speed_limit = Column(Integer, nullable=True)
    steering_sensitivity = Column(Integer, default=50)
    ambient_lighting = Column(String, default="#4a90d9")
    auto_ac = Column(Boolean, default=True)
    auto_music = Column(Boolean, default=True)
    auto_seat = Column(Boolean, default=True)
    auto_mirror = Column(Boolean, default=True)
    auto_speed_limit = Column(Boolean, default=True)
    auto_lighting = Column(Boolean, default=True)

    user = relationship("User", back_populates="profile")


class DrivingInteraction(Base):
    __tablename__ = "driving_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    outside_temp = Column(Float)
    set_ac_temp = Column(Float)
    time_of_day = Column(Integer)
    day_of_week = Column(Integer)
    music_genre_chosen = Column(String)
    seat_height = Column(Integer)
    seat_recline = Column(Integer)
    seat_distance = Column(Integer)
    speed_driven = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="interactions")


class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String, nullable=False)
    last_trained = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    accuracy = Column(Float, nullable=True)
    sample_count = Column(Integer, default=0)
