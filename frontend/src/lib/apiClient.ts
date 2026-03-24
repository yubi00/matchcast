import axios from 'axios';
import { getAccessToken, refreshAuth } from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true,
});

// ── Request interceptor — attach access token to every request ────────────────
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401, refresh and retry once ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshed = await refreshAuth();
      if (refreshed) {
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
