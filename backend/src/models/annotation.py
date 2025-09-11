from pydantic import BaseModel
from datetime import datetime

class Annotation(BaseModel):
    id: int
    imageId: int
    labelId: int
    datasetidId: int
    x: float
    y: float
    width: float
    height: float
    createdBy: int

    createdAt: datetime
    updatedAt: datetime

    is_active: bool 


class AnnotationDto(BaseModel):
    id: int
    imageId: int
    labelId: int
    datasetidId: int
    x: float
    y: float
    width: float
    height: float
    createdBy: int

    createdAt: datetime
    updatedAt: datetime

    is_active: bool 