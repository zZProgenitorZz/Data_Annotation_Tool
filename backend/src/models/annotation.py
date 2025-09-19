from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.objectid_helper import PyObjectId
from datetime import datetime

class Annotation(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    imageId: Optional[PyObjectId] = None
    labelId: Optional[PyObjectId] = None
    datasetidId: Optional[PyObjectId] = None
    x: float
    y: float
    width: float
    height: float
    createdBy: Optional[PyObjectId] = None
    updatedAt: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    is_active: bool 

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}



class AnnotationDto(BaseModel):
    id: Optional[str] = None
    imageId: Optional[str] = None
    labelId: Optional[str] = None
    datasetidId: Optional[str] = None
    x: float
    y: float
    width: float
    height: float
    createdBy: Optional[str] = None
    updatedAt: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    is_active: bool 



class AnnotationUpdate(BaseModel):
    id: Optional[str] = None
    imageId: Optional[str] = None
    labelId: Optional[str] = None
    datasetidId: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    createdBy: Optional[str] = None
    updatedAt: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    is_active: Optional[bool] = None