from typing import Union, List
from fastapi import FastAPI
from backend.src.services.user_service import UserService
from backend.src.models.user import UserDto, User
from backend.src.router.user_router import router as user_router


user_service = UserService()

app = FastAPI()


app.include_router(user_router, prefix="/user", tags=["user"])


@app.get("/")
def read_root():
    return {"Hello": "Welcome tot Python FastAPI World"}

@app.get("/all-users", response_model=List[UserDto])
async def get_all_users():
    users = await user_service.get_all_users()
    return users

@app.get("/user/{user_id}", response_model=UserDto)
async def get_user(user_id: str):
    user = await user_service.get_user(user_id)
    return user
