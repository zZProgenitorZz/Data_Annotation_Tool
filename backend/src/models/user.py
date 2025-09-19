from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.objectid_helper import PyObjectId
from backend.src.models.role import RoleDto

class User(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    roleId: Optional[PyObjectId] = None
    username: str
    password: str
    email: str
    is_active: bool

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class UserDto(BaseModel):
    id: Optional[str] = None
    username: str
    email: str
    role: Optional[str] = None # Only include role name in DTO
    is_active: bool

class UserUpdate(BaseModel):
    id : Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    roleId: Optional[PyObjectId] = None
    is_active: Optional[bool] = None