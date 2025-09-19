from backend.src.models.role import RoleDto, Role, RoleUpdate
from backend.src.helpers.objectid_helper import PyObjectId
from backend.src.db.connection import db


class RoleRepo:
    def __init__(self):
        self.collection = db["role"]


    #Get role by id
    async def get_role_by_id(self, role_id: str) -> Role:
        role = await self.collection.find_one({"_id": PyObjectId(role_id)})
        if role:
            return Role(**role
            )
        return None

    #Get all roles
    async def get_all_roles(self) -> list[Role]:
        roles_cursor = self.collection.find()
        roles = []
        if roles_cursor:
            async for role in roles_cursor:
                roles.append(Role(
                    **role
                ))
            return roles
        return None

    #Create a new role
    async def create_role(self, role: Role) -> str:
        role_dict = role.model_dump()
        role_dict.pop("id", None)  # Remove id if present, MongoDB will create one
        result = await self.collection.insert_one(role_dict)
        return str(result.inserted_id)

    #Delete a role by id
    async def delete_role(self, role_id: str) -> bool:
        result = await self.collection.delete_one({"_id" : PyObjectId(role_id)})
        return result.deleted_count > 0

    #Update a role by id
    async def update_role(self, role_id: str, updated_role: RoleUpdate) -> bool:
        role = await self.collection.find_one({"_id": PyObjectId(role_id)})
        if not role:
            return False  # consistent type

        updated_data = updated_role.model_dump(exclude_unset=True)
        updated_data.pop("id", None)  # korter

        result = await self.collection.update_one(
            {"_id": PyObjectId(role_id)}, {"$set": updated_data}
        )
        return result.modified_count > 0

        




