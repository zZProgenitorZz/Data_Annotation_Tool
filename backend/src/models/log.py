from pydantic import BaseModel
from datetime import datetime


class Log(BaseModel):
    id: int
    userId: int
    action: str
    timestamp: datetime
    details: str


class LogDto(BaseModel):
    id: int
    userId: int
    action: str
    timestamp: datetime
    details: str
