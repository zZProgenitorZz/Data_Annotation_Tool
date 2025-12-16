from typing import Union, List
from fastapi import FastAPI
from backend.src.services.user_service import UserService
from backend.src.models.user import UserDto, User
from backend.src.router.user_router import router as user_router
from backend.src.router.dataset_router import router as dataset_router
from backend.src.router.image_router import router as image_router
from backend.src.router.label_router import router as label_router
from backend.src.router.annotation_router import router as annnotation_router
from backend.src.router.remark_router import router as remark_router
from fastapi.middleware.cors import CORSMiddleware
from backend.src.router.guest_router import router as guest_router
from backend.src.router.log_router import router as log_router



app = FastAPI()



origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(guest_router, prefix="/guest",tags=["guest"])

app.include_router(user_router, prefix="/user", tags=["user"])

app.include_router(dataset_router, prefix="/dataset", tags=["dataset"])

app.include_router(image_router, prefix="/image", tags=["image"])

app.include_router(label_router, prefix="/label", tags=["label"])

app.include_router(annnotation_router, prefix="/annotation", tags=["annotation"])

app.include_router(remark_router, prefix="/remark", tags=["remark"])

app.include_router(log_router, prefix="/log", tags=["log"])

@app.get("/")
def read_root():
    return {"Hello": "Welcome tot Python FastAPI World"}
