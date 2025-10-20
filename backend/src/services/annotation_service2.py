from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.repositories.annotation_repo2 import ImageAnnotationsRepo
from backend.src.helpers.helpers import NotFoundError, ValidationError
from typing import List
from backend.src.models.user import UserDto


class ImageAnnotationsService:
    def __init__(self):
        self.repo = ImageAnnotationsRepo()

   
    # Get annotations of one image
    async def get_annotations_for_image(self, image_id: str, current_user: UserDto | None = None) -> List[AnnotationDto]:
        annotations = await self.repo.get_annotations_for_image(image_id)
        if not annotations:
            raise NotFoundError(f"No annotations found for imageId: {image_id}")
        annotations_dto = [
            AnnotationDto(
                id=str(a.id),
                label=str(a.label),
                type=a.type,
                geometry=a.geometry
            )
            for a in annotations
]
        return annotations_dto

    # Get all ImageAnnotations documents
    async def get_all_image_annotations(self, current_user: UserDto | None = None) -> List[ImageAnnotationsDto]:
        all_annotations = await self.repo.get_all_image_annotations()
        if not all_annotations:
            raise NotFoundError("No image annotations found in the database")
        
        all_annotations_dto = [
            self.to_dto(image_ann)
            for image_ann in all_annotations
        ]

        return all_annotations_dto

    # Delete all annotations of a image
    async def delete_image_annotations(self, image_id: str, current_user: UserDto | None = None):
        succes = await self.repo.delete_image_annotations(image_id)
        if not succes:
            raise NotFoundError(f"Annotations with imageId:{image_id} not found")
        return succes

    # Delete a sigle annotation from image
    async def delete_single_annotation(self, iamge_id: str, annotation_id: str, current_user: UserDto | None = None) -> bool:
        succes = await self.repo.delete_single_annotation(iamge_id, annotation_id)
        if not succes:
            raise NotFoundError(f"Annotation with id:{annotation_id} not found in imageId:{iamge_id}")
        return succes

    # Create image annotations
    async def create_image_annotations(self, image_id: str, image_annotations: ImageAnnotations, current_user: UserDto | None = None) -> str:
        # ValidationError
        if not image_id:
            raise ValidationError("imageId is required")

        if not image_annotations.annotations or len(image_annotations.annotations) == 0:
            raise ValidationError("At least one annotation must be present")
        
        doc = image_annotations.model_dump()
        doc.pop("id", None)  # MongoDB maakt _id aan
        doc["imageId"] = image_id
        inserted_id = await self.repo.create_image_annotations(doc)
        return inserted_id



    async def add_annotation_to_image(self, image_id: str, annotation: Annotation, current_user: UserDto | None = None) -> bool:
        if not annotation.label or not annotation.type:
            raise ValidationError("Annotation must have label and type")

        annotation_dict = annotation.model_dump()
        annotation_dict["id"] = str(annotation.id)  # Zorg dat ID altijd string is

        succes = await self.repo.add_annotation_to_image(image_id, annotation_dict)
        if not succes:
            raise NotFoundError(f"Image with imageId: {image_id} not found")
        return succes

    def to_dto(self, image_annotations: ImageAnnotations) -> ImageAnnotationsDto:
        dto = ImageAnnotationsDto(
            id=str(image_annotations.id),
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
