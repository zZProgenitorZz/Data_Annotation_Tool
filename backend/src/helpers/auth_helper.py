from backend.src.services.user_service import UserService
from backend.src.models.user import UserDto
from typing import List
from fastapi import Depends, status, HTTPException


user_service = UserService()

#Dependency voor role-check
def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: UserDto = Depends(user_service.get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user
    return role_checker
