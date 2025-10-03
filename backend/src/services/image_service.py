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

class ImageService:

    def __init__(self, base_path:str ):
        self.image_repo = ImageMetadataRepo()
        self.base_path = base_path   # bv.  'C:/images/'
        self.dataset_repo = DatasetRepo()


    # Adding images to the dataset (This is what you actually use to add images)(giving images the dataset_id)
    async def add_images_to_dataset(self, dataset_id: str, image_files: list[str], uploaded_by: Optional[str] = None ):
        
    
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")


        inserted_images = []
        for file_name in image_files:
            image_metadata = await self.add_image(file_name, dataset_id, uploaded_by)
            inserted_images.append(image_metadata)

        # Update total images
        dataset.total_Images += len(inserted_images)
        await self.dataset_repo.update_dataset(dataset_id, dataset)

        return inserted_images

    
#-----------------------------------------------------------------------------------------------------------------------

    async def get_images_by_dataset(self, dataset_id: str) -> List[ImageMetadataDto]:
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
            uploadedBy=str(current_user.id),
            uploadedAt=datetime.now(timezone.utc),
            is_active=True
        )

        # Sla op in DB
        saved_image = await self.image_repo.create_image_metadata(metadata.model_dump())

        # Maak DTO direct van opgeslagen object
        return self.to_dto(saved_image)

    
    # soft delete
    async def soft_delete_image(self, image_id: str) -> bool:
        soft_delete = ImageMetadataUpdate(
            is_active = False
        )
        soft_metadata = soft_delete.model_dump(exclude_unset=True)
        return await self.image_repo.update_image_metadata(image_id, soft_metadata)
    
    # restore
    async def restore_image(self, image_id: str) -> bool:
        restore = ImageMetadataUpdate(
            is_active = True
        )
        restore_metadata = restore.model_dump(exclude_unset=True)
        return await self.image_repo.update_image_metadata(image_id, restore_metadata)
        
    # hard delete
    async def hard_delete_image(self, image_id: str) -> bool:
        
        metadata = await self.image_repo.get_image_metadata_by_id(image_id)
        if not metadata:
            return NotFoundError(f"Image metadata with id {image_id} not found")
        
        file_path = os.path.join(metadata.folderPath, metadata.fileName)
        if os.path.exists(file_path):
            os.remove(file_path)

        deleted = await self.image_repo.delete_image_metadata(image_id)

        return deleted

#----------------------------Dataset Images--------------------------------------------------------------------------------

    # soft delete dataset images(bulk)
    async def soft_delete_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID:{dataset_id} not found")
        
        count = 0
        for image in images:
            succes = await self.soft_delete_image(str(image.id))
            if succes:
                count += 1

        return count
    
    # restore dataset images(bulk)
    async def restore_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID:{dataset_id} not found")
        
        count = 0
        for image in images:
            succes = await self.restore_image(str(image.id))
            if succes:
                count += 1
        return count
    
    # hard delete dataset images(bulk)(als een heledataset wordt gedelete)
    async def hard_delete_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID:{dataset_id} not found")
        count = 0
        for image in images:
            succes = await self.hard_delete_image(str(image.id))
            if succes:
                count += 1
        return count

    
    def to_dto(image: ImageMetadata) -> ImageMetadataDto:
        return ImageMetadataDto(
            id=str(image.id) if image.id else None,
            datasetId=str(image.datasetId) if image.datasetId else None,
            fileName=image.fileName,
            folderPath=image.folderPath,
            width=image.width,
            height=image.height,
            fileType=image.fileType,
            UploadedBy=str(image.uploadedBy) if image.uploadedBy else None,
            uploadedAt=image.uploadedAt,
            is_active=image.is_active
        )
