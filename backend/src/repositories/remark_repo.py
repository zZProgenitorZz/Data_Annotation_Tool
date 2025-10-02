from backend.src.helpers.helpers import PyObjectId
from backend.src.models.remark import Remark, RemarkUpdate
from backend.src.db.connection import db

class RemarkRepo:
    def __init__(self):
        self.collection = db["remarks"]

    async def get_remark_by_id(self, remark_id: str) -> Remark:
        doc = await self.collection.find_one({"_id": PyObjectId(remark_id)})
        if not doc:
            return None
        return Remark(**doc)

    async def get_all_remarks(self) -> list[Remark]:
        cursor = self.collection.find()
        results = []
        async for doc in cursor:
            results.append(Remark(**doc))
        return results

    async def create_remark(self, remark: Remark) -> str:
        doc = remark.model_dump()
        doc.pop("id", None)
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def delete_remark(self, remark_id: str) -> bool:
        result = await self.collection.delete_one({"_id": PyObjectId(remark_id)})
        return result.deleted_count > 0

    async def update_remark(self, remark_id: str, updated_remark: RemarkUpdate) -> bool:
        doc = updated_remark.model_dump(exclude_unset=True)
        doc.pop("id", None)
        result = await self.collection.update_one(
            {"_id": PyObjectId(remark_id)},
            {"$set": doc}
        )
        return result.modified_count > 0
