from backend.src.repositories.label_repo import LabelRepo
from backend.src.models.label import Label, LabelDto, LabelUpdate
from backend.src.helpers.helpers import NotFoundError
from backend.src.models.user import UserDto

class LabelService:
    def __init__(self):
        self.label_repo = LabelRepo()

    async def create_label(self, label: Label, current_user: UserDto | None = None):
        label_dict = label.model_dump()
        label_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        success = await self.label_repo.create_label(label_dict)
        return success 
    
    # Get all labels
    async def get_all_labels(self, current_user: UserDto | None = None) -> list[LabelDto]:
        labels = await self.label_repo.get_all_labels()
        labels_dto = []
        for label in labels:
            labels_dto.append(
                self.to_dto(label)
                )
        return labels_dto
    
    # Get a label by id
    async def get_label_by_id(self, label_id: str, current_user: UserDto | None = None) -> LabelDto:
        label = await self.label_repo.get_label_by_id(label_id)
        if not label:
            raise NotFoundError(f"Label with id {label_id} not found")
        
        label_dto = self.to_dto(label)
        return label_dto
    

    # Delete a label by id
    async def delete_label(self, label_id: str, current_user: UserDto | None = None) -> bool:
        success = await self.label_repo.delete_label(label_id)
        if not success:
            raise NotFoundError(f"Label with id {label_id} not found")
        
        return success

    # Update a label by id
    async def update_label(self, label_id: str, updated_label: LabelUpdate, current_user: UserDto | None = None) -> bool:
        updated_label_data = updated_label.model_dump(exclude_unset=True)
        updated_label_data.pop("id", None)

        label = await self.label_repo.update_label(label_id, updated_label_data)
        if not label:
            raise NotFoundError(f"Label with id {label_id} not found")
        
        return label
        

    def to_dto(self, label: Label) -> LabelDto:
        return LabelDto(
            id=str(label.id),
            datasetId=str(label.datasetId),
            labelName=label.labelName,
            labelDescription=label.labelDescription
        )
    
