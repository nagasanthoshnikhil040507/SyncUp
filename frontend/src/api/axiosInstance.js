import axios from 'axios';

/**
 * Axios Instance
 *
 * Centralized HTTP client configuration.
 * - baseURL: loaded from VITE_API_BASE_URL env variable
 * - Request interceptor: attaches JWT token from localStorage
 * - Response interceptor: handles 401 unauthorized globally
 *
 * All API modules (auth.api.js, user.api.js, etc.) will import
 * this instance instead of raw axios.
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT Token ──
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor: Handle 401 Globally ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      // TODO: Implement token refresh logic in Phase 2
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
