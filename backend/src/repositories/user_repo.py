
from backend.src.models.user import UserDto, User, UserUpdate
from backend.src.helpers.helpers import PyObjectId
from backend.src.db.connection import db


class UserRepo:
    def __init__(self):
        self.collection = db["user"]

    # Get user by id
    async def get_user_by_id(self, user_id: str) -> User:
        user = await self.collection.find_one({"_id": PyObjectId(user_id)})
        if not user:
            return None

        return User(
            **user
        )
    
    # batch gebruik
    async def get_users_by_ids(self, user_ids: list[str]) -> dict[str, User]:
        object_ids = [PyObjectId(uid) for uid in user_ids]
        cursor = self.collection.find({"_id": {"$in": object_ids}})
        users_list = await cursor.to_list(length=len(object_ids))
        return {str(user["_id"]): User(**user) for user in users_list}


    
    
    async def get_user_by_username_or_email(self, username_or_email: str) -> User | None:
        user = await self.collection.find_one({
            "$or": [
                {"username": username_or_email},
                {"email": username_or_email}
            ]
        })
        if not user:
            return None
        return User(
            **user
        )
        
    

    # Get all users
    async def get_all_users(self) -> list[User]:
        users_cursor = self.collection.find()
        users = []
        if users_cursor:
            async for user in users_cursor:
                users.append(User(
                    **user
                ))
            return users
        return None

    # Create a new user
    async def create_user(self, user: dict) -> str:
        result = await self.collection.insert_one(user)
        return str(result.inserted_id)


    # Delete a user by id
    async def delete_user(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(user_id)})
        return result.deleted_count == 1

    # Update a user by id
    async def update_user(self, user_id: str, updated_user: dict) -> bool:
        result = await self.collection.update_one({"_id": PyObjectId(user_id)}, {"$set": updated_user})    
        return result.modified_count > 0

