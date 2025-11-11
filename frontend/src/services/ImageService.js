// src/services/ImageService.js
import api from "../api";

/**
 * Request presigned PUT URLs for a batch of files in a dataset.
 * Response: [{ imageId, s3Key, putUrl, headers }]
 */
export async function presignImages(datasetId, files) {
  const payload = {
    files: files.map(f => ({
      filename: f.name,
      size: f.size,
      contentType: f.type || "application/octet-stream",
    })),
  };
  console.log(payload)
  console.log(datasetId)
  const { data } = await api.post(`/image/${datasetId}/images/presign`, payload);
  
  return data;
}

/**
 * Mark an image upload as complete (your backend finalizes metadata, etc.)
 */
export async function completeImage(imageId, extra = {}) {
  const { data } = await api.post(`/image/images/complete`, { imageId, ...extra });
  return data;
}

export async function completeImagesBulk(items) {
  // items: [{ imageId, checksum?, width?, height? }, ...]
  const { data } = await api.post(`/image/images/complete-bulk`, items);
  return data;
}


/**
 * List images for a dataset.
 * Response: [{ _id, originalFilename, contentType }, ...]
 */
//export async function listImages(datasetId) {
//  const { data } = await api.get(`/image/${datasetId}/all-images`);
//  return data;
//}

// ImageService.js
export async function listImages(datasetId, { limit, offset } = {}) {
  const params = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;

  const { data } = await api.get(`/image/${datasetId}/all-images`, { params });
  return data;
}


/**
 * Get a temporary signed GET URL to display/download an image.
 * Response: { url, contentType }
 */
export async function getSignedUrl(imageId) {
  const { data } = await api.get(`/image/images/${imageId}/signed-url`);
  return data;
}

/**
 * Optional helper for actually PUT-ing to S3 using the presigned URL.
 * (Use fetch here, not axios baseURL, since it's an absolute S3 URL.)
 */
export async function uploadToS3(putUrl, file, headers = {}) {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...headers, // e.g. {'x-amz-acl': 'private'} if your backend included it
    },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
  return true;
}




export async function hardDeleteImage(image_id) {
  const {data} = await api.delete(`/image/${image_id}/hard`);
  return data
}

export async function hardDeleteDatasetImages(dataset_id){
  const {data} = await api.delete(`/image/dataset/${dataset_id}/hard`)
  return data;
}




export async function softDeleteImages(datasetId, imageIds) {
  // Alleen params meesturen als we specifieke images willen deleten
  const config =
    imageIds && imageIds.length
      ? { params: { image_id: imageIds } } // => ?image_id=a&image_id=b&...
      : {};

  const { data } = await api.delete(`/image/${datasetId}/soft`, config);
  return data; 
}

export async function softDeleteImage(datasetId, imageId) {
  return softDeleteImages(datasetId, [imageId]);
}


export async function softDeleteDatasetImages(datasetId) {
  return softDeleteImages(datasetId, null);
}




// For guest User


export async function uploadGuestImages(datasetId, files) {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach((f) => formData.append("files", f)); // "files" moet matchen met je FastAPI parameternaam
 

  const res = await api.post(`/image/guest-datasets/${datasetId}/images`, formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data; // backend kan bijv. de image-metadata teruggeven
}