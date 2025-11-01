/**
 * API Client
 * 
 * Centralized HTTP client for backend API communication.
 * Token must be manually added to requests via headers.
 * Use with Clerk's getToken() in client components or auth() in server components.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiError {
  message?: string;
  [key: string]: unknown;
}

/**
 * Create axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - token should be added per-request
 * Example usage:
 * ```
 * const { getToken } = useAuth();
 * const token = await getToken();
 * api.user.getProfile(token);
 * ```
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Token will be added per request
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      console.error('API Error:', message);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response from server');
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * API service methods
 * All methods accept an optional token parameter for authentication
 */

interface UserUpdateData {
  [key: string]: unknown;
}

interface GetUsersParams {
  [key: string]: unknown;
}

export const api = {
  // Health check
  health: () => apiClient.get('/api/health'),
  
  // User endpoints
  user: {
    getProfile: (token?: string | null) => 
      apiClient.get('/api/users/profile', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    updateProfile: (data: UserUpdateData, token?: string | null) => 
      apiClient.put('/api/users/profile', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getAllUsers: (params?: GetUsersParams, token?: string | null) => 
      apiClient.get('/api/users', { 
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    updateRole: (userId: string, role: string, token?: string | null) => 
      apiClient.put(`/api/users/${userId}/role`, { role }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    deleteUser: (userId: string, token?: string | null) => 
      apiClient.delete(`/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // TODO: Add more API endpoints as features are developed
  // courses: { ... },
  // enrollments: { ... },
  // payments: { ... },
  // meetings: { ... },
};

export default apiClient;
