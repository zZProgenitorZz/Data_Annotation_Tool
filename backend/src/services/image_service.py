import os
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo
from typing import Optional, List
from PIL import Image
from datetime import datetime
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate
from backend.src.helpers.objectid_helper import PyObjectId


class ImageService:

    def __init__(self, base_path:str ):
        self.image_repo = ImageMetadataRepo()
        self.base_path = base_path   # bv.  'C:/images/'


    
#-----------------------------------------------------------------------------------------------------------------------

    async def get_images_by_dataset(self, dataset_id: str) -> List[ImageMetadataDto]:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise ValueError(f"Images with dataset ID: {dataset_id} not found")

        images_dto = [
            ImageMetadataDto(
                id=str(image.id) if image.id else None,
                datasetId=str(image.datasetId) if image.datasetId else None,
                fileName=image.fileName,
                folderPath=image.folderPath,
                width=image.width,
                height=image.height,
                fileType=image.fileType,
                UploadedBy=str(image.UploadedBy) if image.UploadedBy else None,
                uploadedAt=image.uploadedAt,
                is_active=image.is_active
            )
            for image in images
        ]

        return images_dto

    async def add_image(self, file_name: str, dataset_id: Optional[str] = None, uploaded_by: Optional[str] = None) -> ImageMetadata:
        #Whole path of the image
        full_path = os.path.join(self.base_path, file_name)

        # Check if the file exists
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"{full_path} does not exist")
        
        # Open image to read its height and width
        with Image.open(full_path) as img:
            width, height = img.size
            file_type = img.format.lower()


        # Create a metaImageData object
        metadata = ImageMetadata(
            datasetId =PyObjectId(dataset_id) if dataset_id else None,
            fileName = file_name,
            folderPath=self.base_path,
            width = width,
            height = height,
            fileType = file_type,
            uploadedBy=PyObjectId(uploaded_by) if uploaded_by else None,
            is_active = True
        )


        # Save metadata using repo
        inserted_metadata = await self.image_repo.create_image_metadata(metadata)
        return inserted_metadata
    
    # soft delete
    async def soft_delete_image(self, image_id: str) -> bool:
        soft_delete = ImageMetadataUpdate(
            is_active = False
        )
        return await self.image_repo.update_image_metadata(image_id, soft_delete)
    
    # restore
    async def restore_image(self, image_id: str) -> bool:
        restore = ImageMetadataUpdate(
            is_active = True
        )
        return await self.image_repo.update_image_metadata(image_id, restore)
        
    # hard delete
    async def hard_delete_image(self, image_id: str) -> bool:
        
        metadata = await self.image_repo.get_image_metadata_by_id(image_id)
        if not metadata:
            return False
        
        file_path = os.path.join(metadata["folderPath"], metadata["fileName"])
        if os.path.exists(file_path):
            os.remove(file_path)


        deleted = await self.image_repo.delete_image_metadata(image_id)

        return deleted

#----------------------------Dataset Images--------------------------------------------------------------------------------

    # soft delete dataset images(bulk)
    async def soft_delete_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)

        count = 0
        for image in images:
            succes = await self.soft_delete_image(str(image.id))
            if succes:
                count += 1

        return count
    
    # restore dataset images(bulk)
    async def restore_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)

        count = 0
        for image in images:
            succes = await self.restore_image(str(image.id))
            if succes:
                count += 1
        return count
    
    # hard delete dataset images(bulk)
    async def hard_delete_dataset_images(self, dataset_id: str) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)

        count = 0
        for image in images:
            succes = await self.hard_delete_image(str(image.id))
            if succes:
                count += 1
        return count

    