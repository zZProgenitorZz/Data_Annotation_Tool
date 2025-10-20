from fastapi import APIRouter, Depends, HTTPException, status
from backend.src.models.user import Token, UserDto
from backend.src.services.user_service import UserLogin, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from backend.src.services.guest_session_service import get_guest_user
import uuid

router = APIRouter()

user_login = UserLogin()

@router.post("/guest-login")
async def guest_login() -> Token:
    """
    Create a guest session token without database persistence.
    Each guest gets a unique session ID.
    """
    # Generate unique guest 
    guest_user = get_guest_user()
    
    # Create access token with guest flag
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = user_login.create_access_token(
        data={
            "sub": guest_user.id,
            "role": guest_user.role,
            "is_guest": True
        },
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserDto)
async def get_guest_info(
    current_user: UserDto = Depends(user_login.get_guest_user_from_token)
):
    """
    Get current guest user information.
    """
    if not getattr(current_user, 'is_guest', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only for guest users"
        )
        
    return current_user