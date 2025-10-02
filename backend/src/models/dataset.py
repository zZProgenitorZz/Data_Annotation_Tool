from pydantic import BaseModel, Field
from typing import Optional, List
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime, date

class Dataset(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    createdBy: str
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
    createdBy: str
    status: str
    total_Images: int = 0
    completed_Images: int = 0
    locked : bool = None
    assignedTo: List[str] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime
    is_active: bool
    date_of_collection: Optional[date] = None
    location_of_collection: Optional[str] = None

    

class DatasetUpdate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_Images: int = 0
    completed_Images: int = 0
    locked : Optional[bool] = None
    assignedTo: List[str] = Field(default_factory=list)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    is_active: Optional[bool] = None
    date_of_collection: Optional[date] = None
    location_of_collection: Optional[str] = None