import uuid
from backend.src.repositories.Image_metadata_repo import ImageMetadataRepo
from typing import List
from datetime import datetime, timezone
from backend.src.models.imageMetadata import ImageMetadata
from backend.src.helpers.helpers import NotFoundError
from backend.core.aws import s3, S3_BUCKET, S3_PREFIX
from backend.src.models.user import UserDto
from datetime import datetime, timezone
from backend.src.services.imageMetadata_service import MetadataService

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/tiff", "image/webp", "image/jpg"}

class ImageService:

    def __init__(self):
        self.image_repo = ImageMetadataRepo()
        self.metadata_service = MetadataService()

 
    # ---------- presign upload ----------
    async def presign_upload(self, dataset_id: str, files: List[dict], current_user):
        """
        files: [{filename, size, contentType}]
        returns: [{imageId, s3Key, putUrl, headers}]
        """
        now = datetime.now(timezone.utc)
        out = []
        for f in files:
            if f["contentType"].lower().strip() not in ALLOWED_TYPES:
                raise ValueError(f"Unsupported content type: {f['contentType']}")
            # create s3 key
            ext = f["filename"].rsplit(".",1)[-1].lower() if "." in f["filename"] else "bin"
            key = f"{S3_PREFIX}/{dataset_id}/{uuid.uuid4()}.{ext}"
            

            # create metadata row as pending
            meta = ImageMetadata(
                datasetId=str(dataset_id),
                fileName=f["filename"],
                folderPath="",  # legacy field; no local path in S3 mode
                width=0, height=0,  # fill later if you parse
                fileType=ext,
                s3Key=key,
                contentType=f["contentType"],
                sizeBytes=f.get("size", 0),
                status="pending",
                uploadedAt=now,
                is_active=True
            )

           

            saved = await self.image_repo.create_image_metadata(meta.model_dump(
                by_alias=True,
                exclude_none=True,
                exclude={"id"}

            ))
            
            put_url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": S3_BUCKET,
                    "Key": key,
                    "ContentType": f["contentType"]
        
                },
                
                ExpiresIn=60*5
            )
            out.append({
                "imageId": str(saved.id),
                "s3Key": key,
                "putUrl": put_url,
                "headers": {"Content-Type": f["contentType"]}
            })
            

        return out
    
    # ----------  complete upload ----------
    async def complete_upload(self, image_id: str,current_user, checksum: str | None = None, width: int | None = None, height: int | None = None):
        doc = await self.image_repo.get_image_metadata_by_id(image_id)
        if not doc:
            raise NotFoundError(f"Image metadata with id {image_id} not found")
        
        prev_status = doc.status if hasattr(doc, "status") else None
        # ensure object exists in S3
        try:
            head = s3.head_object(Bucket=S3_BUCKET, Key=doc.s3Key)
        except Exception:
            # mark failed
            await self.image_repo.update_image_metadata(image_id, {"status":"failed", "updatedAt": datetime.now(timezone.utc)})
            raise

        patch = {
            "status": "ready",
            "updatedAt": datetime.now(timezone.utc),
            "etag": head.get("ETag","").strip('"'),
            "sizeBytes": head.get("ContentLength"),
        }
        if checksum: patch["checksum"] = checksum
        if width is not None: patch["width"] = width
        if height is not None: patch["height"] = height

        await self.image_repo.update_image_metadata(image_id, patch)
        # increment only once
        if prev_status != "ready":
            await self.metadata_service.update_dataset_image_count(doc.datasetId, 1, current_user=None)

        return {"ok": True}
    

    # ------------Complete upload in bulk ---------------------
    async def complete_upload_bulk(self, items: List[dict], current_user):
        """
        items: [{imageId, checksum, width, height}]
        """
        updated_count_by_dataset = {}

        for item in items:
            image_id = item["imageId"]
            checksum = item.get("checksum")
            width = item.get("width")
            height = item.get("height")

            doc = await self.image_repo.get_image_metadata_by_id(image_id)
            if not doc:
                continue  # of raise

            prev_status = getattr(doc, "status", None)

            try:
                head = s3.head_object(Bucket=S3_BUCKET, Key=doc.s3Key)
            except Exception:
                await self.image_repo.update_image_metadata(
                    image_id,
                    {"status": "failed", "updatedAt": datetime.now(timezone.utc)}
                )
                continue

            patch = {
                "status": "ready",
                "updatedAt": datetime.now(timezone.utc),
                "etag": head.get("ETag", "").strip('"'),
                "sizeBytes": head.get("ContentLength"),
            }
            if checksum: patch["checksum"] = checksum
            if width is not None: patch["width"] = width
            if height is not None: patch["height"] = height

            await self.image_repo.update_image_metadata(image_id, patch)

            if prev_status != "ready":
                updated_count_by_dataset[doc.datasetId] = (
                    updated_count_by_dataset.get(doc.datasetId, 0) + 1
                )

        # uiteindelijk één keer per dataset tellen
        for dataset_id, count in updated_count_by_dataset.items():
            await self.metadata_service.update_dataset_image_count(
                dataset_id, count, current_user=None
            )

        return {"ok": True}



  # ----------  signed GET for display ----------
    async def get_signed_url(self, image_id: str, current_user):
        doc = await self.image_repo.get_image_metadata_by_id(image_id)
        if not doc or doc.status != "ready":
            raise NotFoundError("Image not found or not ready")
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": S3_BUCKET, "Key": doc.s3Key},
            ExpiresIn=60*2
        )
        return {"url": url, "contentType": doc.contentType}
    


    # -------------------hard delete one image
    async def hard_delete_image(self, image_id: str, current_user):
        metadata = await self.image_repo.get_image_metadata_by_id(image_id)
        if not metadata:
            raise NotFoundError(f"Image metadata with id {image_id} not found")
        if metadata.is_active:
            return False
        

        # NEW: delete from S3 if we have a key (instead of local os.remove)
        if metadata.s3Key:
            try:
                s3.delete_object(Bucket=S3_BUCKET, Key=metadata.s3Key)
            except Exception:
                pass

        deleted = await self.image_repo.delete_image_metadata(image_id)
        return deleted

    # hard delete all soft-deleted images of a dataset
    async def hard_delete_dataset_images(self, dataset_id: str, current_user: UserDto | None = None) -> int:
        images = await self.image_repo.get_image_by_dataset_id(dataset_id)
        if not images:
            raise NotFoundError(f"Images with dataset ID: {dataset_id} not found")
        
        # filter alleen soft-deleted images
        images_to_delete = [image for image in images if not image.is_active]

        if not images_to_delete:
            return 0

        count = 0
        for image in images_to_delete:
            succes = await self.hard_delete_image(str(image.id), current_user)
            if succes:
                count += 1

        return count
    
 