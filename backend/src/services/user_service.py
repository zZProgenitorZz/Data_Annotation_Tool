from backend.src.repositories.user_repo import UserRepo
from passlib.context import CryptContext
from backend.src.models.user import User
from backend.src.services.log_service import LogService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()


    
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    async def create_user(self, user_data: User) -> User:
        hashed_pw = self.hash_password(user_data.password)
        user = User(
            **user_data.model_dump(exclude={"password"}),
            password=hashed_pw
        )

        await self.log.log_action(
            user_id = "Admin",
            action = "REGISTERED",
            target=f"User: {user_data.username}"
        )
        return await self.user_repo.create_user(user)
    
    async def get_user_by_id(self, user_id: str):
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User with user ID: {user_id} not found")
        return user
    

    