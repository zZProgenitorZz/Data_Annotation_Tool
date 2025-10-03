from backend.src.services.dataset_service import DatasetService
from backend.src.services.user_service import UserService
from backend.src.models.dataset import Dataset, DatasetUpdate, DatasetDto
from backend.src.models.user import UserDto
from typing import Annotated, List
from fastapi import APIRouter, Depends, status, HTTPException
from datetime import datetime
from backend.src.helpers.helpers import NotFoundError



router = APIRouter()



dataset_service = DatasetService()
user_service = UserService()

#Dependency voor role-check
def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: UserDto = Depends(user_service.get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user
    return role_checker


# Create dataset
@router.post("/create", response_model=str)
async def create_dataset(dataset: Dataset, current_user: UserDto = Depends(user_service.get_current_active_user)):
    try:
        return await dataset_service.create_dataset(dataset, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Get all datasets
@router.get("/all-datasets", response_model=List[DatasetDto])
async def get_all_datasets():
    return await dataset_service.get_all_datasets()

# Get dataset by ID
@router.get("/{dataset_id}", response_model=DatasetDto)
async def get_dataset(dataset_id: str):
    try:
        return await dataset_service.get_dataset(dataset_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Update dataset
@router.put("/update/{dataset_id}", response_model=bool)
async def update_dataset(dataset_id: str, dataset_update: DatasetUpdate, current_user: UserDto = Depends(user_service.get_current_active_user)):
    try:
        return await dataset_service.update_dataset(dataset_id, dataset_update, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Soft delete
@router.delete("/soft-d/{dataset_id}", response_model=bool)
async def soft_delete_dataset(dataset_id: str, current_user: UserDto = Depends(user_service.get_current_active_user)):
    try:
        return await dataset_service.softdelete_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Restore dataset
@router.post("/restore/{dataset_id}", response_model=bool)
async def restore_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await dataset_service.restore_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Hard delete
@router.delete("/hard-d/{dataset_id}", response_model=bool)
async def hard_delete_dataset(dataset_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer"]))):
    try:
        return await dataset_service.hard_delete_dataset(dataset_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

