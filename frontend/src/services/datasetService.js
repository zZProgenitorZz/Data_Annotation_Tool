import api from "../api";

// Create new dataset
export async function createDataset(dataset) {
  const response = await api.post("/dataset/create", dataset);
  return response.data;
}

// Get all datasets
export async function getAllDatasets() {
  const response = await api.get("/dataset/all-datasets");
  return response.data;
}

// Get dataset by ID
export async function getDatasetById(datasetId) {
  const response = await api.get(`dataset/${datasetId}`);
  return response.data;
}

// Update dataset
export async function updateDataset(datasetId, datasetUpdate) {
  const response = await api.put(`dataset/update/${datasetId}`, datasetUpdate);
  return response.data;
}

// Soft delete dataset
export async function softDeleteDataset(datasetId) {
  const response = await api.delete(`dataset/soft-d/${datasetId}`);
  return response.data;
}

// Restore dataset
export async function restoreDataset(datasetId) {
  const response = await api.post(`dataset/restore/${datasetId}`);
  return response.data;
}

// Hard delete dataset
export async function hardDeleteDataset(datasetId) {
  const response = await api.delete(`dataset/hard-d/${datasetId}`);
  return response.data;
}
