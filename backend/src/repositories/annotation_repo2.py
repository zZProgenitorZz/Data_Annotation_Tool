from backend.src.helpers.helpers import PyObjectId
from backend.src.db.connection import db
from backend.src.models.annotation2 import ImageAnnotations, Annotation
from typing import List

class ImageAnnotationsRepo:
    def __init__(self):
        self.collection = db["image_annotations"]  # Collection voor images met embedded annotations

    # Create a new image with annotations
    async def create_image_annotations(self, image_annotations: dict) -> str:
        result = await self.collection.insert_one(image_annotations)
        return str(result.inserted_id)

    # Get image annotations by imageId
    async def get_image_annotations_by_imageId(self, image_id: str) -> ImageAnnotations:
        doc = await self.collection.find_one({"imageId": str(image_id)})
        if not doc:
            return None
        return ImageAnnotations(**doc)

    # Get only annotations of a image by imageId
    async def get_annotations_for_image(self, image_id: str) -> List[Annotation]:
        doc = await self.collection.find_one({"imageId": str(image_id)})
        if doc:
            return [Annotation(**a) for a in doc.get("annotations", [])]
        return []


    # Get all image annotations
    async def get_all_image_annotations(self) -> list[ImageAnnotations]:
        cursor = self.collection.find()
        results = []
        async for doc in cursor:
            results.append(ImageAnnotations(**doc))
        return results

    # Delete image annotations by image/document id
    async def delete_image_annotations(self, image_id: str) -> bool:
        result = await self.collection.delete_one({"imageId": str(image_id)})
        return result.deleted_count > 0

    # Update image annotations by image/document id
    async def update_image_annotations(self, image_id: str, updated_data: dict) -> bool:
        result = await self.collection.update_one(
            {"imageId": str(image_id)},
            {"$set": updated_data}
        )
        return result.modified_count > 0

    # Optional: Add a single annotation to an existing image
    async def add_annotation_to_image(self, image_id: str, annotation: dict) -> bool:
        result = await self.collection.update_one(
            {"imageId": str(image_id)},
            {"$push": {"annotations": annotation}}
        )
        return result.modified_count > 0
