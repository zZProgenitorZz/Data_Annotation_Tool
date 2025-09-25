from backend.src.repositories.user_repo import UserRepo
from passlib.context import CryptContext
from backend.src.models.user import User
from backend.src.services.log_service import LogService

from datetime import datetime, timezone, timedelta
from typing import Annotated
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext


# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "4c4a026a8eed56c5b71112a2ba6fc9218a163a5ce6c3c915e2a41d1c4c9741a5"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()


    
    
    