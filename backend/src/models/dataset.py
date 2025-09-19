from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.objectid_helper import PyObjectId
from datetime import datetime

class Dataset(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = None
    createdBy: PyObjectId
    status: str
    total_Images: int
    completed_Images: int
    locked : bool
    lockedBy: Optional[PyObjectId] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    is_active: bool

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}


class DatasetDto(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    createdBy: str
    status: str
    total_Images: int
    completed_Images: int
    locked : bool
    lockedBy: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    is_active: bool

    

class DatasetUpdate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_Images: Optional[int] = None
    completed_Images: Optional[int] = None
    locked : Optional[bool] = None
    lockedBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    is_active: Optional[bool] = None