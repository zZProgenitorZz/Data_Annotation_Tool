import api from "../api";

// POST /remark/ 
export async function createRemark(remark) {
  const response = await api.post("/remark/", remark);
  return response.data;
}

// GET /remark/all-remark  
export async function getAllRemarks(datasetId) {
  const response = await api.get("/remark/all-remark", {params: {dataset_id: datasetId},});
  return response.data;
}

// GET /remark/{remark_id}  
export async function getRemarkById(remarkId) {
  const response = await api.get(`/remark/${remarkId}`);
  return response.data;
}

// PUT /remark/{remark_id}  
export async function updateRemark(remarkId, updatedRemark) {
  const response = await api.put(`/remark/${remarkId}`, updatedRemark);
  return response.data;
}

// DELETE /remark/{remark_id}  
export async function deleteRemark(datasetId) {
  const response = await api.delete(`/remark/${datasetId}`);
  return response.data;
}
