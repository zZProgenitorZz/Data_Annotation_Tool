from typing import List, Literal, Union, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.src.helpers.helpers import PyObjectId
import uuid



# ---- Geometry models ----
class BBoxGeometry(BaseModel):
    x: float
    y: float
    width: float
    height: float


class PolygonGeometry(BaseModel):
    points: List[List[float]]  # [[x, y], [x, y], ...]


class EllipseGeometry(BaseModel):
    cx: float
    cy: float
    rx: float
    ry: float


class FreehandGeometry(BaseModel):
    path: List[List[float]]  # [[x, y], [x, y], ...]


class MaskGeometry(BaseModel):
    maskPath: str  # e.g. SVG path string


# ---- Annotation model ----
class Annotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: Optional[str] = None
    type: Literal["bbox", "polygon", "ellipse", "freehand", "mask"]
    geometry: Union[
        BBoxGeometry,
        PolygonGeometry,
        EllipseGeometry,
        FreehandGeometry,
        MaskGeometry
    ]

    model_config = ConfigDict(discriminator="type")

# ---- Image model ----
class ImageAnnotations(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    imageId: Optional[str] = None
    annotations: List[Annotation]

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str}
    )


# ---- Annotation model Dto ----
class AnnotationDto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())) 
    label: Optional[str] = None
    type: Literal["bbox", "polygon", "ellipse", "freehand", "mask"]
    geometry: Union[
        BBoxGeometry,
        PolygonGeometry,
        EllipseGeometry,
        FreehandGeometry,
        MaskGeometry
    ] = None

    model_config = ConfigDict(discriminator="type")


# ---- Image model Dto----
class ImageAnnotationsDto(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    imageId: Optional[str] = None
    annotations: List[AnnotationDto] = []

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str}
    )




