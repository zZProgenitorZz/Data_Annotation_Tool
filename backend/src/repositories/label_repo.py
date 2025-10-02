
from backend.src.helpers.helpers import PyObjectId
from backend.src.models.label import Label, LabelDto, LabelUpdate
from backend.src.db.connection import db



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

    # Get all labels
    async def get_all_labels(self) -> list[Label]:
        labels_cursor = self.collection.find()
        labels = []
        if labels_cursor:
            async for label in labels_cursor:
                labels.append(Label(
                    **label
                ))
            return labels
        return None

    # Create a new label
    async def create_label(self, label: Label) -> str:
        label_dict = label.model_dump()
        label_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        result = await self.collection.insert_one(label_dict)
        return str(result.inserted_id)

    # Delete a label by id
    async def delete_label(self, label_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(label_id)})
        return result.deleted_count > 0

    # Update a label by id
    async def update_label(self, label_id: str, updated_label: LabelUpdate) -> bool:
        label = await self.collection.find_one({"_id" : PyObjectId(label_id)})
        if not label:
            return False
        
        updated_label_data = updated_label.model_dump(exclude_unset=True)
        updated_label_data.pop("id", None)

        result = await self.collection.update_one({"_id": PyObjectId(label_id)}, {"$set": updated_label_data})
        return result.modified_count > 0



