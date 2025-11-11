
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo
from typing import List
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate
from backend.src.helpers.helpers import NotFoundError
from backend.src.repositories.dataset_repo import DatasetRepo
from backend.src.models.user import UserDto
from backend.src.services.dataset_service import DatasetService


class MetadataService:

    def __init__(self ):
        self.image_repo = ImageMetadataRepo()
        self.dataset_repo = DatasetRepo()
        self.dataset_service = DatasetService()

  
#-----------------------------------------------------------------------------------------------------------------------

    async def get_images_by_dataset(self, dataset_id: str, current_user: UserDto | None, limit: int | None, offset: int) -> List[ImageMetadataDto]:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id, limit, offset)
        if not images:
            return []

        images_dto = [
            self.to_dto(image)   
            for image in images
        ]
        return images_dto

    
    # -------------------soft delete
    async def soft_delete_image(self, image_id: str) -> bool:
        soft_delete = ImageMetadataUpdate(
            is_active = False
        )
        soft_metadata = soft_delete.model_dump(exclude_unset=True)
        return await self.image_repo.update_image_metadata(image_id, soft_metadata)
    
    # soft delete all images
    async def soft_delete_images(self, image_ids: list[str] | None = None, dataset_id: str | None = None, current_user: UserDto | None = None) -> int:

        if not dataset_id:
            raise ValueError("dataset_id is required")

        # haal alle images van de dataset
        images_in_dataset = await self.image_repo.get_image_by_dataset_id(dataset_id, limit = None, offset=0)
        if not images_in_dataset:
            raise NotFoundError(f"Images with dataset id: {dataset_id} not found")
        
        if image_ids is None:
            # soft-delete alle actieve images in de dataset
            images_to_delete = [image for image in images_in_dataset if image.is_active]
        else:
            # soft-delete alleen de opgegeven images die in de dataset zitten
            images_to_delete = [
                image for image in images_in_dataset
                if str(image.id) in image_ids and image.is_active
            ]

        if not images_to_delete:
            return 0

        count = 0
        for image in images_to_delete:
            succes = await self.soft_delete_image(str(image.id))
            if succes:
                count += 1

        # update dataset image count
        if count > 0:
            await self.update_dataset_image_count(dataset_id, -count, current_user)

        return count

    # -------------------restore
    async def restore_image(self, image_id: str) -> bool:
        restore = ImageMetadataUpdate(
            is_active = True
        )
        restore_metadata = restore.model_dump(exclude_unset=True)
        return await self.image_repo.update_image_metadata(image_id, restore_metadata)
    
    # restore all images
    async def restore_images(self, image_ids: list[str] | None = None, dataset_id: str | None = None, current_user: UserDto | None = None) -> int:
        
        if not dataset_id:
            raise ValueError("dataset_id is required")

        # haal alle images van de dataset
        images_in_dataset = await self.image_repo.get_image_by_dataset_id(dataset_id, limit=None, offset=0)
        if not images_in_dataset:
            raise NotFoundError(f"Images with dataset id: {dataset_id} not found")
        
        if image_ids is None:
            # restore alle inactive images in de dataset
            images_to_restore = [image for image in images_in_dataset if not image.is_active]
        else:
            # restore alleen de opgegeven images die in de dataset zitten en inactive zijn
            images_to_restore = [
                image for image in images_in_dataset
                if str(image.id) in image_ids and not image.is_active
            ]

        if not images_to_restore:
            return 0

        count = 0
        for image in images_to_restore:
            succes = await self.restore_image(str(image.id))
            if succes:
                count += 1

        # update dataset image count
        if count > 0:
            await self.update_dataset_image_count(dataset_id, count, current_user)

        return count

    
    #--------------------------helpers----------------------------------------------------------------
   # to_dto() stays, maybe include the new fields:
    def to_dto(self, image: ImageMetadata) -> ImageMetadataDto:
        return ImageMetadataDto(
            id=str(image.id),
            datasetId=str(image.datasetId) if image.datasetId else None,
            fileName=image.fileName,
            folderPath=image.folderPath,
            width=image.width,
            height=image.height,
            fileType=image.fileType,
            s3Key=image.s3Key,
            contentType=image.contentType,
            sizeBytes=image.sizeBytes,
            etag=image.etag,
            checksum=image.checksum,
            status=image.status,
            uploadedAt=image.uploadedAt,
            is_active=image.is_active
        )
    
    async def update_dataset_image_count(self, dataset_id: str, change: int, current_user: UserDto | None = None):
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")
        
        dataset.total_Images += change

        dataset.total_Images = max(dataset.total_Images, 0)
        await self.dataset_service.update_dataset(dataset_id, dataset, current_user=current_user)
