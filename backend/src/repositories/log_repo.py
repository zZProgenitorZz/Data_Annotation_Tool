from backend.src.models.log import Log
from backend.src.helpers.helpers import PyObjectId
from datetime import datetime, timezone
from backend.core.db import db




class LogRepository:
    def __init__(self):
        self.collection = db["logger"]


    async def create_log(self, log: Log):
        log_dict = log.model_dump()
        log_dict.pop("id", None)
        log_dict["timestamp"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(log_dict)
        return str(result.inserted_id)

    async def get_log_by_id(self, log_id: str):
        log = await self.collection.find_one({"_id": PyObjectId(log_id)})
        if log:
            return Log(**log)
        return None
    
    async def get_all_logs(self) -> list[Log]:
        log_cursor = self.collection.find()
        logs = []
        if log_cursor:
            async for log in log_cursor:
                logs.append(Log(
                    **log
                ))
            return logs
        return None
            
    async def delete_log(self, log_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(log_id)})
        return result.deleted_count > 0
        
    

