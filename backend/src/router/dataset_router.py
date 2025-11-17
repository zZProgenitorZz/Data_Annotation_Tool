from backend.src.services.dataset_service import DatasetService
from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.models.user import UserDto
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from backend.src.helpers.helpers import NotFoundError
from backend.src.helpers.auth_helper import require_roles, is_guest_user
from backend.src.services.guest_session_service import guest_session_service


router = APIRouter()

dataset_service = DatasetService()



# Create dataset
@router.post("/create", response_model=str)
async def create_dataset(dataset: Dataset, current_user: UserDto = Depends(require_roles(["admin","user"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.create_dataset(current_user.id, dataset)
        return await dataset_service.create_dataset(dataset, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all datasets
@router.get("/all-datasets", response_model=List[DatasetDto])
async def get_all_datasets(current_user: UserDto = Depends(require_roles(["admin","user"]))):
    if is_guest_user(current_user):
        return list(guest_session_service._get_session(current_user.id)["datasets"].values())
    return await dataset_service.get_all_datasets(current_user)


# Get dataset by ID
@router.get("/{dataset_id}", response_model=DatasetDto)
async def get_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin","user"]))):
    try:
        if is_guest_user(current_user):
            dataset = guest_session_service.get_dataset(current_user.id, dataset_id)
            if not dataset:
                raise NotFoundError(f"Dataset {dataset_id} not found")
            return dataset
        return await dataset_service.get_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    




# Update dataset
@router.put("/update/{dataset_id}", response_model=bool)
async def update_dataset(dataset_id: str, dataset_update: DatasetUpdate, current_user: UserDto = Depends(require_roles(["admin","user"]))):
    try:
        if is_guest_user(current_user):
            success = guest_session_service.update_dataset(current_user.id, dataset_id, dataset_update)
            if not success:
                raise NotFoundError(f"Dataset {dataset_id} not found")
            return success
        return await dataset_service.update_dataset(dataset_id, dataset_update, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))



# Soft delete dataset for user and hard delete for guest
@router.delete("/soft-d/{dataset_id}", response_model=bool)
async def soft_delete_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
    try:
        if is_guest_user(current_user):
            success = guest_session_service.delete_dataset(current_user.id, dataset_id)
            if not success:
                raise NotFoundError(f"Dataset {dataset_id} not found")
            return success
        return await dataset_service.softdelete_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Restore dataset
@router.post("/restore/{dataset_id}", response_model=bool)
async def restore_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
    try:
     
        return await dataset_service.restore_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Hard delete dataset
@router.delete("/hard-d/{dataset_id}", response_model=bool)
async def hard_delete_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
    try:
        
        return await dataset_service.hard_delete_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
