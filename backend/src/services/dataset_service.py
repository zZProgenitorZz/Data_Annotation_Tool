from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.repositories.dataset_repo import DatasetRepo
from datetime import datetime
from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import User
from backend.src.services.log_service import LogService
from backend.src.services.image_service import ImageService, ImageMetadataRepo
from typing import Optional

class DatasetService:
    def __init__(self, basepath: str):
        self.dataset_repo = DatasetRepo()
        self.user_repo = UserRepo()
        self.log = LogService()
        self.image_service = ImageService(basepath)
        self.image_repo = ImageMetadataRepo()
        self.basepath = basepath


    # images toevoegen aan de dataset(Dit gebruik je werkelijk om images toetevoegen)
    async def add_images_to_dataset(self, dataset_id: str, image_files: list[str], uploaded_by: Optional[str] = None ):
        
    
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")

        inserted_images = []
        for file_name in image_files:
            image_metadata = await self.image_service.add_image(file_name, dataset_id, uploaded_by)
            inserted_images.append(image_metadata)

        # Update total images
        dataset.total_Images += len(inserted_images)
        await self.dataset_repo.update_dataset(dataset_id, dataset)

        return inserted_images

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
                action="Created",
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
    async def update_dataset(self, dataset_id: str, dataset_update: DatasetUpdate, current_user: User) -> bool:
        # Haal huidige dataset op
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset with id {dataset_id} not found")

        # Voer de update uit
        updated = await self.dataset_repo.update_dataset(dataset_id, dataset_update)
        if not updated:
            raise ValueError(f"Failed to update dataset with id {dataset_id}")

        # Controleer wat er veranderd is en log
        if dataset_update.assignedTo is not None and dataset_update.assignedTo != dataset.assignedTo:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_ASSIGNED_TO",
                target=f"Dataset: {dataset.name}",
                details={
                    "old_assigned": dataset.assignedTo,
                    "new_assigned": dataset_update.assignedTo,
                    "username": current_user.username
                }
            )

        if dataset_update.name is not None and dataset_update.name != dataset.name:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_NAME",
                target=f"Dataset: {dataset.name}",
                details={
                    "old_name": dataset.name,
                    "new_name": dataset_update.name,
                    "username": current_user.username
                }
            )

        if dataset_update.status is not None and dataset_update.status.lower() == "complete" and dataset.status != "complete":
            await self.log.log_action(
                user_id=current_user.id,
                action="STATUS_COMPLETED",
                target=f"Dataset: {dataset.name}",
                details={
                    "old_status": dataset.status,
                    "new_status": dataset_update.status,
                    "username": current_user.username
                }
            )

        if dataset_update.description is not None and dataset_update.description != dataset.description:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_DESCRIPTION",
                target=f"Dataset: {dataset.name}",
                details={
                    "old_description": dataset.description,
                    "new_description": dataset_update.description,
                    "username": current_user.username
                }
            )

        return updated

  
#------------------------------------------------------------------------------------------------------
  
  # soft delete dataset
    async def softdelete_dataset(self, dataset_id: str, current_user: User) -> bool:
        softdelete = DatasetUpdate(
            is_active= False
        )
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        username = current_user.username
        
        await self.log.log_action(
            user_id = current_user.id,
            action = "SOFT_DELETED",
            target=f"Dataset: {dataset.name}",
            details = {
                "username": username
            }

        )   

        return await self.dataset_repo.update_dataset(dataset_id, softdelete)
    
    # restore dataset
    async def restore_dataset(self, dataset_id: str, current_user: User) -> bool:
        softdelete = DatasetUpdate(
            is_active= True
        )

        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        username = current_user.username
        
        await self.log.log_action(
            user_id = current_user.id,
            action = "RESTORED",
            target=f"Dataset: {dataset.name}",
            details = {
                "username": username
            }

        )   


        return self.dataset_repo.update_dataset(dataset_id, softdelete)
    
    # hard delete dataset
    async def harddelete_dataset(self, dataset_id: str, current_user: User) -> bool:
        deleted = await self.dataset_repo.delete_dataset(dataset_id)
        if not deleted:
            raise ValueError(f"Failed to delete dataset with id {dataset_id}")
        
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        username = current_user.username
        
        await self.log.log_action(
            user_id = current_user.id,
            action = "HARD_DELETED",
            target=f"Dataset: {dataset.name}",
            details = {
                "username": username
            }

        )   

        return deleted


    # Checks on status
    async def recalculate_status(self, dataset_id):

        return True