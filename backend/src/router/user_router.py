from fastapi import APIRouter, Depends, status, HTTPException
from backend.src.services.user_service import UserLogin, ACCESS_TOKEN_EXPIRE_MINUTES, UserService
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated, List
from backend.src.models.user import Token, User, UserDto, UserUpdate
from backend.src.helpers.auth_helper import require_roles
from datetime import timedelta



router = APIRouter()

user_login = UserLogin()
user_service = UserService()

@router.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = await user_login.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = user_login.create_access_token(
        data={"sub": user.id, "role": user.role}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me/", response_model=UserDto)
async def read_users_me(
    current_user: UserDto = Depends(user_login.get_current_active_user)
):
    return current_user

@router.get("/all-users", response_model=List[UserDto])
async def get_all_users():
    users = await user_login.get_all_users()
    return users

@router.get("/{user_id}", response_model=UserDto)
async def get_user(user_id: str):
    user = await user_login.get_user(user_id)
    return user

# Create user
@router.post("/", response_model=str)
async def create_user(user: User, current_user: UserDto = Depends(require_roles(["admin"]))):
    try:
        return await user_service.create_user(user, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Update user
@router.put("/{user_id}", response_model=bool)
async def update_user(user_id: str, updated_user: UserUpdate, current_user: UserDto = Depends(require_roles(["admin","user"]))):
    try:
        return await user_service.update_user(user_id, updated_user, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Delete user
@router.delete("/{user_id}", response_model=bool)
async def delete_user(user_id: str, current_user: UserDto = Depends(require_roles(["admin"]))):
    try:
        return await user_service.delete_user(user_id, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))