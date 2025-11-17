from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.repositories.dataset_repo import DatasetRepo
from backend.src.helpers.helpers import NotFoundError, SerializeHelper
from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import UserDto
from backend.src.services.log_service import LogService
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo
from datetime import datetime, timezone

class DatasetService:
    def __init__(self):
        self.dataset_repo = DatasetRepo()
        self.user_repo = UserRepo()
        self.log = LogService()
        self.image_repo = ImageMetadataRepo()
  


 
#-----------------------------------------------------------------------------------------------------
    # Create a new dataset
    async def create_dataset(self, dataset_data: Dataset, current_user : UserDto) -> str:
        
        data = dataset_data.model_dump()
        data.pop("id", None)  # Remove id if present, MongoDB will create one
        data["createdAt"] = datetime.now(timezone.utc)
        data["updatedAt"] = datetime.now(timezone.utc)
        data["createdBy"] = str(current_user.id)
        data = SerializeHelper.dates_to_datetime(data)

        # Insert in repo
        success = await self.dataset_repo.create_dataset(data)
        
        if success:

            username = current_user.username if current_user else "Unknown"

            assigned_to_usernames = []
            if dataset_data.assignedTo:
                for user_id_role in (dataset_data.assignedTo or []):
                    user_id = str(user_id_role).split(" - ", 1)[0].strip()
                    user = await self.user_repo.get_user_by_id(user_id)
                    if user:
                        assigned_to_usernames.append(user.username)

            

            await self.log.log_action(
                user_id=str(current_user.id),
                action="Created",
                target=f"Dataset: {data['name']}",
                details={
                    "username": username,
                    "assigned_to": assigned_to_usernames
                }
            )
        return success


    # Get a dataset by id
    async def get_dataset(self, dataset_id: str, current_user: UserDto | None = None) -> DatasetDto:
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")
        
       
        return to_dto(dataset)

    # Get all datasets    
    
    async def get_all_datasets(
        self,
        current_user: UserDto | None = None
    ) -> list[DatasetDto]:
        datasets = await self.dataset_repo.get_all_datasets()
        if not datasets:
            return []

        # Gewoon elk model → DTO
        return [to_dto(dataset) for dataset in datasets]

        


   # Update a dataset
    async def update_dataset(self, dataset_id: str, updated_dataset: DatasetUpdate, current_user: UserDto | None) -> bool:
        # Haal huidige dataset op
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")

        updated_data = updated_dataset.model_dump(exclude_unset=True)
        updated_data["updatedAt"] = datetime.now(timezone.utc)
        updated_data.pop("id", None)  # id nooit updaten

        updated_data = SerializeHelper.dates_to_datetime(updated_data)

   
        # Nieuwe waardes uit updated_data halen
        new_assigned = updated_data.get("assignedTo")
        new_name = updated_data.get("name")
        new_status = updated_data.get("status")
        new_description = updated_data.get("description")

        # Logging per attribuut
        if new_assigned is not None and new_assigned != dataset.assignedTo:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_ASSIGNED_TO",
                target=f"Dataset: {dataset.name or dataset.id}",
                details={
                    "old_assigned": dataset.assignedTo,
                    "new_assigned": new_assigned,
                    "username": current_user.username
                }
            )

        if new_name is not None and new_name != dataset.name:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_NAME",
                target=f"Dataset: {dataset.name or dataset.id}",
                details={
                    "old_name": dataset.name,
                    "new_name": new_name,
                    "username": current_user.username
                }
            )

        if new_status is not None and new_status.lower() == "complete" and dataset.status != "complete":
            await self.log.log_action(
                user_id=current_user.id,
                action="STATUS_COMPLETED",
                target=f"Dataset: {dataset.name or dataset.id}",
                details={
                    "old_status": dataset.status,
                    "new_status": new_status,
                    "username": current_user.username
                }
            )

        if new_description is not None and new_description != dataset.description:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_DESCRIPTION",
                target=f"Dataset: {dataset.name or dataset.id}",
                details={
                    "old_description": dataset.description,
                    "new_description": new_description,
                    "username": current_user.username
                }
            )
        # Voer de update uit
        updated = await self.dataset_repo.update_dataset(dataset_id, updated_data)
        if not updated:
            raise NotFoundError(f"Failed to update dataset with id {dataset_id}")


        return updated

#------------------------------------------------------------------------------------------------------
  
  # soft delete dataset
    async def softdelete_dataset(self, dataset_id: str, current_user: UserDto) -> bool:
        softdelete = DatasetUpdate(
            is_active= False
        )
        softdelete = softdelete.model_dump(exclude_unset=True)
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")

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
    async def restore_dataset(self, dataset_id: str, current_user: UserDto) -> bool:
        restore = DatasetUpdate(
            is_active= True
        )
        restore = restore.model_dump(exclude_unset=True)

        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")

        username = current_user.username
        
        await self.log.log_action(
            user_id = current_user.id,
            action = "RESTORED",
            target=f"Dataset: {dataset.name}",
            details = {
                "username": username
            }
        )   


        return await self.dataset_repo.update_dataset(dataset_id, restore)
    
    # hard delete dataset
    async def hard_delete_dataset(self, dataset_id: str, current_user: UserDto) -> bool:
        # Haal dataset eerst op (voor logging)
        dataset = await self.dataset_repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset with id {dataset_id} not found")

        # Delete uitvoeren
        deleted = await self.dataset_repo.delete_dataset(dataset_id)
        if not deleted:
            raise NotFoundError(f"Failed to delete dataset with id {dataset_id}")

        username = current_user.username

        # Log na succesvolle delete
        await self.log.log_action(
            user_id=current_user.id,
            action="HARD_DELETED",
            target=f"Dataset: {dataset.name}",
            details={
                "username": username
            }
        )

        return deleted



    # Checks on status (not done)
    
def to_dto (dataset) :

    return DatasetDto(
                id=str(dataset.id),
                name=dataset.name,
                description=dataset.description,
                createdBy=dataset.createdBy,
                status=dataset.status,
                total_Images=dataset.total_Images,
                completed_Images=dataset.completed_Images,
                locked=dataset.locked,
                assignedTo=dataset.assignedTo,
                createdAt=dataset.createdAt,
                updatedAt=dataset.updatedAt,
                is_active=dataset.is_active,
                date_of_collection=dataset.date_of_collection,
                location_of_collection=dataset.location_of_collection
            )