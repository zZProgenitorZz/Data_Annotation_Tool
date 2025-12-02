from pydantic import BaseModel, Field
from typing import List, Optional
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime

class Remark(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    annotationId: Optional[str] = None  # Bij welke annotatie deze feedback hoort
    imageId: Optional[str] = None
    datasetId: Optional[str] = None
    #from_user: Optional[str] = None      # Wie de feedback stuurt
    #to_users: Optional[List[str]] = None # Wie de feedback ontvangt (meerdere reviewers mogelijk)
    message: str                                # De feedback zelf
    status: bool = False                        # False = nog niet reviewed, True = reviewed
    reply: Optional[str] = None                 # Reactie van ontvanger/annotator

    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        json_encoders = {
            PyObjectId: str
        }

class RemarkDTO(BaseModel):
    id: Optional[str] = None
    annotationId: Optional[str] = None
    imageId: Optional[str] = None
    datasetId: Optional[str] = None
    #from_user: str
    #to_users: Optional[List[str]] = None
    message: Optional[str] = None
    status: bool = False
    reply: Optional[str] = None

    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

