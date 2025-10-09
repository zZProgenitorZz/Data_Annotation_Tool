from typing import Union, List
from fastapi import FastAPI
from backend.src.services.user_service import UserService
from backend.src.models.user import UserDto, User
from backend.src.router.user_router import router as user_router
from backend.src.router.dataset_router import router as dataset_router
from backend.src.router.image_router import router as image_router
from backend.src.router.label_router import router as label_router


user_service = UserService()

app = FastAPI()


app.include_router(user_router, prefix="/user", tags=["user"])

app.include_router(dataset_router, prefix="/dataset", tags=["dataset"])

app.include_router(image_router, prefix="/image", tags=["image"])

app.include_router(label_router, prefix="/label", tags=["label"])

@app.get("/")
def read_root():
    return {"Hello": "Welcome tot Python FastAPI World"}
