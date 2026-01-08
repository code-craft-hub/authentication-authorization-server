// src/lib/axios.ts
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { APP_CONFIG, STORAGE_KEYS, ROUTES } from '@utils/helpers/constants';
import { getStorageItem, setStorageItem, removeStorageItem } from '@utils/helpers/storage';
import toast from 'react-hot-toast';

// Create axios instance
export const apiClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        processQueue(error, null);
        handleLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${APP_CONFIG.API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    handleApiError(error);
    return Promise.reject(error);
  }
);

const handleLogout = () => {
  removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
  removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  removeStorageItem(STORAGE_KEYS.USER);
  
  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = ROUTES.LOGIN;
  }
};

const handleApiError = (error: AxiosError<any>) => {
  if (!error.response) {
    toast.error('Network error. Please check your connection.');
    return;
  }

  const status = error.response.status;
  const message = error.response.data?.error || error.response.data?.message || 'An error occurred';

  switch (status) {
    case 400:
      toast.error(message);
      break;
    case 401:
      // Already handled in interceptor
      break;
    case 403:
      toast.error('You do not have permission to perform this action');
      break;
    case 404:
      toast.error('Resource not found');
      break;
    case 429:
      toast.error('Too many requests. Please try again later.');
      break;
    case 500:
    case 502:
    case 503:
      toast.error('Server error. Please try again later.');
      break;
    default:
      toast.error(message);
  }
};

