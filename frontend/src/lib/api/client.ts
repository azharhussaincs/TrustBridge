import axios from 'axios';
import { getApiBaseUrl } from './config';
import { performLogout } from '@/lib/auth/session';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for JWT and dynamic API host (localhost vs LAN IP)
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      performLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
