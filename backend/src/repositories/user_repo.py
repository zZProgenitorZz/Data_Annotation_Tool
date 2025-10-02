
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
    async def create_user(self, user: User) -> str:
        user_dict = user.model_dump()
        user_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        result = await self.collection.insert_one(user_dict)
        return str(result.inserted_id)


    # Delete a user by id
    async def delete_user(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(user_id)})
        return result.deleted_count == 1

    # Update a user by id
    async def update_user(self, user_id: str, updated_user: UserUpdate) -> bool:
        user = await self.collection.find_one({"_id" : PyObjectId(user_id)})
        if user:
            updated_data = updated_user.model_dump(exclude_unset=True)
            if "id" in updated_data:
                updated_data.pop("id")  # Remove id if present, we don't update the _id field
            result = await self.collection.update_one({"_id": PyObjectId(user_id)}, {"$set": updated_data})

            
            return result.modified_count > 0
        return False
