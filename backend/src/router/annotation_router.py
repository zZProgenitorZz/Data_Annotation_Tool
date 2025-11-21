from backend.src.helpers.auth_helper import require_roles, is_guest_user
from fastapi import APIRouter, HTTPException, Depends
from backend.src.models.user import UserDto
from typing import List
from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.services.annotation_service2 import ImageAnnotationsService
from backend.src.helpers.helpers import NotFoundError, ValidationError
from backend.src.services.guest_session_service import guest_session_service

router = APIRouter()

annotation_service = ImageAnnotationsService()


#Create new image annotations
# @router.post("/", response_model=str)
# async def create_image_annotations(image_id: str, image_annotations: ImageAnnotations, current_user: UserDto = Depends(require_roles(["admin","user"]))):
#     try:
#         if is_guest_user(current_user):
#             return guest_session_service.create_image_annotations(current_user.id, image_id, image_annotations)
#         return await annotation_service.create_image_annotations(image_id, image_annotations, current_user)
#     except ValidationError as e:
#         raise HTTPException(status_code=422, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))


# # Get all image annotations
# @router.get("/all-image", response_model=List[ImageAnnotationsDto])
# async def get_all_image_annotations(current_user: UserDto = Depends(require_roles(["admin", "user"]))):
#     try:

#         return await annotation_service.get_all_image_annotations(current_user)
#     except NotFoundError as e:
#         raise HTTPException(status_code=404, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))



# Get image annotation
@router.get("/{image_id}/image-annotation", response_model=ImageAnnotationsDto)
async def get_image_annotation(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.get_image_annotation(current_user.id, image_id)
        return await annotation_service.get_image_annotation(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Update image annotation
@router.put("/{image_id}/image-annotation", response_model=bool)
async def update_image_annotation(image_id: str, updated_data: ImageAnnotations,  current_user: UserDto = Depends(require_roles(["admin", "user"]))):
    try:
        if is_guest_user(current_user):
            return guest_session_service.update_image_annotation(current_user.id, image_id, updated_data)
        return await annotation_service.update_image_annotation(image_id, updated_data, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# # Add a single annotation to an image
# @router.post("/{image_id}/add", response_model=bool)
# async def add_annotation_to_image(image_id: str, annotation: Annotation, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
#     try:
#         return await annotation_service.add_annotation_to_image(image_id, annotation, current_user)
#     except ValidationError as e:
#         raise HTTPException(status_code=422, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))




# # Delete a single annotation from an image
# @router.delete("/{image_id}/{annotation_id}", response_model=bool)
# async def delete_single_annotation(image_id: str, annotation_id: str, current_user: UserDto = Depends(require_roles(["admin", "user"]))):
#     try:
#         if is_guest_user(current_user):
#             return guest_session_service.delete_single_annotation(current_user.id, image_id, annotation_id)
#         return await annotation_service.delete_single_annotation(image_id, annotation_id, current_user)
#     except NotFoundError as e:
#         raise HTTPException(status_code=404, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))


# Delete all annotations for a given image
# @router.delete("/{image_id}", response_model=bool)
# async def delete_image_annotations(image_id: str, current_user: UserDto = Depends(require_roles(["user", "admin"]))):
#     try:
#         if is_guest_user(current_user):
#             return guest_session_service.delete_image_annotations(current_user.id, image_id)
#         return await annotation_service.delete_image_annotations(image_id, current_user)
#     except NotFoundError as e:
#         raise HTTPException(status_code=404, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))
