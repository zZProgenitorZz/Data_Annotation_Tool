

# annotation update for guest
"""
def update_image_annotations(self, guest_id: str, image_id: str, updated_data: dict) -> bool:
     
        session = self._get_session(guest_id)
        
        for ann_id, ann in session["annotations"].items():
            if ann.get("imageId") == image_id:
                ann.update(updated_data)
                return True
        
        return False
"""

  # Update image annotations repository by image/document id
"""
    async def update_image_annotations(self, image_id: str, updated_data: dict) -> bool:
        result = await self.collection.update_one(
            {"imageId": str(image_id)},
            {"$set": updated_data}
        )
        return result.modified_count > 0
    
"""

# Update annotations service of a image
"""
    async def update_image_annotations(self, image_id: str, updated_data: ImageAnnotations, current_user: UserDto | None = None) -> bool:
        if not updated_data.annotations:
            raise ValidationError("Annotations list cannot be empty when updating")

        update_dict = updated_data.model_dump(exclude_unset=True)
        update_dict.pop("id", None)

        succes = await self.repo.update_image_annotations(image_id, update_dict)
        if not succes:
            raise NotFoundError(f"No image annotations found for imageId: {image_id}")
        return succes
"""


# Update annotations router of an image
"""
@router.put("/{image_id}", response_model=bool)
async def update_image_annotations(image_id: str, updated_data: ImageAnnotations, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            success = guest_session_service.update_image_annotations(current_user.id, image_id, updated_data.dict())
            if not success:
                raise NotFoundError(f"Annotations for image {image_id} not found")
            return success
        return await annotation_service.update_image_annotations(image_id, updated_data, current_user)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

 """

 # Get image annotations repo by imageId
"""
    async def get_image_annotations_by_imageId(self, image_id: str) -> ImageAnnotations:
        doc = await self.collection.find_one({"imageId": str(image_id)})
        if not doc:
            return None
        return ImageAnnotations(**doc)
"""

 # Get ImageAnnotations service object by image ID
"""
    async def get_image_annotations_by_imageId(self, image_id: str, current_user: UserDto | None = None) -> ImageAnnotationsDto:
        
        image_annotations: ImageAnnotations = await self.repo.get_image_annotations_by_imageId(image_id)
        if not image_annotations:
             raise NotFoundError(f"Annotations with imageId:{image_id} not found")

        # change to dto
        return self.to_dto(image_annotations)

"""


# Get full ImageAnnotations document for one image
"""
@router.get("/{image_id}", response_model=ImageAnnotationsDto)
async def get_image_annotations_by_imageId(image_id: str, current_user: UserDto = Depends(require_roles(["admin", "reviewer", "annotator"]))):
    try:
        if is_guest_user(current_user):
            ann = guest_session_service.get_image_annotations_by_imageId(current_user.id, image_id)
            if not ann:
                raise NotFoundError(f"Annotations for image {image_id} not found")
            return ann
        return await annotation_service.get_image_annotations_by_imageId(image_id, current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

"""