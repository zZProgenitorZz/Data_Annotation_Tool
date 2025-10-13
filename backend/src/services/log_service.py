from datetime import datetime, timezone
from backend.src.repositories.log_repo import LogRepository
from backend.src.models.log import Log
from backend.src.models.user import UserDto

class LogService:
    def __init__(self):
        self.log_repo = LogRepository()


    async def log_action(self, user_id: str, action: str, target: str, details: dict = None) -> str:

        log = Log(
            user_id = user_id,
            action = action,
            target = target,
            details= details or {}
        )
        return await self.log_repo.create_log(log)
    
    async def get_log(self, log_id: str) -> Log:
        return await self.log_repo.get_log_by_id(log_id)

    async def get_logs(self, current_user: UserDto | None = None) -> list[Log]:
        return await self.log_repo.get_all_logs()

    async def delete_log(self, log_id: str) -> bool:
        return await self.log_repo.delete_log(log_id)