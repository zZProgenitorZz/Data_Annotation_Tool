from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from connection import db
import asyncio

async def test_connection():
    try:
        # Count the number of documents in a test collection
        count = await db["role"].count_documents({})
        print(f"Connection successful! Document count in 'role' collection: {count}")

        # pick up one document
        document = await db["role"].find_one({})
        print(f"Sample document from 'role' collection: {document}")
    except Exception as e:
        print(f"Connection failed: {e}")

# Run the async test
asyncio.run(test_connection())