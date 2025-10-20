import api from "../api";

// Login: POST /token
export async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await api.post("/user/token", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  // Store token in localStorage
  localStorage.setItem("access_token", response.data.access_token);
  return response.data;
}

// Get current logged-in user: Get /me
export async function getCurrentUser() {
    const response = await api.get("/user/me/");
    return response.data;

}

// Get all User
export async function getAllUsers() {
    const response = await api.get("/user/all-users");
    return response.data;
}

// Get signle User
export async function getUser(userId) {
    const response = await api.get(`/user/${userId}`);
    return response.data;
}

export async function createUser(user) {
    const response = await api.post("/user/", user);
    return response.data;
}

// Guest Login: POST /guest-login
export async function guestLogin() {
  const response = await api.post("/guest/guest-login");
  const {access_token} = response.data;

  localStorage.setItem("access_token", access_token)

  return response.data
}

//Guest info: Get /guest/me
export async function getGuestInfo() {
  const response = await api.get("/guest/me");
  return response.data
}