from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.objectid_helper import PyObjectId

class Label(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    datasetId: Optional[PyObjectId] = None
    labelName: str
    labelDescription: Optional[str] = None 

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}


class LabelDto(BaseModel):
    id: Optional[str] = None
    labelName: str
    labelDescription: Optional[str] = None  

class LabelUpdate(BaseModel):
    id: Optional[str] = None
    labelName: Optional[str] = None
    labelDescription: Optional[str] = None