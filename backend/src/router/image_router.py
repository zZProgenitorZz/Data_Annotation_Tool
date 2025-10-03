from backend.src.services.dataset_service import DatasetService
from backend.src.services.user_service import UserService
from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.models.user import UserDto
from typing import Annotated, List
from fastapi import APIRouter, Depends, status, HTTPException
from datetime import datetime
from backend.src.helpers.helpers import NotFoundError
from backend.src.services.image_service import ImageService
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate

router = APIRouter()

#basepath for image location
BASE_PATH = "C:/Users/Lenovo/Documents/VS Project/DataAnnotationTool/images"


user_service = UserService()
dataset_service = DatasetService()
image_service = ImageService(BASE_PATH)


# Add images to dataset
@router.post("/{dataset_id}/images", response_model=List[str])
async def add_images(dataset_id: str, image_files: List[str], current_user: UserDto = Depends(user_service.get_current_active_user)):
    try:
        return await image_service.add_images_to_dataset(dataset_id, image_files, uploaded_by=current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))