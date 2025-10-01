from backend.src.models.annotation2 import ImageAnnotations, Annotation, ImageAnnotationsDto, AnnotationDto
from backend.src.repositories.annotation_repo2 import ImageAnnotationsRepo
from backend.src.helpers.objectid_helper import PyObjectId

class ImageAnnotationsService:
    def __init__(self, repo):
        self.repo = ImageAnnotationsRepo()

    async def get_image_annotations_dto_by_id(self, image_id: str) -> ImageAnnotationsDto:
        # Haal ImageAnnotations object op
        image_annotations: ImageAnnotations = await self.repo.get_image_annotations_by_id(image_id)
        if not image_annotations:
            return None

        # Zet om naar DTO
        return self._to_dto(image_annotations)

    def _to_dto(self, image_annotations: ImageAnnotations) -> ImageAnnotationsDto:
        dto = ImageAnnotationsDto(
            id=str(image_annotations.id),
            image=str(image_annotations.imageId) if image_annotations.imageId else None,
            annotations=image_annotations.annotations
        )

        # Zet annotation labels en ids om naar string
        for ann in dto.annotations:
            if ann.labelId:
                ann.labelId = str(ann.labelId)
            if ann.id:
                ann.id = str(ann.id)

        return dto
