import axios from 'axios';

// When the React app is served by FastAPI on the same origin (port 8000),
// use a relative base URL so API calls go to the same host/port.
// When running in dev mode (Vite on 5173), point to the backend at 8000.
const isDev = import.meta.env.DEV;
const BASE_URL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  : '';   // relative URL → same origin as the page

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
