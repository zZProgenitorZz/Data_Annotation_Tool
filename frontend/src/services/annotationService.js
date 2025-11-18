import api from "../api"

// Create new image annotations 
export async function createImageAnnotations(imageId, imageAnnotations) {
    const response = await api.post("/annotation/", imageAnnotations, {params: {image_id: imageId},});
    return response.data; // response_model=str in backend
}

// Get all image annotations 
export async function getAllImageAnnotations() {
    const response = await api.get("/annotation/all-image");
    return response.data; // response_model=List[ImageAnnotationsDto] in backend
}

// Get annotations for a specific image 
export async function getAnnotationsForImage(imageId) {
    const response = await api.get(`/annotation/${imageId}/annotations`);
    return response.data; // response_model=List[AnnotationDto] in backend
}

// Add a single annotation to an image 
export async function addAnnotationToImage(imageId, annotation) {
    const response = await api.post(`/annotation/${imageId}/add`, annotation);
    return response.data; // response_model=bool in backend
}

// Delete a single annotation from an image
export async function deleteSingleAnnotation(imageId, annotationId) {
    const response = await api.delete(`/annotation/${imageId}/${annotationId}`);
    return response.data; // response_model=bool in backend
}

// Delete all annotations for a given image
export async function deleteImageAnnotations(imageId) {
    const response = await api.delete(`/annotation/${imageId}`);
    return response.data; // response_model=bool in backend
}