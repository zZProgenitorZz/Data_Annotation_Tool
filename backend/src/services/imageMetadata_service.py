
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
    async def soft_delete_image(
        self,
        image_id: str,
        current_user: UserDto | None = None
    ) -> bool:
        """
        Soft delete één image:
        - is_active -> False
        - dataset.total_Images --
        - als image.is_completed == True: dataset.completed_Images --
        """
        image = await self.image_repo.get_image_metadata_by_id(image_id)
        if not image:
            raise NotFoundError(f"Image with id {image_id} not found")

        # al inactive? dan niets doen
        if not image.is_active:
            return False

        was_completed = bool(getattr(image, "is_completed", False))

        # 1. image zelf soft-deleten
        soft_delete = ImageMetadataUpdate(is_active=False)
        soft_metadata = soft_delete.model_dump(exclude_unset=True)
        success = await self.image_repo.update_image_metadata(image_id, soft_metadata)
        if not success:
            return False

        # 2. total_Images --
        await self.update_dataset_image_count(image.datasetId, -1, current_user)

        # 3. completed_Images -- als hij meetelde als completed
        if was_completed:
            await self.dataset_repo.update_dataset_state(
                dataset_id=str(image.datasetId),
                delta_completed=-1,
            )

        return True
    
    
    # soft delete all images
    async def soft_delete_images(
        self,
        dataset_id: str,
        current_user: UserDto | None = None
    ) -> int:

        if not dataset_id:
            raise ValueError("dataset_id is required")

        # haal alle images van de dataset
        images_in_dataset = await self.image_repo.get_image_by_dataset_id(
            dataset_id,
            limit=None,
            offset=0
        )
        if not images_in_dataset:
            raise NotFoundError(f"Images with dataset id: {dataset_id} not found")

        # soft-delete alle actieve images in de dataset
        images_to_delete = [image for image in images_in_dataset if image.is_active]

        if not images_to_delete:
            return 0

        deleted = 0
        for image in images_to_delete:
            succes = await self.soft_delete_image(str(image.id))
            if succes:
                deleted += 1
            


        return deleted

    # -------------------restore
    async def restore_image(
        self,
        image_id: str,
        current_user: UserDto | None = None
    ) -> bool:
        """
        Restore één image:
        - is_active -> True
        - dataset.total_Images ++
        - als image.is_completed == True: dataset.completed_Images ++
        """
        image = await self.image_repo.get_image_metadata_by_id(image_id)
        if not image:
            raise NotFoundError(f"Image with id {image_id} not found")

        # al actief? niets meer te doen
        if image.is_active:
            return False

        was_completed = bool(getattr(image, "is_completed", False))

        restore = ImageMetadataUpdate(is_active=True)
        restore_metadata = restore.model_dump(exclude_unset=True)
        success = await self.image_repo.update_image_metadata(image_id, restore_metadata)
        if not success:
            return False

        # total_Images ++
        await self.update_dataset_image_count(image.datasetId, 1, current_user)

        # completed_Images ++ als deze image een completed image is
        if was_completed:
            await self.dataset_repo.update_dataset_state(
                dataset_id=str(image.datasetId),
                delta_completed=1,
            )

        return True

    
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

        return count

    
    #--------------------------helpers----------------------------------------------------------------
   # to_dto() stays, maybe include the new fields:
    def to_dto(self, image: ImageMetadata) -> ImageMetadataDto:
        return ImageMetadataDto(
            id=str(image.id),
            datasetId=str(image.datasetId) if image.datasetId else None,
            fileName=image.fileName,
            is_completed=image.is_completed,
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

  
        



