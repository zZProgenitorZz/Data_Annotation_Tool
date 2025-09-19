import asyncio
from backend.src.repositories.role_repo import RoleRepo
from backend.src.models.role import Role, RoleDto, RoleUpdate
from backend.src.helpers import PyObjectId
from backend.src.models.user import User, UserDto, UserUpdate
from backend.src.repositories.user_repo import UserRepo
from backend.src.repositories.dataset_repo import DatasetRepo
from backend.src.models.dataset import Dataset
from backend.src.repositories.label_repo import LabelRepo
from backend.src.models.label import Label




#-----------------------------------------------------------------------------------------------------------------------
# Universal Test

dataset = DatasetRepo()
label = LabelRepo()

async def test_create_dataset():
    new_Dataset = Dataset(
        name= "dataset284",
        description= "It has parasites",
        createdBy = "68c80cd36842b3ca17e13d50",
        status = "New",
        total_Images= 333,
        completed_Images= 0,
        locked = False,
        is_active = True
    )

    created = await dataset.create_dataset(new_Dataset)
    print(created)

async def test_create_label():
    new_label = Label(
        datasetId = "68cbce3fa73e659f7f62963d",
        labelName = "dog",
        labelDescription = "police dog"
        )
    created = await label.create_label(new_label)
    print(created)

#asyncio.run(test_create())
#asyncio.run(test_create_label())


async def test_detele_label():
    label_id = "68cbe018768af3efe03e9062"
    delete = await label.delete_label(label_id)
    if delete:
        print("The label is deleted!")
    else:
        print("Faled to delete label!")

#asyncio.run(test_detele_label())


#--------------------------------------------------------------------------------------------------------------------------
# ROLES TESTS
role_repo = RoleRepo()

# Test functio get_role_by_id
async def test_get_role():
    # Vul hier een bestaand ObjectId in je MongoDB
    test_id = "68c3e04ce119e0f462375e46"
    role = await role_repo.get_role_by_id(test_id)
    
    if role:
        print("Role found:")
        print(role.model_dump_json())
    else:
        print("No role found with the given ID.")

# Test function get_all_roles
async def test_get_all_roles():
    roles = await role_repo.get_all_roles()

    print(f"Get total roles: {len(roles)}")
    for role in roles:
        print(f"Role ID: {role.id}")
        print(f"Role: {role.roleName}")
    
# Test function create_role
async def test_create_role():
    new_role = Role(
        roleName="TestRole3",
        deletePermission=False,
        annotationPermission=True,
        managementPermission=False,
        logViewPermission=False,
        addPermission=True
    )
    created_role = await role_repo.create_role(new_role)
    print("Created Role ID:")
    print(created_role)

# Test function delete_role
async def test_delete_role(role_id: str):
    success = await role_repo.delete_role(role_id)
    if success:
        print(f"Role with ID {role_id} deleted successfully.")
    else:
        print(f"Failed to delete role with ID {role_id}.")

# Test function update_role
async def test_update_role(role_id: str):
    updated_role = RoleUpdate(
        roleName="UpdatedTestRole2"
    )
    role_dto = await role_repo.update_role(role_id, updated_role)
    if role_dto:
        print("Updated Role:")
        print(f"Role ID: {role_id} is updated")
    else:
        print(f"No role found with ID {role_id} to update.")

# Run de test
#asyncio.run(test_get_role())
#asyncio.run(test_get_all_roles())
#asyncio.run(test_create_role())
#asyncio.run(test_delete_role("68c9189599b52df17b182590"))
#asyncio.run(test_update_role("68c7e8c4e414bc8e6b9c44af"))

#--------------------------------------------------------------------------------------------------------------------------
# USERS TESTS
user = UserRepo()
# Test function create_user
async def test_create_user():
    new_user = User(
        username="testuser2",
        password="testpassword2",
        email="testemail2@email.com",
        roleId=PyObjectId("68c80723887353f6b648a301"), # Replace with a valid Role ObjectId
        is_active=False
    )
    created_user = await user.create_user(new_user)
    print("Created User:")
    print(created_user.model_dump_json())

# Test function get_user_by_id
async def test_get_user():
    test_id = "68c806df2d75e0c5ee681a93"
    user = await user.get_user_by_id(test_id)
    if user:
        print("User found:")
        print(user.model_dump_json())
    else:
        print("No user found with the given ID.")

# Test function get_all_users
async def test_get_all_users():
    users = await user.get_all_users()

    print(f"Get total users: {len(users)}")
    for user in users:
        print(f"User ID: {user.id}, User: {user.username}, Role ID: {user.roleId}")
    
# Test function delete_user
async def test_delete_user(user_id: str):
    success = await user.delete_user(user_id)
    if success:
        print(f"User with ID {user_id} deleted successfully.")
    else:
        print(f"Failed to delete user with ID {user_id}.")

# Test function update_user
async def test_update_user(user_id: str):
    updated_user = UserUpdate(
        username="updateduser1",
        password="updatedpassword1"
    )
    user = await user.update_user(user_id, updated_user)
    if user:
        print("Updated User:")
        print(f"User ID: {user_id} is updated")
    else:
        print(f"No user found with ID {user_id} to update.")

# Run de test
#asyncio.run(test_create_user())
#asyncio.run(test_get_user())
#asyncio.run(test_get_all_users())
#asyncio.run(test_delete_user("68c8098be6930d4ea97eeaa9"))
#asyncio.run(test_update_user("68c80cd36842b3ca17e13d50"))

#--------------------------------------------------------------------------------------------------------------------------
# DATASET TESTS







