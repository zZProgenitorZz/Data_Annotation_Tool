from backend.src.services.dataset_service import DatasetService
from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.models.user import UserDto
from typing import Annotated, List
from fastapi import APIRouter, Depends, status, HTTPException
from datetime import datetime
from backend.src.helpers.helpers import NotFoundError
from backend.src.services.image_service import ImageService
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate
from backend.src.helpers.auth_helper import require_roles, is_guest_user
from backend.src.services.guest_session_service import guest_session_service
from backend.src.db.connection import BASE_PATH

router = APIRouter()



dataset_service = DatasetService()
image_service = ImageService(BASE_PATH)


# Add images to dataset
@router.post("/{dataset_id}/images", response_model=List[ImageMetadataDto])
async def add_images(dataset_id: str, image_files: List[str], current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.add_images_to_dataset(current_user.id, dataset_id, image_files)
        return await image_service.add_images_to_dataset(dataset_id, image_files, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Get images from dataset
@router.get("/{dataset_id}/all-images", response_model=list[ImageMetadataDto])
async def get_images(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.get_images_by_dataset(current_user.id, dataset_id)
        return await image_service.get_images_by_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    

# Soft delete images for user and hard delete for guest
@router.delete("/{dataset_id}/soft", response_model=int)
async def soft_delete_images(dataset_id: str, image_id: list[str] | None = None, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.delete_images(current_user.id, dataset_id, image_id)
        return await image_service.soft_delete_images(image_id, dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Restore images
@router.put("/{dataset_id}/restore", response_model=int)
async def restore_image(dataset_id: str, image_id: list[str] | None = None, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await image_service.restore_images(image_id, dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Hard delete single image
@router.delete("/{image_id}/hard", response_model=bool)
async def hard_delete_image(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await image_service.hard_delete_image(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Hard delete all images in dataset
@router.delete("/dataset/{dataset_id}/hard", response_model=int)
async def hard_delete_dataset_images(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await image_service.hard_delete_dataset_images(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

