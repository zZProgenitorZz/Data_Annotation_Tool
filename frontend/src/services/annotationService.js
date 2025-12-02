import api from "../api"



// Get all image annotations 
// export async function getAllImageAnnotations() {
//     const response = await api.get("/annotation/all-image");
//     return response.data; // response_model=List[ImageAnnotationsDto] in backend
// }


export async function getImageAnnotation(imageId) {
    const response = await api.get(`/annotation/${imageId}/image-annotation`);
    return response.data;
}

export async function updateImageAnnotation(imageId, payload) {
    const response = await api.put(`/annotation/${imageId}/image-annotation`, payload);
    return response.data;
}

// // Add a single annotation to an image 
// export async function addAnnotationToImage(imageId, annotation) {
//     const response = await api.post(`/annotation/${imageId}/add`, annotation);
//     return response.data; // response_model=bool in backend
// }

// // Delete a single annotation from an image
// export async function deleteSingleAnnotation(imageId, annotationId) {
//     const response = await api.delete(`/annotation/${imageId}/${annotationId}`);
//     return response.data; // response_model=bool in backend 
// }

