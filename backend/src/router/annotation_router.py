# backend/src/router/annotation_router.py

from fastapi import APIRouter, HTTPException
from typing import List
from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.services.annotation_service2 import ImageAnnotationsService
from backend.src.helpers.helpers import NotFoundError, ValidationError

router = APIRouter()

annotation_service = ImageAnnotationsService()

# Create new image annotations
@router.post("/", response_model=str)
async def create_image_annotations(image_annotations: ImageAnnotations):
    try:
        return await annotation_service.create_image_annotations(image_annotations)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all image annotations
@router.get("/all-image", response_model=List[ImageAnnotationsDto])
async def get_all_image_annotations():
    try:
        return await annotation_service.get_all_image_annotations()
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get annotations for a specific image
@router.get("/{image_id}/annotations", response_model=List[AnnotationDto])
async def get_annotations_for_image(image_id: str):
    try:
        return await annotation_service.get_annotations_for_image(image_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get full ImageAnnotations document for one image
@router.get("/{image_id}", response_model=ImageAnnotationsDto)
async def get_image_annotations_by_imageId(image_id: str):
    try:
        return await annotation_service.get_image_annotations_by_imageId(image_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Add a single annotation to an image
@router.post("/{image_id}/add", response_model=bool)
async def add_annotation_to_image(image_id: str, annotation: Annotation):
    try:
        return await annotation_service.add_annotation_to_image(image_id, annotation)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update annotations of an image
@router.put("/{image_id}", response_model=bool)
async def update_image_annotations(image_id: str, updated_data: ImageAnnotations):
    try:
        return await annotation_service.update_image_annotations(image_id, updated_data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Delete all annotations for a given image
@router.delete("/{image_id}", response_model=bool)
async def delete_image_annotations(image_id: str):
    try:
        return await annotation_service.delete_image_annotations(image_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
