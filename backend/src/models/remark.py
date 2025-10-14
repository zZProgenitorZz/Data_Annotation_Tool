from pydantic import BaseModel, Field
from typing import List, Optional
from backend.src.helpers.helpers import PyObjectId
import uuid

class Remark(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    annotation_id: Optional[str] = None  # Bij welke annotatie deze feedback hoort
    image_id: Optional[str] = None
    from_user: Optional[str] = None      # Wie de feedback stuurt
    to_users: Optional[List[str]] = None # Wie de feedback ontvangt (meerdere reviewers mogelijk)
    message: str                                # De feedback zelf
    status: bool = False                        # False = nog niet reviewed, True = reviewed
    reply: Optional[str] = None                 # Reactie van ontvanger/annotator

    class Config:
        json_encoders = {
            PyObjectId: str
        }

class RemarkDTO(BaseModel):
    id: Optional[str] = None
    annotation_id: Optional[str] = None
    image_id: Optional[str] = None
    from_user: str
    to_users: Optional[List[str]] = None
    message: str
    status: bool
    reply: Optional[str] = None

class RemarkUpdate(BaseModel):
    status: Optional[bool] = None
    reply: Optional[str] = None