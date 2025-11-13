
from backend.src.models.user import UserDto
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from backend.src.helpers.helpers import NotFoundError
from backend.src.services.imageMetadata_service import MetadataService
from backend.src.services.image_service import ImageService
from backend.src.models.imageMetadata import ImageMetadataDto
from backend.src.helpers.auth_helper import require_roles, is_guest_user, require_guest_user, require_normal_user
from backend.src.services.guest_session_service import guest_session_service
from pydantic import BaseModel, Field, ConfigDict
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo

router = APIRouter()


image_service = ImageService()
metadata_service = MetadataService()
image_repo = ImageMetadataRepo()

class PresignFile(BaseModel):
    filename: str
    size: int
    contentType: str 

    model_config = ConfigDict(populate_by_name=True)

class PresignRequest(BaseModel):
    files: List[PresignFile]

@router.post("/{dataset_id}/images/presign")
async def presign_images(dataset_id: str, body: PresignRequest, current_user: UserDto = Depends(require_normal_user)):
    try:
        # If you want guests to upload too, call a guest-specific flow here
        return await image_service.presign_upload(dataset_id, [f.model_dump() for f in body.files], current_user)
    except Exception as e:
        raise HTTPException(400, str(e))
    
    
class CompleteRequest(BaseModel):
    imageId: str
    checksum: str | None = None
    width: int | None = None
    height: int | None = None

@router.post("/images/complete")
async def complete_image(body: CompleteRequest, current_user: UserDto = Depends(require_roles(["admin","reviewer","annotator"]))):
    try:
        return await image_service.complete_upload(body.imageId,current_user, body.checksum, body.width, body.height)
    except NotFoundError as e:
        raise HTTPException(404, str(e))
    
@router.post("/images/complete-bulk")
async def complete_images_bulk(items: List[CompleteRequest], current_user: UserDto = Depends(require_roles(["admin","reviewer","annotator"]))):
    try:
        return await image_service.complete_upload_bulk([i.model_dump() for i in items], current_user)
    except NotFoundError as e:
        raise HTTPException(404, str(e))


@router.get("/images/{image_id}/signed-url")
async def get_signed_url(image_id: str, current_user: UserDto = Depends(require_roles(["admin","reviewer","annotator"]))):
    try:
        return await image_service.get_signed_url(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(404, str(e))


# Get images from dataset
@router.get("/{dataset_id}/all-images", response_model=list[ImageMetadataDto])
async def get_images(dataset_id: str, limit: Optional[int] = Query(None, ge=1, le=200) , offset: int = Query(0, ge=0) ,current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.get_images_by_dataset(current_user.id, dataset_id)
        return await metadata_service.get_images_by_dataset(dataset_id=dataset_id, current_user=current_user, limit=limit, offset=offset,)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    

# Soft delete images for user and hard delete for guest
@router.delete("/{dataset_id}/soft", response_model=int)
async def soft_delete_images(dataset_id: str, image_id: list[str] | None = None, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.delete_images(current_user.id, dataset_id, image_id)
        return await metadata_service.soft_delete_images(image_id, dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Restore images
@router.put("/{dataset_id}/restore", response_model=int)
async def restore_image(dataset_id: str, image_id: list[str] | None = None, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await metadata_service.restore_images(image_id, dataset_id, current_user)
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
    

# For guest users

@router.post("/guest-datasets/{dataset_id}/images")
async def upload_guest_images(
    dataset_id: str,
    files: List[UploadFile] = File(...),
    current_user = Depends(require_guest_user()),
):
    try:
        return await guest_session_service.add_images_to_dataset(
            guest_id=current_user.id,
            dataset_id=dataset_id,
            files=files,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))



@router.get("/guest-images/{dataset_id}")
async def get_guest_images_for_dataset(
    dataset_id: str,
    current_user = Depends(require_guest_user()),
):
    try:
        images = guest_session_service.get_images_by_dataset(current_user.id, dataset_id)
        return images   # lijst van dicts / DTO's
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    



