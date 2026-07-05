from pydantic import BaseModel
from typing import Optional


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    is_learner: bool = False
    fingerprint_hash: Optional[str] = None
    owner_key: str  # required — only owner can register drivers


class UserLogin(BaseModel):
    username: str
    password: str


class FingerprintLogin(BaseModel):
    fingerprint_hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class SeatPosition(BaseModel):
    height: int = 50
    recline: int = 30
    distance: int = 50


class MirrorPositions(BaseModel):
    left: dict = {"x": 50, "y": 50}
    right: dict = {"x": 50, "y": 50}


class ProfileUpdate(BaseModel):
    ac_temp_preference: Optional[float] = None
    seat_position: Optional[SeatPosition] = None
    music_genre: Optional[str] = None
    mirror_positions: Optional[MirrorPositions] = None
    speed_limit: Optional[int] = None
    steering_sensitivity: Optional[int] = None
    ambient_lighting: Optional[str] = None
    auto_ac: Optional[bool] = None
    auto_music: Optional[bool] = None
    auto_seat: Optional[bool] = None
    auto_mirror: Optional[bool] = None
    auto_speed_limit: Optional[bool] = None
    auto_lighting: Optional[bool] = None


class ProfileResponse(BaseModel):
    ac_temp_preference: float
    seat_position: dict
    music_genre: str
    mirror_positions: dict
    speed_limit: Optional[int]
    steering_sensitivity: int
    ambient_lighting: str
    auto_ac: bool
    auto_music: bool
    auto_seat: bool
    auto_mirror: bool
    auto_speed_limit: bool
    auto_lighting: bool

    class Config:
        from_attributes = True


class DrivingInteractionCreate(BaseModel):
    outside_temp: float
    set_ac_temp: float
    time_of_day: int
    day_of_week: int
    music_genre_chosen: str
    seat_height: int
    seat_recline: int
    seat_distance: int
    speed_driven: Optional[float] = None


class SmartSuggestion(BaseModel):
    model_config = {"protected_namespaces": ()}

    suggested_ac_temp: float
    suggested_music_genre: str
    suggested_seat: SeatPosition
    suggested_speed_limit: Optional[int]
    confidence: float
    model_last_trained: Optional[str]
