from pydantic import BaseModel, Field
from typing import Optional, Literal
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime

class ImageMetadata(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    datasetId: Optional[str] = None
    fileName: str
    folderPath: Optional[str] = None # kept folderPath for if i plan a mixed/legacy mode
    is_completed: Optional[bool] = False

    width: int
    height: int
    fileType: str

    # S3 & lifecycle
    s3Key: Optional[str] = None  #e.g. "uploads/{datasetId}/{uuid}.jpg"
    contentType: Optional[str] = None  # mirrors HTTP Content-type
    sizeBytes: Optional[int] = None
    etag: Optional[str] = None
    checksum: Optional[str] = None
    status: Literal["pending", "ready", "failed"] = "pending"
    # why? we'll create metadata rows before upload(status = "pending"), then mark them "ready" on /complete after verifying the object in S3


    
    uploadedAt: Optional[datetime] = None
    is_active: bool

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {PyObjectId: str},
        "extra": "ignore",   # ignore unexpected keys like stray "id"
    }


class ImageMetadataDto(BaseModel):
    id: Optional[str] = None
    datasetId: Optional[str] = None
    fileName: str
    folderPath: Optional[str] = None
    is_completed: Optional[bool] = False


    width: int
    height: int
    fileType: str

    
    s3Key: Optional[str] = None
    contentType: Optional[str] = None
    sizeBytes: Optional[int] = None
    etag: Optional[str] = None
    checksum: Optional[str] = None
    status: Optional[str] = None

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

    
    s3Key: Optional[str] = None
    contentType: Optional[str] = None
    sizeBytes: Optional[int] = None
    etag: Optional[str] = None
    checksum: Optional[str] = None
    status: Optional[str] = None

    uploadedAt: Optional[datetime] = None
    is_active: Optional[bool] = None

    