from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime


class UserDto(BaseModel):
    id: Optional[str] = None
    username: str
    email: str
    disabled: bool
    role: str
    is_guest: bool = False

    invite_token: str | None = None
    invite_expires_at: datetime | None = None

    reset_token: str | None = None
    reset_expires_at: datetime | None = None

class User(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    username: str
    email: EmailStr
    disabled: bool
    role: str
    hashed_password: str | None = None

    invite_token: str | None = None
    invite_expires_at: datetime | None = None

    reset_token: str | None = None
    reset_expires_at: datetime | None = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class UserUpdate(BaseModel):
    id : Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    disabled: Optional[bool] = None
    role: Optional[str] = None

    invite_token: str | None = None
    invite_expires_at: datetime | None = None

    reset_token: str | None = None
    reset_expires_at: datetime | None = None

    

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str | None = None


class InviteUserDto(BaseModel):
    username: str | None = None
    email: EmailStr
    role: str = "user"  # of "user", afhankelijk van jouw rollen

class CompleteInviteDto(BaseModel):
    token: str
    password: str


class ResetPasswordRequestDto(BaseModel):
    email: EmailStr