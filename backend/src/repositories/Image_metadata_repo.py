
from backend.src.helpers.helpers import PyObjectId
from backend.core.db import db
from backend.src.models.imageMetadata import ImageMetadata


class ImageMetadataRepo:

    def __init__(self):
        self.collection = db["imageMetadata"]

    # Create a new image metadata
    async def create_image_metadata(self, image_metadata: dict) -> ImageMetadata:
        result = await self.collection.insert_one(image_metadata)
        
        # het document ophalen via de inserted_id
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        
        
        if not created_doc:
            raise Exception("Failed to fetch created image metadata")
        
        return ImageMetadata(**created_doc)

    
    # Get image metadata by id
    async def get_image_metadata_by_id(self, image_metadata_id: str) -> ImageMetadata:
        image_metadata = await self.collection.find_one({"_id": PyObjectId(image_metadata_id)})

        return ImageMetadata(
            **image_metadata
        )

    # Delete an image metadata by id
    async def delete_image_metadata(self, image_metadata_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(image_metadata_id)})
        return result.deleted_count > 0


    # Update an image metadata by id
    async def update_image_metadata(self, image_metadata_id: str, updated_metadata: dict) -> bool:
      
        result = await self.collection.update_one({"_id": PyObjectId(image_metadata_id)}, {"$set": updated_metadata})
        return result.modified_count > 0


    # Get image metadata by dataset_id
    async def get_image_by_dataset_id(
        self,
        dataset_id: str,
        limit: int | None,
        offset: int,
    ) -> list[ImageMetadata]:
        query = self.collection.find({"datasetId": dataset_id})

        # offset toepassen als hij > 0 is
        if offset:
            query = query.skip(offset)

        # limit alleen als hij niet None is
        if limit is not None:
            query = query.limit(limit)
            docs = await query.to_list(length=limit)
        else:
            # alle results (vanaf offset)
            docs = await query.to_list(length=None)

        return [ImageMetadata(**doc) for doc in docs]

     

#----------------------------------niet in gebruik (NOG)---------------------------------------

    # Delete and image metadata by filename
    async def delete_image_metadata_by_filename(self, dataset_id: str, file_name: str) -> bool:
        result = await self.collection.delete_many({
            "datasetId": PyObjectId(dataset_id),
            "fileName": file_name
        })
        return result.deleted_count > 0

    # Get image metadata by file name
    async def get_image_metadata_by_filename(self, dataset_id: str, filename: str) -> ImageMetadata:
        image_metadata = await self.collection.find_one({"datasetId": dataset_id, "fileName": filename})
        if not image_metadata:
            return None
        return ImageMetadata(
            **image_metadata
        )
    
        # Get all image metadata
    
    # get all images
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

