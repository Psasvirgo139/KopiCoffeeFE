import axios from "axios";

export const API_HOST = (
  process.env.REACT_APP_BACKEND_HOST || "http://localhost:8080/Kopi"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: API_HOST,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: đính kèm Bearer token nếu có (phục vụ khi bạn login xong)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kopi_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
