import axios from "axios";

const API_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
  
      }
    return config;
    },
  (error) => Promise.reject(error)
);

// 401-afhandeling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Kijk of er echt een response is
    if (error.response && error.response.status === 401) {
      // Token is ongeldig / verlopen → schoonmaken
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("auth_kind");

      // Harde redirect naar loginpagina
      window.location.href = "/";
    }

    // Zorg dat je error nog steeds verder kunt afhandelen als je wilt
    return Promise.reject(error);
  }
);

export default api