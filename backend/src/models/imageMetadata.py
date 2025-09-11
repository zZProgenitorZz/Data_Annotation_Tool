from pydantic import BaseModel
from datetime import datetime

class ImageMetadata(BaseModel):
    id: int
    datasetId: int
    fileName: str
    folderPath: str
    width: int
    height: int
    fileSize: int
    fileType: str
    createdBy: int

    createdAt: datetime
    updatedAt: datetime

    is_active: bool

class ImageMetadataDto(BaseModel):
    id: int
    datasetId: int
    fileName: str
    folderPath: str
    width: int
    height: int
    fileSize: int
    fileType: str
    createdBy: int

    createdAt: datetime
    updatedAt: datetime

    is_active: bool
