# backend/src/router/remark_router.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from backend.src.models.user import UserDto
from backend.src.models.remark import Remark, RemarkDTO, RemarkUpdate
from backend.src.services.remark_service import RemarkService
from backend.src.helpers.helpers import NotFoundError, ValidationError
from backend.src.helpers.auth_helper import require_roles
router = APIRouter()

remark_service = RemarkService()


# Create a new remark
@router.post("/", response_model=str)
async def create_remark(remark: Remark, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await remark_service.create_remark(remark, current_user)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all remarks
@router.get("/all-remark", response_model=List[RemarkDTO])
async def get_all_remarks(current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await remark_service.get_all_remarks(current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get a single remark by ID
@router.get("/{remark_id}", response_model=RemarkDTO)
async def get_remark_by_id(remark_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await remark_service.get_remark_by_id(remark_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update a remark
@router.put("/{remark_id}", response_model=bool)
async def update_remark(remark_id: str, updated_remark: RemarkUpdate, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await remark_service.update_remark(remark_id, updated_remark, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Delete a remark
@router.delete("/{remark_id}", response_model=bool)
async def delete_remark(remark_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        return await remark_service.delete_remark(remark_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
