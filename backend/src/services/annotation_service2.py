from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.repositories.annotation_repo2 import ImageAnnotationsRepo
from backend.src.helpers.helpers import NotFoundError, ValidationError
from typing import List
from backend.src.models.user import UserDto


class ImageAnnotationsService:
    def __init__(self):
        self.repo = ImageAnnotationsRepo()

   

    # Get image annotation
    async def get_image_annotation(self, image_id: str, current_user: UserDto | None = None) -> ImageAnnotationsDto:
        annotation = await self.repo.get_image_annotation(image_id)
        if not annotation:
            raise NotFoundError(f"No image annotaton found in database for imageId: {image_id}") 
        
        return self.to_dto(annotation)
    
     # Update image annotation
    
    
    async def update_image_annotation(self, image_id: str, updated_image_annotation: ImageAnnotations, current_user: UserDto | None = None) -> bool:
        updated_data = updated_image_annotation.model_dump(exclude_unset=True, )
        updated_data.pop("id", None)
        
       
        image_annotation = await self.repo.update_image_annotation(image_id, updated_data)
        if not image_annotation:
            raise NotFoundError(f"Image annotation with id {image_id} not found")
        
        return image_annotation
        

    # # Get all ImageAnnotations documents
    # async def get_all_image_annotations(self, current_user: UserDto | None = None) -> List[ImageAnnotationsDto]:
    #     all_annotations = await self.repo.get_all_image_annotations()
    #     if not all_annotations:
    #         raise NotFoundError("No image annotations found in the database")
        
    #     all_annotations_dto = [
    #         self.to_dto(image_ann)
    #         for image_ann in all_annotations
    #     ]

    #     return all_annotations_dto

    # Delete all annotations of a image
    async def delete_image_annotations(self, image_id: str, current_user: UserDto | None = None):
        succes = await self.repo.delete_image_annotations(image_id)
        if not succes:
            raise NotFoundError(f"Annotations with imageId:{image_id} not found")
        return succes

    # # Delete a sigle annotation from image
    # async def delete_single_annotation(self, iamge_id: str, annotation_id: str, current_user: UserDto | None = None) -> bool:
    #     succes = await self.repo.delete_single_annotation(iamge_id, annotation_id)
    #     if not succes:
    #         raise NotFoundError(f"Annotation with id:{annotation_id} not found in imageId:{iamge_id}")
    #     return succes

    # Create image annotations
    async def create_image_annotations(self, image_id: str, image_annotations: ImageAnnotations, current_user: UserDto | None = None) -> str:
        # ValidationError
        if not image_id:
            raise ValidationError("imageId is required")
        
        doc = image_annotations.model_dump()
        doc.pop("id", None)  # MongoDB maakt _id aan
        inserted_id = await self.repo.create_image_annotations(doc)
        return inserted_id



    # async def add_annotation_to_image(self, image_id: str, annotation: Annotation, current_user: UserDto | None = None) -> bool:
    #     if not annotation.label or not annotation.type:
    #         raise ValidationError("Annotation must have label and type")

    #     annotation_dict = annotation.model_dump()
    #     annotation_dict["id"] = str(annotation.id)  # Zorg dat ID altijd string is

    #     succes = await self.repo.add_annotation_to_image(image_id, annotation_dict)
    #     if not succes:
    #         raise NotFoundError(f"Image with imageId: {image_id} not found")
    #     return succes

    def to_dto(self, image_annotations: ImageAnnotations) -> ImageAnnotationsDto:
        dto = ImageAnnotationsDto(
            id=str(image_annotations.id),
            for_remark= image_annotations.for_remark,
            imageId=str(image_annotations.imageId),
            annotations=[
                AnnotationDto(**a.model_dump()) for a in image_annotations.annotations
            ]
        )

        # Convert annotation IDs to strings (optional, for MongoDB consistency)
        for ann in dto.annotations:
            if ann.id:
                ann.id = str(ann.id)

        return dto
