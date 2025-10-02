from typing import List
from backend.src.repositories.feedback_repo import FeedbackRepo
from backend.src.models.feedback import Feedback, FeedbackDTO, FeedbackUpdate
from backend.src.helpers.helpers import NotFoundError, ValidationError

class FeedbackService:
    def __init__(self, repo: FeedbackRepo):
        self.repo = repo

    # get feedback
    async def get_feedback_by_id(self, feedback_id: str) -> FeedbackDTO:
        feedback = await self.repo.get_feedback_by_id(feedback_id)
        if not feedback:
            raise NotFoundError(f"Feedback with id {feedback_id} not found")
        return self._to_dto(feedback)

    # get all feedback
    async def get_all_feedbacks(self) -> List[FeedbackDTO]:
        feedbacks = await self.repo.get_all_feedbacks()
        if not feedbacks:
            raise NotFoundError("No feedbacks found in the database")
        return [self._to_dto(fb) for fb in feedbacks]

    # create a new feedback
    async def create_feedback(self, feedback: Feedback) -> str:
        if not feedback.message:
            raise ValidationError("Feedback message is required")
        inserted_id = await self.repo.create_feedback(feedback)
        return inserted_id

    # Delete feedback
    async def delete_feedback(self, feedback_id: str) -> bool:
        succes = await self.repo.delete_feedback(feedback_id)
        if not succes:
            raise NotFoundError(f"Feedback with id {feedback_id} not found")
        return succes

    # Update feedback
    async def update_feedback(self, feedback_id: str, updated_feedback: FeedbackUpdate) -> bool:
        succes = await self.repo.update_feedback(feedback_id, updated_feedback)
        if not succes:
            raise NotFoundError(f"Feedback with id {feedback_id} not found")
        return succes

    # Helper: Feedback -> FeedbackDTO
    def _to_dto(self, feedback: Feedback) -> FeedbackDTO:
        return FeedbackDTO(
            id=str(feedback.id),
            annotation_id=str(feedback.annotation_id) if feedback.annotation_id else None,
            image_id=str(feedback.image_id) if feedback.image_id else None,
            from_user=str(feedback.from_user) if feedback.from_user else None,
            to_users=[str(u) for u in feedback.to_users] if feedback.to_users else None,
            message=feedback.message,
            status=feedback.status,
            reply=feedback.reply
        )
