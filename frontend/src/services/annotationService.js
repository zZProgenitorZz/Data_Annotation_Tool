import api from "../api"




export async function getImageAnnotation(imageId) {
    const response = await api.get(`/annotation/${imageId}/image-annotation`);
    return response.data;
}

export async function updateImageAnnotation(imageId, payload) {
    const response = await api.put(`/annotation/${imageId}/image-annotation`, payload);
    return response.data;
}

