
from backend.src.helpers.helpers import PyObjectId
from backend.src.models.label import Label
from backend.core.db import db



class LabelRepo:
    def __init__(self):
        self.collection = db["label"]

    # Get label by id
    async def get_label_by_id(self, label_id: str) -> Label:
        label = await self.collection.find_one({"_id": PyObjectId(label_id)})
        if not label:
            return None
        return Label(
            **label
        )



    # Create a new label
    async def create_label(self, label: dict) -> str:
        result = await self.collection.insert_one(label)
        return str(result.inserted_id)

    # Delete a label by id
    async def delete_label(self, label_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(label_id)})
        return result.deleted_count > 0

    # Update a label by id
    async def update_label(self, label_id: str, updated_label: dict) -> bool:

        result = await self.collection.update_one({"_id": PyObjectId(label_id)}, {"$set": updated_label})
        return result.modified_count > 0
    
    # Delete all dataset labels
    async def delete_dataset_labels(self, dataset_id: str) -> bool:
        result = await self.collection.delete_many({"datasetId": dataset_id})
        return result.deleted_count > 0

    # Get all labels
    async def get_all_labels(self, dataset_id: str) -> list[Label]:
        labels_cursor = self.collection.find({"datasetId": dataset_id})
        labels = []
        if labels_cursor:
            async for label in labels_cursor:
                labels.append(Label(
                    **label
                ))
            return labels
        return None



