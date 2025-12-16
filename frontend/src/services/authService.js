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
  localStorage.setItem("auth_kind", "user");
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

export async function deleteUser(userId) {
  const response = await api.delete(`/user/${userId}`);
  return response.data;
}

// Guest Login: POST /guest-login
export async function guestLogin() {
  const response = await api.post("/guest/guest-login");
  const {access_token} = response.data;

  localStorage.setItem("access_token", access_token)
  localStorage.setItem("auth_kind", "guest");
  return response.data
}

//Guest info: Get /guest/me
export async function getGuestInfo() {
  const response = await api.get("/guest/me");
  return response.data
  
}


export async function inviteUser (invite) {
  const response = await api.post("/user/invite", invite);
  return response.data;
}

export async function completeInvite (payload) {
  const response = await api.post("/user/complete-invite", payload)
  return response.data;
}

export async function completePasswordReset(payload) {
  const response = await api.post("/user/complete-reset", payload);
  return response.data;
}


export async function requestPasswordReset(payload) {
  const response = await api.post("/user/request-reset", payload);
  return response.data;
}
