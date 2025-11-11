
import api from "../api";


// Create a label
export async function createLabel(datasetId, label){
    const response = await api.post("/label/create", datasetId, label);
    return response.data;
}

// Get all labels
export async function getAllLabels() {
    const response = await api.get("/label/all-labels");
    return response.data;
}

// Get label by Id
export async function getLabel(labelId) {
    const response = await api.get(`/label/${labelId}`)
    return response.data;
}

// Update label
export async function updateLabel(labelId, updatadLabel) {
    const response = await api.put(`/label/update/${labelId}`, updatadLabel)
    return response.data;
}

// Delete label
export async function deleteLabel(labelId){
    const response = await api.delete(`/label/delete/${labelId}`)
    return response.data;
}