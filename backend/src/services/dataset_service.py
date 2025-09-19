from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.repositories.dataset_repo import DatasetRepo
from datetime import datetime
from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import User
from backend.src.services.log_service import LogService
from backend.src.services.image_service import ImageService, ImageMetadataRepo
from typing import Optional

class DatasetService:
    def __init__(self):
        self.dataset_repo = DatasetRepo()
        self.user_repo = UserRepo()
        self.log = LogService()
        self.image_service = ImageService()
        self.image_repo = ImageMetadataRepo()



    async def add_images_to_dataset(self, dataset_id: str, image_files: list[str], uploaded_by: Optional[str] = None ):
        added_images = []

        for file_name in image_files:
            #voeg image toe aan storage en maak metadata
            metadata = await self.image_service.add_image(file_name, dataset_id, uploaded_by)
            added_images.append(metadata)

            dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
            dataset.total_Images = len(await self.image_repo.get_image_by_dataset_id(dataset_id))
            await self.dataset_repo.update_dataset(dataset_id, dataset)
        return added_images

#-----------------------------------------------------------------------------------------------------
    # Create a new dataset
    async def create_dataset(self, dataset_data: Dataset) -> str:
        
        success = await self.dataset_repo.create_dataset(dataset_data)
        if success:

            user = await self.user_repo.get_user_by_id(str(dataset_data.createdBy))
            username = user.username if user else "Unknown"

            assigned_to_usernames = []
            if dataset_data.assignedTo:
                for user_id in dataset_data.assignedTo:
                    user = await self.user_repo.get_user_by_id(str(user_id))
                    if user:
                        assigned_to_usernames.append(user.username)
            

            await self.log.log_action(
                user_id=dataset_data.createdBy,
                action="CREATED",
                target=f"Dataset: {dataset_data.name}",
                details = {
                    "username": username,
                    "assigned_to": assigned_to_usernames
                }
            )
        return success


    # Get a dataset by id
    async def get_dataset(self, dataset_id: str) -> DatasetDto:
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset with id {dataset_id} not found")
        
        #Fetch user info
        created_by_user = await self.user_repo.get_user_by_id(str(dataset.createdBy))
        created_by_username = created_by_user.username if created_by_user else "Unknown"


        assigned_to_usernames = []
        if dataset.assignedTo:
            for user_id in dataset.assignedTo:
                user = await self.user_repo.get_user_by_id(str(user_id))
                if user:
                    assigned_to_usernames.append(user.username)

        # Build and return DTO
        return DatasetDto(
            id=str(dataset.id),
            name=dataset.name,
            description=dataset.description,
            createdBy=created_by_username,
            status=dataset.status,
            total_Images=dataset.total_Images,
            completed_Images=dataset.completed_Images,
            locked=dataset.locked,
            assignedTo=assigned_to_usernames,
            createdAt=dataset.createdAt,
            updatedAt=dataset.updatedAt,
            is_active=dataset.is_active
        )

    # Get all datasets
    async def get_all_datasets(self) -> list[DatasetDto]:
        datasets = await self.dataset_repo.get_all_datasets()
        if not datasets:
            return []
        
        result = []
        for dataset in datasets:
            # Get createdBy username
            created_by_user = await self.user_repo.get_user_by_id(str(dataset.createdBy))
            created_by_username = created_by_user.username if created_by_user else "Unknown"

            # Get assignedTo usernames
            assigned_to_usernames = []
            if dataset.assignedTo:
                for user_id in dataset.assignedTo:
                    user = await self.user_repo.get_user_by_id(str(user_id))
                    if user:
                        assigned_to_usernames.append(user.username)

            # Build DTO
            dataset_dto = DatasetDto(
                id=str(dataset.id),
                name=dataset.name,
                description=dataset.description,
                createdBy=created_by_username,
                status=dataset.status,
                total_Images=dataset.total_Images,
                completed_Images=dataset.completed_Images,
                locked=dataset.locked,
                assignedTo=assigned_to_usernames,
                createdAt=dataset.createdAt,
                updatedAt=dataset.updatedAt,
                is_active=dataset.is_active
            )
            result.append(dataset_dto)

        return result


    # Update a dataset
    async def update_dataset(self, dataset_id: str, dataset_update: DatasetUpdate) -> bool:
        updated = await self.dataset_repo.update_dataset(dataset_id, dataset_update)
        if not updated:
            raise ValueError(f"Failed to update dataset with id {dataset_id}")
        return updated

    # Delete a dataset
    async def delete_dataset(self, dataset_id: str) -> bool:
        deleted = await self.dataset_repo.delete_dataset(dataset_id)
        if not deleted:
            raise ValueError(f"Failed to delete dataset with id {dataset_id}")
        return deleted

#------------------------------------------------------------------------------------------------------
  