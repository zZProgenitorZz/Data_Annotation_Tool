from fastapi import APIRouter, Depends, HTTPException, status
from backend.src.models.label import Label, LabelUpdate, LabelDto
from backend.src.services.label_service import LabelService
from backend.src.helpers.helpers import NotFoundError

router = APIRouter()
label_service = LabelService()


# Create a new label
@router.post("/", response_model=str, status_code=status.HTTP_201_CREATED)
async def create_label(label: Label):
    try:
        return await label_service.create_label(label)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all labels
@router.get("/all-labels", response_model=list[LabelDto])
async def get_all_labels():
    try:
        return await label_service.get_all_labels()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get label by ID
@router.get("/{label_id}", response_model=LabelDto)
async def get_label_by_id(label_id: str):
    try:
        return await label_service.get_label_by_id(label_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update a label by ID
@router.put("/{label_id}", response_model=bool)
async def update_label(label_id: str, updated_label: LabelUpdate):
    try:
        return await label_service.update_label(label_id, updated_label)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Delete a label by ID
@router.delete("/{label_id}", response_model=bool)
async def delete_label(label_id: str):
    try:
        return await label_service.delete_label(label_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
