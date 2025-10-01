from backend.src.repositories.label_repo import LabelRepo
from backend.src.models.label import Label, LabelDto, LabelUpdate
from fastapi import HTTPException, status
from typing import List

class LabelService:
    def __init___(self):
        self.label_repo = LabelRepo()

    async def create_label(self, label: Label):
        success = await self.label_repo.create_label(label)
        return success 
    
    # Get all labels
    async def get_all_labels(self):
        labels = await self.label_repo.get_all_labels()
        labels_dto = []
        for label in labels:
            labels_dto.append(
                self.to_dto(label)
                )
        return labels_dto
    
    # Get a label by id
    async def get_label_by_id(self, label_id: str) -> LabelDto:
        label = await self.label_repo.get_label_by_id(label_id)
        if not label:
            raise ValueError(f"Label with id {label_id} not found")
        
        label_dto = self.to_dto(label)
        return label_dto
    

    # Delete a label by id
    async def delete_label(self, label_id: str) -> bool:
        success = await self.label_repo.delete_label(label_id)
        if not success:
            raise ValueError(f"Label with id {label_id} not found")
        
        return success

    # Update a label by id
    async def update_label(self, label_id: str, updated_label: LabelUpdate) -> LabelDto:
        label = await self.label_repo.update_label(label_id, updated_label)
        if not label:
            raise ValueError(f"Label with id {label_id} not found")
        
        # Haal het geüpdatete label terug voor response
        updated_label_obj = await self.label_repo.get_label_by_id(label_id)

        updated_label_obj_dto = self.to_dto(updated_label_obj)
        return updated_label_obj_dto


    def to_dto(self, label: Label) -> LabelDto:
        return LabelDto(
            id=str(label.id),
            datasetId=label.datasetId,
            labelName=label.labelName,
            labelDescription=label.labelDescription
        )
    
