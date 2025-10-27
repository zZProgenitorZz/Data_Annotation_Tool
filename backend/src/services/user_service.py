from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import User, UserUpdate, Token, TokenData, UserDto
from backend.src.services.log_service import LogService
from backend.src.helpers.helpers import NotFoundError
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from backend.src.services.guest_session_service import get_guest_user

# JWT TOKEN
# to get a string like this run: 
# openssl rand -hex 32
SECRET_KEY = "4c4a026a8eed56c5b71112a2ba6fc9218a163a5ce6c3c915e2a41d1c4c9741a5"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/token")
bearer_scheme = HTTPBearer(auto_error=False)

class UserLogin:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()


    #AUTHORIZE
    def verify_password(self, plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)
    
    #AUTHORIZE
    def get_password_hash(self, password):
        return pwd_context.hash(password)
    
    #AUTHORIZE/AUTHENTICATION
    async def get_user(self, user_id: str):
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            return None  

        user_dto = self.to_dto(user)
        return user_dto
        
    #AUTHENTICATION
    async def authenticate_user(self ,username_or_email: str, password: str):
        user = await self.user_repo.get_user_by_username_or_email(username_or_email)
        if not user:
            return False
        if not self.verify_password(password, user.hashed_password):
            return False
        user_dto = self.to_dto(user)
        return user_dto
    
    #AUTHENTICATION
    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    #AUTHORIZE
    async def get_current_user(self, token: str):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            is_guest = payload.get("is_guest", False)
            if user_id is None:
                raise credentials_exception
        except InvalidTokenError:
            raise credentials_exception
        
        if is_guest:
            return get_guest_user(user_id)
        

        user = await self.get_user(user_id) 
        if user is None:
            raise credentials_exception
        return user
    
    # AUTHORIZE: Guest route
    async def get_guest_user_from_token(
        self, 
        credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)
    ):
        if not credentials:
            raise HTTPException(status_code=401, detail="No token provided")
        
        token = credentials.credentials
        guest = await self.get_current_user(token)
        
        if not getattr(guest, "is_guest", False):
            raise HTTPException(status_code=403, detail="Not a guest")
        
        return guest

        
    #AUTHORIZE: User route
    async def get_current_active_user(self, token: str = Depends(oauth2_scheme)):
        current_user = await self.get_current_user(token)  # oauth2_scheme wordt automatisch gebruikt
        if current_user.disabled:
            raise HTTPException(status_code=400, detail="Inactive user")
        return current_user
    
    async def get_all_users(self):
        users = await self.user_repo.get_all_users()
        users_dto = []
        for user in users:
            users_dto.append(
                self.to_dto(user)
            )
        return users_dto



     #TO USERDTO    
    def to_dto(self, user: User) -> UserDto:
        return UserDto(
            id=str(user.id),
            username=user.username,
            email=user.email,
            role=user.role,
            disabled=user.disabled,
            is_guest= False
        )
    
class UserService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()
        self.user_login = UserLogin()



    # Create a new user
    async def create_user(self, user: User, current_user: UserDto | None = None) -> str:
        # Hash the password before storing
        user.hashed_password = self.user_login.get_password_hash(user.hashed_password)

        created_user = user.model_dump()
        created_user.pop("id", None)  # Remove id if present, MongoDB will create one

        user_id = await self.user_repo.create_user(created_user)

        # Log the creation action
        if current_user:
            await self.log.log_action(
                user_id=user_id,
                action="CREATED_USER",
                target=user.username,
                details={
                    "created_by": current_user.username
                }
            )

        return user_id
    
    # Update user details
    async def update_user(self, user_id: str, updated_user: UserUpdate, current_user: UserDto | None = None) -> bool:
        updated_user_data = updated_user.model_dump(exclude_unset=True)
        updated_user_data.pop("id", None)  # Remove id if present

        # Get the old user data first
        old_user = await self.user_repo.get_user_by_id(user_id)
        if not old_user:
            raise NotFoundError(f"User with id {user_id} not found")

        # Hash password if updated
        if "hashed_password" in updated_user_data:
            updated_user_data["hashed_password"] = self.user_login.get_password_hash(updated_user_data["hashed_password"])

        # Perform the update
        user = await self.user_repo.update_user(user_id, updated_user_data)
        if not user:
            raise NotFoundError(f"Failed to update user with id {user_id}")

        # Compare old and new fields for logging
        changed_fields = {}
        for key, new_value in updated_user_data.items():
            old_value = getattr(old_user, key, None)
            if old_value != new_value:
                changed_fields[key] = {"old": old_value, "new": new_value}

        # Log the update action
        if current_user:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_USER",
                target=old_user.username,
                details={
                    "changed_fields": changed_fields,
                    "updated_by": current_user.username
                }
            )

        return user
    
    # Delete a user
    async def delete_user(self, user_id: str, current_user: UserDto | None = None) -> bool:
        # Get the user to be deleted for logging
        user_to_delete = await self.user_repo.get_user_by_id(user_id)
        if not user_to_delete:
            raise NotFoundError(f"User with id {user_id} not found")

        succes = await self.user_repo.delete_user(user_id)
        if not succes:
            raise NotFoundError(f"Failed to delete user with id {user_id}")

        # Log the deletion action
        if current_user:
            await self.log.log_action(
                user_id=current_user.id,
                action="DELETED_USER",
                target=user_to_delete.username,
                details={
                    "deleted_by": current_user.username
                }
            )

        return succes
