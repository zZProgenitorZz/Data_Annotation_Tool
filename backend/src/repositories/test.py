import asyncio

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
        name= "dataset666",
        description= "It has parasites",
        createdBy = "68c80cd36842b3ca17e13d50",
        status = "New",
        total_Images= 0,
        completed_Images= 0,
        locked = False,
        assignedTo= ["68c80cd36842b3ca17e13d50"],
        is_active = True
        

    )

    created = await dataset.create_dataset(new_Dataset)
    print(created)


async def test_delete_dataset():
    dataset_id = "68cbce3fa73e659f7f62963d"
    delete = await dataset.delete_dataset(dataset_id)
    if delete:
        print("The dataset is deleted")
    else:
        print("Failed to delete the dataset")



    
#asyncio.run(test_create_dataset())
#asyncio.run(test_create_label())
#asyncio.run(test_delete_dataset())

async def test_create_label():
    new_label = Label(
        datasetId = "68cbce3fa73e659f7f62963d",
        labelName = "dog",
        labelDescription = "police dog"
        )
    created = await label.create_label(new_label)
    print(created)


async def test_detele_label():
    label_id = "68cbe018768af3efe03e9062"
    delete = await label.delete_label(label_id)
    if delete:
        print("The label is deleted!")
    else:
        print("Faled to delete label!")

#asyncio.run(test_detele_label())


#--------------------------------------------------------------------------------------------------------------------------

#--------------------------------------------------------------------------------------------------------------------------
# USERS TESTS
user = UserRepo()
# Test function create_user
async def test_create_user():
    new_user = User(
        username="John",
        hashed_password="example_password2",
        email="JohnDoe@email.com",
        role="annotator", 
        disabled = False,

    )
    created_user = await user.create_user(new_user)
    print("Created User:")
    print(created_user)

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
asyncio.run(test_create_user())
#asyncio.run(test_get_user())
#asyncio.run(test_get_all_users())
#asyncio.run(test_delete_user("68c8098be6930d4ea97eeaa9"))
#asyncio.run(test_update_user("68c80cd36842b3ca17e13d50"))

#--------------------------------------------------------------------------------------------------------------------------
# DATASET TESTS







