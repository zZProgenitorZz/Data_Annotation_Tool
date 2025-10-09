from pydantic import BaseModel, Field
from typing import Optional, List
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime, date

class Dataset(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = None
    createdBy: Optional[str] = None
    status: str
    total_Images: int = 0
    completed_Images: int = 0
    locked : bool = None
    assignedTo: List[str] = Field(default_factory=list)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    is_active: bool 
    date_of_collection: Optional[date] = None
    location_of_collection: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}



class DatasetDto(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    createdBy: Optional[str] = None
    status: str
    total_Images: int = 0
    completed_Images: int = 0
    locked : bool = None
    assignedTo: List[str] = Field(default_factory=list)
    createdAt: Optional[datetime] = None
    updatedAt: datetime
    is_active: bool
    date_of_collection: Optional[date] = None
    location_of_collection: Optional[str] = None

    

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_Images: Optional[int] = None
    completed_Images: Optional[int] = None
    locked: Optional[bool] = None
    assignedTo: Optional[List[str]] = None
    updatedAt: Optional[datetime] = None

    is_active: Optional[bool] = None
    date_of_collection: Optional[date] = None
    location_of_collection: Optional[str] = None

    