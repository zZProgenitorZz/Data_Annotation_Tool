import api from "../api"


// Get all logs
export async function getAllLogs() {
    const response = await api.get("/log/all-logs")
    return response.data;
}