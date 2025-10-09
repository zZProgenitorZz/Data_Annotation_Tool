from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.repositories.annotation_repo2 import ImageAnnotationsRepo
from backend.src.helpers.helpers import NotFoundError, ValidationError
from typing import List


class ImageAnnotationsService:
    def __init__(self):
        self.repo = ImageAnnotationsRepo()

    # Get ImageAnnotations object by image ID
    async def get_image_annotations_by_imageId(self, image_id: str) -> ImageAnnotationsDto:
        
        image_annotations: ImageAnnotations = await self.repo.get_image_annotations_by_imageId(image_id)
        if not image_annotations:
             raise NotFoundError(f"Annotations with imageId:{image_id} not found")

        # change to dto
        return self.to_dto(image_annotations)

    # Get annotations of one image
    async def get_annotations_for_image(self, image_id: str) -> List[AnnotationDto]:
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
    async def get_all_image_annotations(self) -> List[ImageAnnotationsDto]:
        all_annotations = await self.repo.get_all_image_annotations()
        if not all_annotations:
            raise NotFoundError("No image annotations found in the database")
        
        all_annotations_dto = [
            self.to_dto(image_ann)
            for image_ann in all_annotations
        ]

        return all_annotations_dto

    # Delete all annotations of a image
    async def delete_image_annotations(self, image_id: str):
        succes = await self.repo.delete_image_annotations(image_id)
        if not succes:
            raise NotFoundError(f"Annotations with imageId:{image_id} not found")
        return succes

    # Create image annotations
    async def create_image_annotations(self, image_annotations: ImageAnnotations) -> str:
        # ValidationError
        if not image_annotations.imageId:
            raise ValidationError("imageId is required")

        if not image_annotations.annotations or len(image_annotations.annotations) == 0:
            raise ValidationError("At least one annotation must be present")
        
        doc = image_annotations.model_dump()
        doc.pop("id", None)  # MongoDB maakt _id aan
        inserted_id = await self.repo.create_image_annotations(doc)
        return inserted_id

# Update annotations of a image
    async def update_image_annotations(self, image_id: str, updated_data: ImageAnnotations) -> bool:
        if not updated_data.annotations:
            raise ValidationError("Annotations list cannot be empty when updating")

        update_dict = updated_data.model_dump(exclude_unset=True)
        update_dict.pop("id", None)

        succes = await self.repo.update_image_annotations(image_id, update_dict)
        if not succes:
            raise NotFoundError(f"No image annotations found for imageId: {image_id}")
        return succes

    async def add_annotation_to_image(self, image_id: str, annotation: Annotation) -> bool:
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
            annotations=image_annotations.annotations
        )

        # Zet annotation labels en ids om naar string
        for ann in dto.annotations:
            if ann.id:
                ann.id = str(ann.id)

        return dto
