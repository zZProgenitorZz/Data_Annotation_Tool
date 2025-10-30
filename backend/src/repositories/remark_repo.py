from backend.src.helpers.helpers import PyObjectId
from backend.src.models.remark import Remark
from backend.core.db import db

class RemarkRepo:
    def __init__(self):
        self.collection = db["remark"]

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

    async def create_remark(self, remark: dict) -> str:
        result = await self.collection.insert_one(remark)
        return str(result.inserted_id)

    async def delete_remark(self, remark_id: str) -> bool:
        result = await self.collection.delete_one({"_id": PyObjectId(remark_id)})
        return result.deleted_count > 0

    async def update_remark(self, remark_id: str, updated_remark: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": PyObjectId(remark_id)},
            {"$set": updated_remark}
        )
        return result.modified_count > 0
