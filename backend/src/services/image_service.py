import os
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo
from typing import Optional, List
from PIL import Image
from datetime import datetime
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate
from backend.src.helpers.helpers import PyObjectId, NotFoundError
from backend.src.repositories.dataset_repo import DatasetRepo
from backend.src.models.user import UserDto
from datetime import datetime, timezone
from backend.src.services.dataset_service import DatasetService

class ImageService:

    def __init__(self, base_path:str ):
        self.image_repo = ImageMetadataRepo()
        self.base_path = base_path   # bv.  'C:/images/'
        self.dataset_repo = DatasetRepo()
        self.dataset_service = DatasetService()


    # Adding images to the dataset (This is what you actually use to add images)(giving images the dataset_id)
    async def add_images_to_dataset(self, dataset_id: str, image_files: list[str], current_user: UserDto ):


        inserted_images = []
        for file_name in image_files:
            image_metadata = await self.add_image(file_name, dataset_id, current_user)
            inserted_images.append(image_metadata)


        await self.update_dataset_image_count(dataset_id, len(inserted_images), current_user)

        return inserted_images

    
#-----------------------------------------------------------------------------------------------------------------------

    async def get_images_by_dataset(self, dataset_id: str, current_User: UserDto | None = None) -> List[ImageMetadataDto]:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID: {dataset_id} not found")

        images_dto = [
            self.to_dto(image)
            for image in images
        ]


        return images_dto

    async def add_image(self, file_name: str, dataset_id: str, current_user: UserDto) -> ImageMetadataDto:
        full_path = os.path.join(self.base_path, file_name)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"{full_path} does not exist")

        try:
            with Image.open(full_path) as img:
                width, height = img.size
                file_type = img.format.lower()
        except Exception as e:
            raise ValueError(f"Cannot open image {file_name}: {e}")

        # Maak metadata object
        metadata = ImageMetadata(
            datasetId=str(dataset_id),
            fileName=file_name,
            folderPath=self.base_path,
            width=width,
            height=height,
            fileType=file_type,
            uploadedAt=datetime.now(timezone.utc),
            is_active=True
        )

        # Sla op in DB
        saved_image = await self.image_repo.create_image_metadata(metadata.model_dump(exclude={"id"}, exclude_unset=True))

        # Maak DTO direct van opgeslagen object
        return self.to_dto(saved_image)

    
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
        images_in_dataset = await self.image_repo.get_image_by_dataset_id(dataset_id)
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
        images_in_dataset = await self.image_repo.get_image_by_dataset_id(dataset_id)
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

    # -------------------hard delete one image
    async def hard_delete_image(self, image_id: str, current_user: UserDto | None = None) -> bool:
        metadata = await self.image_repo.get_image_metadata_by_id(image_id)
        if not metadata:
            raise NotFoundError(f"Image metadata with id {image_id} not found")
        
        # alleen hard delete als image soft-deleted is
        if metadata.is_active:
            return False

        file_path = os.path.join(metadata.folderPath, metadata.fileName)
        if os.path.exists(file_path):
            os.remove(file_path)

        deleted = await self.image_repo.delete_image_metadata(image_id)
        return deleted

    # hard delete all soft-deleted images of a dataset
    async def hard_delete_dataset_images(self, dataset_id: str, current_user: UserDto | None = None) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID: {dataset_id} not found")
        
        # filter alleen soft-deleted images
        images_to_delete = [image for image in images if not image.is_active]

        if not images_to_delete:
            return 0

        count = 0
        for image in images_to_delete:
            succes = await self.hard_delete_image(str(image.id), current_user)
            if succes:
                count += 1

        return count
    
    #--------------------------helpers----------------------------------------------------------------
    def to_dto(self, image: ImageMetadata) -> ImageMetadataDto:
        return ImageMetadataDto(
            id=str(image.id),
            datasetId=str(image.datasetId) if image.datasetId else None,
            fileName=image.fileName,
            folderPath=image.folderPath,
            width=image.width,
            height=image.height,
            fileType=image.fileType,
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
