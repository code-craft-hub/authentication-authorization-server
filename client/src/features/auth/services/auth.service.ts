// src/features/auth/services/auth.service.ts
import { apiClient } from '@lib/axios';
import { API_ENDPOINTS } from '@utils/helpers/constants';
import {
  LoginRequest,
  RegisterRequest,
  GoogleAuthRequest,
  RefreshTokenRequest,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ApiResponse,
} from '@types';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response.data.data!;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data.data!;
  },

  async googleAuth(data: GoogleAuthRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.GOOGLE,
      data
    );
    return response.data.data!;
  },

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
      API_ENDPOINTS.AUTH.REFRESH,
      data
    );
    return response.data.data!;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  },

  async logoutAllSessions(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
  },
};
