from pydantic import BaseModel
from datetime import datetime

class Dataset(BaseModel):
    id: int
    name: str
    description: str
    createdBy: int
    status: str
    total_Images: int
    completed_Images: int
    locked : bool
    lockedBy: int

    createdAt: datetime
    updatedAt: datetime

    is_active: bool


class DatasetDto(BaseModel):
    id: int
    name: str
    description: str
    createdBy: int
    status: str
    total_Images: int
    completed_Images: int
    locked : bool
    lockedBy: int

    createdAt: datetime
    updatedAt: datetime
    
    is_active: bool