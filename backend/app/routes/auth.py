from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DriverProfile
from app.schemas import UserRegister, UserLogin, FingerprintLogin, TokenResponse
from app.auth import hash_password, verify_password, create_access_token
from app.config import OWNER_KEY

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    # Only the car owner (who knows the key) can register drivers
    if data.owner_key != OWNER_KEY:
        raise HTTPException(status_code=403, detail="Invalid owner key. Only the car owner can register drivers.")

    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        is_learner=data.is_learner,
        fingerprint_hash=data.fingerprint_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default profile
    profile = DriverProfile(user_id=user.id)
    if user.is_learner:
        profile.speed_limit = 40
    db.add(profile)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token, user_id=user.id, username=user.username
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token, user_id=user.id, username=user.username
    )


@router.post("/fingerprint-login", response_model=TokenResponse)
def fingerprint_login(data: FingerprintLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.fingerprint_hash == data.fingerprint_hash
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Fingerprint not recognized")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token, user_id=user.id, username=user.username
    )
