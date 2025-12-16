from fastapi import APIRouter, Depends, HTTPException, status
from backend.src.helpers.helpers import NotFoundError
from backend.src.helpers.auth_helper import require_roles, is_guest_user
from backend.src.services.log_service import LogService
from backend.src.models.log import Log, LogDto



router = APIRouter()

log_service = LogService()


# Get all logs
@router.get("/all-logs", response_model=list[LogDto])
async def get_all_logs(current_user=Depends(require_roles(["admin"]))):
    try:
        return await log_service.get_logs(current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))