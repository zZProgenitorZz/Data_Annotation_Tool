from fastapi import APIRouter, Depends, HTTPException, status
from backend.src.models.label import Label, LabelUpdate, LabelDto
from backend.src.services.label_service import LabelService
from backend.src.helpers.helpers import NotFoundError
from backend.src.models.user import UserDto
from backend.src.helpers.auth_helper import require_roles, is_guest_user
from backend.src.services.guest_session_service import guest_session_service

router = APIRouter()
label_service = LabelService()


# Create a new label
@router.post("/create", response_model=str, status_code=status.HTTP_201_CREATED)
async def create_label(dataset_id: str, label: Label, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.create_label(dataset_id, current_user.id, label)
        return await label_service.create_label(dataset_id, label, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all labels
@router.get("/all-labels", response_model=list[LabelDto])
async def get_all_labels(current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.get_all_labels(current_user.id)
        return await label_service.get_all_labels(current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get label by ID
@router.get("/{label_id}", response_model=LabelDto)
async def get_label_by_id(label_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            label = guest_session_service.get_label_by_id(current_user.id, label_id)
            if not label:
                raise NotFoundError(f"Label {label_id} not found")
            return label
        return await label_service.get_label_by_id(label_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update a label by ID
@router.put("/{label_id}", response_model=bool)
async def update_label(label_id: str, updated_label: LabelUpdate, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            success = guest_session_service.update_label(current_user.id, label_id, updated_label)
            if not success:
                raise NotFoundError(f"Label {label_id} not found")
            return success
        return await label_service.update_label(label_id, updated_label, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Delete a label by ID
@router.delete("/{label_id}", response_model=bool)
async def delete_label(label_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            success = guest_session_service.delete_label(current_user.id, label_id)
            if not success:
                raise NotFoundError(f"Label {label_id} not found")
            return success
        return await label_service.delete_label(label_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
