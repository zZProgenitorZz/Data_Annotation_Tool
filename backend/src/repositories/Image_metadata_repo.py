from backend.src.models.dataset import DatasetDto, Dataset, DatasetUpdate
from backend.src.models.user import UserDto, User, UserUpdate
from backend.src.helpers.helpers import PyObjectId
from backend.src.db.connection import db
from datetime import datetime, timezone
from backend.src.models.imageMetadata import ImageMetadata, ImageMetadataDto, ImageMetadataUpdate


class ImageMetadataRepo:

    def __init__(self):
        self.collection = db["imageMetadata"]

    # Create a new image metadata
    async def create_image_metadata(self, image_metadata: ImageMetadata) -> ImageMetadata:
        image_metadata_dict = image_metadata.model_dump()
        image_metadata_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        image_metadata_dict["uploadedAt"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(image_metadata_dict)
        image_metadata_dict["_id"] = result.inserted_id
        return ImageMetadata(**image_metadata_dict)
    

    # Get image metadata by id
    async def get_image_metadata_by_id(self, image_metadata_id: str) -> ImageMetadata:
        image_metadata = await self.collection.find_one({"_id": PyObjectId(image_metadata_id)})
        if not image_metadata:
            return None
        return ImageMetadata(
            **image_metadata
        )

    # Get all image metadata
    async def get_all_image_metadata(self) -> list[ImageMetadata]:
        image_metadata_cursor = self.collection.find()
        image_metadatas = []
        if image_metadata_cursor:
            async for image_metadata in image_metadata_cursor:
                image_metadatas.append(ImageMetadata(
                    **image_metadata
                ))
            return image_metadatas
        return None

    # Delete an image metadata by id
    async def delete_image_metadata(self, image_metadata_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(image_metadata_id)})
        return result.deleted_count > 0


    # Update an image metadata by id
    async def update_image_metadata(self, image_metadata_id: str, updated_image_metadata: ImageMetadataUpdate) -> bool:
        image_metadata = await self.collection.find_one({"_id" : PyObjectId(image_metadata_id)})
        if not image_metadata:
            return False
        
        updated_image_metadata_data = updated_image_metadata.model_dump(exclude_unset=True)
        updated_image_metadata_data.pop("id", None)
        

        result = await self.collection.update_one({"_id": PyObjectId(image_metadata_id)}, {"$set": updated_image_metadata_data})
        return result.modified_count > 0


    # Delete and image metadata by filename
    async def delete_image_metadata_by_filename(self, dataset_id: str, file_name: str) -> bool:
        result = await self.collection.delete_many({
            "datasetId": PyObjectId(dataset_id),
            "fileName": file_name
        })
        return result.deleted_count > 0

    # Get image metadata by file name
    async def get_image_metadata_by_filename(self, dataset_id: str, filename: str) -> ImageMetadata:
        image_metadata = await self.collection.find_one({"datasetId": PyObjectId(dataset_id), "fileName": filename})
        if not image_metadata:
            return None
        return ImageMetadata(
            **image_metadata
        )
    
    # Get image metadata by dataset_id
    async def get_image_by_dataset_id(self, dataset_id: str) -> list[ImageMetadata]:
        images_cursor = self.collection.find({"datasetId": PyObjectId(dataset_id)})
        image_metadatas = []
        
        
        async for image in images_cursor:
            image_metadatas.append(ImageMetadata(
                **image
            ))
        return image_metadatas
     



