from typing import Union, List
from fastapi import FastAPI
from backend.src.services.user_service import UserService
from backend.src.models.user import UserDto, User



user_service = UserService()

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "Welcome tot Python FastAPI World"}

@app.get("/users", response_model=List[UserDto])
async def get_all_users():
    users = await user_service.get_all_users()
    return users

@app.get("/users/{user_id}", response_model=UserDto)
async def get_user(user_id: str):
    user = await user_service.get_user(user_id)
    return user
