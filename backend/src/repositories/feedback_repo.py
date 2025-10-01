from backend.src.helpers.objectid_helper import PyObjectId
from backend.src.models.feedback import Feedback, FeedbackDTO, FeedbackUpdate
from backend.src.db.connection import db

class FeedbackRepo:
    def __init__(self):
        self.collection = db["feedback"]

    # Get feedback by id
    async def get_feedback_by_id(self, feedback_id: str) -> Feedback:
        feedback = await self.collection.find_one({"_id": PyObjectId(feedback_id)})
        if not feedback:
            return None
        return Feedback(**feedback)

    # Get all feedbacks
    async def get_all_feedbacks(self) -> list[Feedback]:
        cursor = self.collection.find()
        feedbacks = []
        async for fb in cursor:
            feedbacks.append(Feedback(**fb))
        return feedbacks

    # Create a new feedback
    async def create_feedback(self, feedback: Feedback) -> str:
        feedback_dict = feedback.model_dump()
        feedback_dict.pop("id", None)  # MongoDB maakt automatisch een id
        result = await self.collection.insert_one(feedback_dict)
        return str(result.inserted_id)

    # Delete a feedback by id
    async def delete_feedback(self, feedback_id: str) -> bool:
        result = await self.collection.delete_one({"_id": PyObjectId(feedback_id)})
        return result.deleted_count > 0

    # Update a feedback by id
    async def update_feedback(self, feedback_id: str, updated_feedback: FeedbackUpdate) -> bool:
        feedback = await self.collection.find_one({"_id": PyObjectId(feedback_id)})
        if not feedback:
            return False
        
        updated_data = updated_feedback.model_dump(exclude_unset=True)
        updated_data.pop("id", None)

        result = await self.collection.update_one(
            {"_id": PyObjectId(feedback_id)}, 
            {"$set": updated_data}
        )
        return result.modified_count > 0
