from pydantic import BaseModel, Field
from typing import Optional, Dict
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime, timezone


class Log(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[str] = None           # wie heeft dit gedaan
    action: str                        # bv. upload_dataset, annotate_session, delete_request
    target: Optional[str] = None       # bv. dataset_id of image_id
    details: Optional[Dict] = None     # extra info zoals {"images_annotated": 25}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}


class LogDto(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = None
    action: str
    target: Optional[str] = None
    details: Optional[Dict] = None     # extra info zoals {"images_annotated": 25}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

