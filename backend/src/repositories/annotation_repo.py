
from backend.src.helpers.objectid_helper import PyObjectId
from backend.src.db.connection import db
from datetime import datetime, timezone
from backend.src.models.annotation import Annotation, AnnotationUpdate

class AnnotationRepo:
    def __init__(self):
        self.collection = db["annotation"]

    # Create a new annotation
    async def create_annotation(self, annotation: Annotation) -> str:
        annotation_dict = annotation.model_dump()
        annotation_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        annotation_dict["createdAt"] = datetime.now(timezone.utc)
        annotation_dict["updatedAt"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(annotation_dict)
        return str(result.inserted_id)

    # Get annotation by id
    async def get_annotation_by_id(self, annotation_id: str) -> Annotation:
        annotation = await self.collection.find_one({"_id": PyObjectId(annotation_id)})
        if not annotation:
            return None
        return Annotation(
            **annotation
        )

    # Get all annotations
    async def get_all_annotations(self) -> list[Annotation]:
        annotations_cursor = self.collection.find()
        annotations = []
        if annotations_cursor:
            async for annotation in annotations_cursor:
                annotations.append(Annotation(
                    **annotation
                ))
            return annotations
        return None

    # Delete an annotation by id
    async def delete_annotation(self, annotation_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(annotation_id)})
        return result.deleted_count > 0

    # Update an annotation by id
    async def update_annotation(self, annotation_id: str, updated_annotation: AnnotationUpdate) -> bool:
        annotation = await self.collection.find_one({"_id" : PyObjectId(annotation_id)})
        if not annotation:
            return False
        
        updated_annotation_data = updated_annotation.model_dump(exclude_unset=True)
        updated_annotation_data.pop("id", None)
        updated_annotation_data["updatedAt"] = datetime.now(timezone.utc)

        result = await self.collection.update_one({"_id": PyObjectId(annotation_id)}, {"$set": updated_annotation_data})
        return result.modified_count > 0
