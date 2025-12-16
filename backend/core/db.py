from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

import os
from urllib.parse import quote_plus


load_dotenv()
#Local DB
# client = AsyncIOMotorClient("mongodb://localhost:27017")
# db = client["AiDX_Medical"] # database name

user = os.getenv("atlas_USERNAME")
pw = quote_plus(os.getenv("atlas_PASSWORD"))
cluster = os.getenv("atlas_CLUSTER")
db_name = os.getenv("atlas_DB")

uri = f"mongodb+srv://{user}:{pw}@{cluster}/{db_name}?retryWrites=true&w=majority&appName=AiDxMedical"
client = AsyncIOMotorClient(uri)
db = client[db_name]

# MONGODB_URL = os.getenv("atlas_URL")

# client = AsyncIOMotorClient(MONGODB_URL)

# db = client["AiDxMedical"]



# progen_db_user                            TEItFpFuRNAmcNEL

# mongodb+srv://progen_db_user:TEItFpFuRNAmcNEL@aidxmedical.29wm2cq.mongodb.net/?appName=AiDxMedical