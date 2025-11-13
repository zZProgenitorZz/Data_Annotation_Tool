from backend.src.models.user import UserDto
import uuid, base64, io
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
from backend.src.models.annotation2 import ImageAnnotations, Annotation
from backend.src.models.dataset import Dataset, DatasetUpdate
from backend.src.models.label import Label, LabelDto
import asyncio
import logging
import os
from PIL import Image
from backend.core.db import BASE_PATH

#------------------------------------------------------------
def get_guest_user(guest_id : str | None = None):

    if guest_id is None:
        guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    
    # Create a guest user object (not saved to database)
    guest_user = UserDto(
        id=guest_id,
        username=f"Guest_{guest_id[-6:]}",
        email=f"{guest_id}@guest.local",
        role="annotator",
        disabled=False,
        is_guest=True  # Add this field to identify guest users
    )
    return guest_user
#-------------------------------------------------------------  

"""
Guest Session Service - In-Memory Storage for Guest Users
This service stores all guest data in memory (RAM) without touching the database.
Each guest gets their own isolated storage that expires after inactivity.
"""

logger = logging.getLogger(__name__)


class GuestSessionService:
    """
    In-memory storage for guest user data.
    
    How it works:
    1. When a guest logs in, they get a unique guest_id
    2. All their data (datasets, images, annotations) is stored in memory
    3. Data is organized by guest_id, so guests can't see each other's data
    4. Sessions expire after 2 hours of inactivity (configurable)
    5. Expired sessions are automatically cleaned up
    """
    
    def __init__(self, session_timeout_minutes: int = 120):
        """
        Initialize the guest session service.
        
        Args:
            session_timeout_minutes: How long before inactive sessions expire (default: 2 hours)
        """
        # Main storage: guest_id -> session data
        self._sessions: Dict[str, dict] = {}
        
        # How long before session expires
        self._session_timeout = timedelta(minutes=session_timeout_minutes)
        
        logger.info(f"Guest session service initialized with {session_timeout_minutes} minute timeout")
        
        # Start background cleanup task
        asyncio.create_task(self._cleanup_expired_sessions())
    
    
    def _get_session(self, guest_id: str) -> dict:
        """
        Get or create a guest session.
        
        This is called on every operation. If the guest is new, we create
        a fresh session for them. If they exist, we update their last_accessed time.
        
        Args:
            guest_id: The unique guest identifier (from JWT token)
            
        Returns:
            Dictionary containing all the guest's data
        """
        if guest_id not in self._sessions:
            logger.info(f"Creating new session for guest: {guest_id}")
            self._sessions[guest_id] = {
                "created_at": datetime.now(timezone.utc),
                "last_accessed": datetime.now(timezone.utc),
                "datasets": {},      # dataset_id -> dataset data
                "images": {},        # image_id -> image data
                "annotations": {},   # annotation_id -> annotation data
                "labels": {},        # label_id -> label data
                "remarks": {}        # remark_id -> remark data
            }
        else:
            # Update last accessed time to keep session alive
            self._sessions[guest_id]["last_accessed"] = datetime.now(timezone.utc)
        
        return self._sessions[guest_id]
    
    
    def _is_session_expired(self, session: dict) -> bool:
        """
        Check if a session has expired due to inactivity.
        
        Args:
            session: The session dictionary to check
            
        Returns:
            True if session is expired, False otherwise
        """
        last_accessed = session.get("last_accessed", datetime.now(timezone.utc))
        expired = datetime.now(timezone.utc) - last_accessed > self._session_timeout
        return expired
    
    
    async def _cleanup_expired_sessions(self):
        """
        Background task that runs periodically to remove expired sessions.
        This prevents memory from filling up with old guest data.
        
        Runs every 10 minutes and removes sessions that haven't been
        accessed within the timeout period.
        """
        while True:
            try:
                await asyncio.sleep(600)  # Run every 10 minutes
                
                expired_sessions = [
                    guest_id for guest_id, session in self._sessions.items()
                    if self._is_session_expired(session)
                ]
                
                for guest_id in expired_sessions:
                    logger.info(f"Cleaning up expired session: {guest_id}")
                    del self._sessions[guest_id]
                
                if expired_sessions:
                    logger.info(f"Cleaned up {len(expired_sessions)} expired guest sessions")
                    
            except Exception as e:
                logger.error(f"Error in session cleanup: {e}")
    
    
    # ============================================================
    # DATASET OPERATIONS
    # ============================================================
    
    def create_dataset(self, guest_id: str, dataset: Dataset) -> str:
        """Create a new dataset for a guest."""
        session = self._get_session(guest_id)
        dataset_id = f"guest_dataset_{len(session['datasets']) + 1}"
        
        session["datasets"][dataset_id] = {
            **dataset.model_dump(),
            "id": dataset_id,
            "createdBy": guest_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "is_deleted": False
        }
        
        logger.debug(f"Guest {guest_id} created dataset {dataset_id}")
        return dataset_id
    
    
    def get_all_datasets(self, guest_id: str) -> List[dict]:
        """Get all non-deleted datasets for a guest."""
        session = self._get_session(guest_id)
        return [
            ds for ds in session["datasets"].values()
            if not ds.get("is_deleted", False)
        ]
    
    
    def get_dataset(self, guest_id: str, dataset_id: str) -> Optional[dict]:
        """Get a specific dataset by ID."""
        session = self._get_session(guest_id)
        dataset = session["datasets"].get(dataset_id)
        
        if dataset and not dataset.get("is_deleted", False):
            return dataset
        return None
    
    
    def update_dataset(self, guest_id: str, dataset_id: str, update_data: DatasetUpdate) -> bool:
        """Update an existing dataset."""
        session = self._get_session(guest_id)
        
        if dataset_id in session["datasets"]:
            session["datasets"][dataset_id].update(update_data.model_dump(exclude_unset=True))
            session["datasets"][dataset_id]["updatedAt"] = datetime.now(timezone.utc)
            logger.debug(f"Guest {guest_id} updated dataset {dataset_id}")
            return True
        return False
    
    
    def delete_dataset(self, guest_id: str, dataset_id: str) -> bool:
        """Hard delete a dataset and all its images (guest only, no soft delete)."""
        session = self._get_session(guest_id)
        
        if dataset_id in session["datasets"]:
            # Verwijder alle images die bij dit dataset horen
            images_to_delete = [
                img_id for img_id, img in session["images"].items()
                if img.get("dataset_id") == dataset_id
            ]
            for img_id in images_to_delete:
                del session["images"][img_id]

            # Verwijder het dataset zelf
            del session["datasets"][dataset_id]
            logger.debug(f"Guest {guest_id} deleted dataset {dataset_id} and its {len(images_to_delete)} images")
            return True
        
        return False
    
    
    # ============================================================
    # IMAGE OPERATIONS
    # ============================================================

    # basepath for image location
    
    async def add_images_to_dataset(
            self,
            guest_id: str,
            dataset_id: str,
            files: list,   # List[UploadFile]
        ) -> list[dict]:
            session = self._get_session(guest_id)

            if dataset_id not in session["datasets"]:
                raise ValueError(f"Dataset {dataset_id} not found for guest {guest_id}")

            inserted_images: list[dict] = []

            for file in files:
                content = await file.read()  # bytes

                image_id = f"guest_{uuid.uuid4()}"

                # width/height bepalen (optioneel)
                try:
                    with Image.open(io.BytesIO(content)) as img:
                        width, height = img.size
                        file_type = (img.format or "bin").lower()
                except Exception:
                    width = height = 0
                    file_type = "bin"

                metadata = {
                    "id": image_id,
                    "datasetId": dataset_id,
                    "fileName": file.filename,
                    "width": width,
                    "height": height,
                    "fileType": file_type,
                    "contentType": file.content_type,
                    "sizeBytes": len(content),
                    "uploadedAt": datetime.now(timezone.utc),
                    "is_active": True,
                    # hier slaan we de daadwerkelijke bytes op, gecodeerd
                    "data": base64.b64encode(content).decode("ascii"),
                }

                session["images"][image_id] = metadata
                inserted_images.append(metadata)

            dataset = session["datasets"][dataset_id]
            dataset["total_Images"] = dataset.get("total_Images", 0) + len(inserted_images)
            dataset["updatedAt"] = datetime.now(timezone.utc)

            return inserted_images


    

    def get_images_by_dataset(self, guest_id: str, dataset_id: str) -> List[dict]:
        """Haal alle images op die bij een dataset horen."""
        session = self._get_session(guest_id)

        images_dict = session.get("images", {})
        images = [
            img for img in images_dict.values()
            if img.get("datasetId") == dataset_id and img.get("is_active", True)
        ]
        return images

    
    def get_image(self, guest_id: str, image_id: str) -> tuple[bytes, str]:
        session = self._get_session(guest_id)
        img = session["images"].get(image_id)
        if not img:
            raise ValueError("Image not found")
        data = base64.b64decode(img["data"])
        return data, img["contentType"]
    
    
    def delete_images(self, guest_id: str, dataset_id: str, image_ids: list[str]) -> int:
        """Hard delete multiple images from a specific dataset (guest only)."""
        session = self._get_session(guest_id)
        deleted_count = 0

        for img_id in image_ids:
            img = session["images"].get(img_id)
            if img and img.get("datasetId") == dataset_id:
                del session["images"][img_id]
                deleted_count += 1

        return deleted_count



    
    
    # ============================================================
    # ANNOTATION OPERATIONS
    # ============================================================
    
    def create_image_annotations(self, guest_id: str, image_id: str,  image_annotations: ImageAnnotations) -> str:
        """Create a new annotation document for an image."""
        session = self._get_session(guest_id)
        annotation_id = f"guest_ann_{len(session['annotations']) + 1}"
        
        session["annotations"][annotation_id] = {
            **image_annotations.model_dump(),
            "id": annotation_id,
            "imageId": image_id
        }
        
        logger.debug(f"Guest {guest_id} created annotations {annotation_id}")
        return annotation_id
    
    
    def get_all_image_annotations(self, guest_id: str) -> List[dict]:
        """Get all annotation documents for a guest."""
        session = self._get_session(guest_id)
        return list(session["annotations"].values())
    
    
    def get_annotations_for_image(self, guest_id: str, image_id: str) -> List[dict]:
        """Get all annotations for a specific image."""
        session = self._get_session(guest_id)
        
        for ann in session["annotations"].values():
            if ann.get("imageId") == image_id:
                return ann.get("annotations", [])
        
        return []
    
    
    
    def add_annotation_to_image(self, guest_id: str, image_id: str, annotation: Annotation) -> bool:
        """Add a single annotation to an image."""
        session = self._get_session(guest_id)
        
        # Find existing annotations for this image
        image_annotations = None
        for ann_id, ann in session["annotations"].items():
            if ann.get("imageId") == image_id:
                image_annotations = ann
                break
        
        if not image_annotations:
            # Create new annotation document
            ann_id = f"guest_ann_{len(session['annotations']) + 1}"
            session["annotations"][ann_id] = {
                "id": ann_id,
                "imageId": image_id,
                "annotations": [annotation.model_dump()]
            }
        else:
            # Add to existing
            if "annotations" not in image_annotations:
                image_annotations["annotations"] = []
            image_annotations["annotations"].append(annotation.model_dump())
        
        return True
    
    

    
    def delete_single_annotation(self, guest_id: str, image_id: str, annotation_id: str) -> bool:
        """Delete a single annotation from an image."""
        session = self._get_session(guest_id)
        
        for ann in session["annotations"].values():
            if ann.get("imageId") == image_id and "annotations" in ann:
                original_count = len(ann["annotations"])
                ann["annotations"] = [
                    a for a in ann["annotations"]
                    if a.get("id") != annotation_id
                ]
                return len(ann["annotations"]) < original_count
        
        return False
    
    
    def delete_image_annotations(self, guest_id: str, image_id: str) -> bool:
        """Delete all annotations for an image."""
        session = self._get_session(guest_id)
        
        for ann_id in list(session["annotations"].keys()):
            if session["annotations"][ann_id].get("imageId") == image_id:
                del session["annotations"][ann_id]
                return True
        
        return False
    
    
    # ============================================================
    # LABEL OPERATIONS
    # ============================================================
    
    def create_label(self, dataset_id: str, guest_id: str, label: Label) -> str:
        """Create a new label."""
        session = self._get_session(guest_id)
        label_id = f"guest_label_{len(session['labels']) + 1}"
        
        session["labels"][label_id] = {
            **label.model_dump(),
            "id": label_id,
            "datasetId": dataset_id
        }
        
        return label_id
    
    
    def get_all_labels(self, guest_id: str) -> List[dict]:
        """Get all labels for a guest."""
        session = self._get_session(guest_id)
        return list(session["labels"].values())
    
    
    def get_label_by_id(self, guest_id: str, label_id: str) -> Optional[dict]:
        """Get a specific label by ID."""
        session = self._get_session(guest_id)
        return session["labels"].get(label_id)
    
    
    def update_label(self, guest_id: str, label_id: str, update_data: LabelDto) -> bool:
        """Update an existing label."""
        session = self._get_session(guest_id)
        
        if label_id in session["labels"]:
            session["labels"][label_id].update(update_data.model_dump(exclude_unset = True))
            return True
        return False
    
    
    def delete_label(self, guest_id: str, label_id: str) -> bool:
        """Delete a label."""
        session = self._get_session(guest_id)
        
        if label_id in session["labels"]:
            del session["labels"][label_id]
            return True
        return False
    
    def delete_dataset_label(self, guest_id: str, dataset_id: str) -> bool:
        """"Delete dataset labels"""
        session = self._get_session(guest_id)
        labels = session.get("labels", {})

        deleted_any = False

        for label_id in list(labels.keys()):
            if labels[label_id].get("datasetId") == dataset_id:
                del labels[label_id]
                deleted_any = True

        return deleted_any
    

    
    # ============================================================
    # UTILITY METHODS
    # ============================================================
    
    def clear_session(self, guest_id: str):
        """Manually clear a guest session (for testing or logout)."""
        if guest_id in self._sessions:
            logger.info(f"Manually clearing session for guest: {guest_id}")
            del self._sessions[guest_id]
    
    
    def get_session_info(self, guest_id: str) -> dict:
        """Get statistics about a guest session."""
        session = self._get_session(guest_id)
        
        return {
            "guest_id": guest_id,
            "created_at": session["created_at"],
            "last_accessed": session["last_accessed"],
            "datasets_count": len(session["datasets"]),
            "images_count": len(session["images"]),
            "annotations_count": len(session["annotations"]),
            "labels_count": len(session["labels"]),
            "remarks_count": len(session["remarks"])
        }


# Global singleton instance
# This ensures all routers use the same service instance
guest_session_service = GuestSessionService()