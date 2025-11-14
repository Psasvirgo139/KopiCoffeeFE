import axios from "axios";

export const API_HOST = (
  process.env.REACT_APP_BACKEND_HOST || "https://web-kopicafebe.onrender.com"
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
  let token = null;
  try {
    token = localStorage.getItem("kopi_token");
  } catch (e) {
    console.warn("[API Interceptor] Failed to get token from localStorage:", e);
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log("[API Interceptor] Token attached to request:", config.url);
    }
  } else {
    // Always warn if no token (important for debugging)
    console.warn("[API Interceptor] No token found for request:", config.url);
  }
  return config;
});

// Response interceptor để log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log canceled/aborted requests as errors (they're expected)
    if (error.message === 'canceled' || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      if (process.env.NODE_ENV === 'development') {
        console.log("[API Interceptor] Request was canceled:", error.config?.url);
      }
      return Promise.reject(error);
    }
    
    if (error.response) {
      console.error("[API Interceptor] Response error:", {
        url: error.config?.url,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error("[API Interceptor] Request error (no response):", {
        url: error.config?.url,
        message: error.message
      });
    } else {
      console.error("[API Interceptor] Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
