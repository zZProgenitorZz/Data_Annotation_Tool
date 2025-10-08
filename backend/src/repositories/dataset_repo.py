from backend.src.models.dataset import Dataset
from backend.src.helpers.helpers import PyObjectId
from backend.src.db.connection import db


class DatasetRepo:
    def __init__(self):
        self.collection = db["dataset"]

    # Create a new dataset
    async def create_dataset(self, dataset: dict) -> str:
        result = await self.collection.insert_one(dataset)
        return str(result.inserted_id)

    # Get database by id
    async def get_dataset_by_id(self, dataset_id: str) -> Dataset:
        dataset = await self.collection.find_one({"_id": PyObjectId(dataset_id)})
        if not dataset:
            return None
        return Dataset(
            **dataset
        )

    # Get all datasets
    async def get_all_datasets(self) -> list[Dataset]:
        dataset_cursor = self.collection.find()
        datasets = []
        if dataset_cursor:
            async for dataset in dataset_cursor:
                datasets.append(Dataset(
                    **dataset
                ))
            return datasets
        return None

    # Delete a dataset by id
    async def delete_dataset(self, dataset_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(dataset_id)})
        return result.deleted_count == 1

    # Update dataset by id
    async def update_dataset(self, dataset_id: str, updated_data: dict) -> bool:
        
        result = await self.collection.update_one({"_id": PyObjectId(dataset_id)}, {"$set": updated_data})

        return result.modified_count > 0

