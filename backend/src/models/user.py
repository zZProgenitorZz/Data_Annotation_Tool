from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from backend.src.helpers.helpers import PyObjectId

class UserDto(BaseModel):
    id: Optional[str] = None
    username: str
    email: str
    disabled: bool
    role: str
    is_guest: bool = False

class User(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    username: str
    email: EmailStr
    disabled: bool
    role: str
    hashed_password: str

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

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str | None = None
