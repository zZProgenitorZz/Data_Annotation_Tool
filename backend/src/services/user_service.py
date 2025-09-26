from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import User, UserUpdate, Token, TokenData, UserDto
from backend.src.services.log_service import LogService

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class UserService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()

    def verify_password(self, plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password):
        return pwd_context.hash(password)
    
    async def get_user(self, user_id: str):
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            return None  

        user_dto = UserDto(
            id=str(user.id),  # ObjectId → string
            username=user.username,
            email=user.email,
            hashed_password=user.hashed_password,
            role=user.role,
            disabled=user.disabled
        )
        return user_dto
        
    
    async def authenticate_user(self ,username_or_email: str, password: str):
        user = await self.user_repo.get_user_by_username_or_email(username_or_email)
        if not user:
            return False
        if not self.verify_password(password, user.hashed_password):
            return False
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def get_current_user(self, token: Annotated[str, Depends(oauth2_scheme)]):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")  
            if user_id is None:
                raise credentials_exception
        except InvalidTokenError:
            raise credentials_exception

        user = await self.get_user(user_id) 
        if user is None:
            raise credentials_exception
        return user
        
        
    async def get_current_active_user(
        current_user: Annotated[User, Depends(get_current_user)],
    ):
        if current_user.disabled:
            raise HTTPException(status_code=400, detail="Inactive user")
        return current_user
    
    async def get_all_users(self):
        users = await self.user_repo.get_all_users()
        users_dto = []
        for user in users:
            users_dto.append(
                UserDto(
                    id = str(user.id),
                    username= user.username,
                    email= user.email,
                    hashed_password=user.hashed_password,
                    role= user.role,
                    disabled= user.disabled
                )
            )
        return users_dto




        
    