from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DriverProfile
from app.schemas import ProfileUpdate, ProfileResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/", response_model=ProfileResponse)
def get_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(DriverProfile).filter(
        DriverProfile.user_id == user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(DriverProfile).filter(
        DriverProfile.user_id == user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if isinstance(value, dict) or hasattr(value, "model_dump"):
            value = value.model_dump() if hasattr(value, "model_dump") else value
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
