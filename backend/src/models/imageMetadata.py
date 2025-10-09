from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime

class ImageMetadata(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    datasetId: Optional[str] = None
    fileName: str
    folderPath: str
    width: int
    height: int
    fileType: str
    
    uploadedBy: Optional[str] = None
    uploadedAt: Optional[datetime] = None

    is_active: bool

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}


class ImageMetadataDto(BaseModel):
    id: Optional[str] = None
    datasetId: Optional[str] = None
    fileName: str
    folderPath: str
    width: int
    height: int
    fileType: str

    UploadedBy: Optional[str] = None
    uploadedAt: Optional[datetime] = None

    is_active: bool


class ImageMetadataUpdate(BaseModel):
    id: Optional[str] = None
    datasetId: Optional[str] = None
    fileName: Optional[str] = None
    folderPath: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fileType: Optional[str] = None

    UploadedBy: Optional[str] = None
    uploadedAt: Optional[datetime] = None

    is_active: Optional[bool] = None

