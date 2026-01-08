
import { apiClient } from '@lib/axios';
import { API_ENDPOINTS } from '@utils/helpers/constants';
import {
  User,
  PaginatedResponse,
  AdminUserFilters,
  AdminUpdateUserRequest,
  AdminUserActionRequest,
  AdminDashboardStats,
  AuditLog,
  PaginationParams,
  ApiResponse,
} from '@types';

export const adminService = {
  async getUsers(filters: AdminUserFilters): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(
      `${API_ENDPOINTS.ADMIN.USERS}?${params.toString()}`
    );
    return response.data.data!;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.ADMIN.USER_BY_ID(userId)
    );
    return response.data.data!;
  },

  async updateUser(userId: string, data: AdminUpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      API_ENDPOINTS.ADMIN.UPDATE_USER(userId),
      data
    );
    return response.data.data!;
  },

  async suspendUser(userId: string, data: AdminUserActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.ADMIN.SUSPEND_USER(userId), data);
  },

  async banUser(userId: string, data: AdminUserActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.ADMIN.BAN_USER(userId), data);
  },

  async signOutUser(userId: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.ADMIN.SIGN_OUT_USER(userId));
  },

  async signOutAllUsers(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.ADMIN.SIGN_OUT_ALL, {
      confirmation: 'SIGN_OUT_ALL_USERS',
    });
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.DELETE_USER(userId));
  },

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await apiClient.get<ApiResponse<AdminDashboardStats>>(
      API_ENDPOINTS.ADMIN.DASHBOARD
    );
    return response.data.data!;
  },

  async getAuditLogs(params: PaginationParams & { userId?: string; action?: string }): Promise<PaginatedResponse<AuditLog>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });

    const response = await apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(
      `${API_ENDPOINTS.ADMIN.AUDIT_LOGS}?${queryParams.toString()}`
    );
    return response.data.data!;
  },
};