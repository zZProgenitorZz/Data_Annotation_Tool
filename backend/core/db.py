from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient


client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["AiDX_Medical"] # database name


# basepath for image location
BASE_PATH = "C:/Users/Lenovo/Documents/VS Project/DataAnnotationTool/images"



