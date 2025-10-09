from typing import List
from backend.src.repositories.remark_repo import RemarkRepo
from backend.src.models.remark import Remark, RemarkDTO, RemarkUpdate
from backend.src.helpers.helpers import NotFoundError, ValidationError

class RemarkService:
    def __init__(self):
        self.repo = RemarkRepo()

    # Haal één remark op
    async def get_remark_by_id(self, remark_id: str) -> RemarkDTO:
        remark = await self.repo.get_remark_by_id(remark_id)
        if not remark:
            raise NotFoundError(f"Remark with id {remark_id} not found")
        return self._to_dto(remark)

    # Haal alle remarks op
    async def get_all_remarks(self) -> List[RemarkDTO]:
        remarks = await self.repo.get_all_remarks()
        if not remarks:
            raise NotFoundError("No remarks found in the database")
        return [self._to_dto(r) for r in remarks]

    # Creëer een nieuwe remark
    async def create_remark(self, remark: Remark) -> str:
        if not remark.message:
            raise ValidationError("Remark message is required")
        doc = remark.model_dump()
        doc.pop("id", None)
        return await self.repo.create_remark(doc)

    # Delete remark
    async def delete_remark(self, remark_id: str) -> bool:
        succes = await self.repo.delete_remark(remark_id)
        if not succes:
            raise NotFoundError(f"Remark with id {remark_id} not found")
        return succes

    # Update remark
    async def update_remark(self, remark_id: str, updated_remark: RemarkUpdate) -> bool:
        doc = updated_remark.model_dump(exclude_unset=True)
        doc.pop("id", None)
        succes = await self.repo.update_remark(remark_id, doc)
        if not succes:
            raise NotFoundError(f"Remark with id {remark_id} not found")
        return succes

    # Helper: Remark -> RemarkDTO
    def _to_dto(self, remark: Remark) -> RemarkDTO:
        return RemarkDTO(
            id=str(remark.id),
            annotation_id=str(remark.annotation_id) if remark.annotation_id else None,
            image_id=str(remark.image_id) if remark.image_id else None,
            from_user=str(remark.from_user) if remark.from_user else None,
            to_users=[str(u) for u in remark.to_users] if remark.to_users else None,
            message=remark.message,
            status=remark.status,
            reply=remark.reply
        )
