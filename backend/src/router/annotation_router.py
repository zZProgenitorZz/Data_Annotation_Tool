
from backend.src.helpers.auth_helper import require_roles
from fastapi import APIRouter, HTTPException, Depends
from backend.src.models.user import UserDto
from typing import List
from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.services.annotation_service2 import ImageAnnotationsService
from backend.src.helpers.helpers import NotFoundError, ValidationError

router = APIRouter()

annotation_service = ImageAnnotationsService()

# Create new image annotations
@router.post("/", response_model=str)
async def create_image_annotations(image_annotations: ImageAnnotations, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.create_image_annotations(image_annotations, current_user)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all image annotations
@router.get("/all-image", response_model=List[ImageAnnotationsDto])
async def get_all_image_annotations(current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.get_all_image_annotations(current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get annotations for a specific image
@router.get("/{image_id}/annotations", response_model=List[AnnotationDto])
async def get_annotations_for_image(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.get_annotations_for_image(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get full ImageAnnotations document for one image
@router.get("/{image_id}", response_model=ImageAnnotationsDto)
async def get_image_annotations_by_imageId(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.get_image_annotations_by_imageId(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Add a single annotation to an image
@router.post("/{image_id}/add", response_model=bool)
async def add_annotation_to_image(image_id: str, annotation: Annotation, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.add_annotation_to_image(image_id, annotation, current_user)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update annotations of an image
@router.put("/{image_id}", response_model=bool)
async def update_image_annotations(image_id: str, updated_data: ImageAnnotations, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.update_image_annotations(image_id, updated_data, current_user)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Delete a single annotation from an image
@router.delete("/{image_id}/{annotation_id}", response_model=bool)
async def delete_single_annotation(image_id: str, annotation_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.delete_sigle_annotation(image_id, annotation_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Delete all annotations for a given image
@router.delete("/{image_id}", response_model=bool)
async def delete_image_annotations(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await annotation_service.delete_image_annotations(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
