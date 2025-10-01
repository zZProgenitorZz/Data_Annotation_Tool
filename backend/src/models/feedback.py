from pydantic import BaseModel, Field
from typing import List, Optional
from backend.src.helpers.objectid_helper import PyObjectId
import uuid

class Feedback(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    annotation_id: Optional[PyObjectId] = None  # Bij welke annotatie deze feedback hoort
    image_id: Optional[PyObjectId] = None
    from_user: Optional[PyObjectId] = None      # Wie de feedback stuurt
    to_users: Optional[List[PyObjectId]] = None # Wie de feedback ontvangt (meerdere reviewers mogelijk)
    message: str                                # De feedback zelf
    status: bool = False                        # False = nog niet reviewed, True = reviewed
    reply: Optional[str] = None                 # Reactie van ontvanger/annotator

    class Config:
        json_encoders = {
            PyObjectId: str
        }

class FeedbackDTO(BaseModel):
    id: str
    annotation_id: Optional[str] = None
    image_id: Optional[str] = None
    from_user: str
    to_users: Optional[List[str]] = None
    message: str
    status: bool
    reply: Optional[str] = None

class FeedbackUpdate(BaseModel):
    status: Optional[bool] = None
    reply: Optional[str] = None