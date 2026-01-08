
import { apiClient } from '@lib/axios';
import { API_ENDPOINTS } from '@utils/helpers/constants';
import {
  ReferralStats,
  ReferredUser,
  CreditHistory,
  LeaderboardEntry,
  ApiResponse,
} from '@types';

export const referralService = {
  async getReferralStats(): Promise<ReferralStats> {
    const response = await apiClient.get<ApiResponse<ReferralStats>>(
      API_ENDPOINTS.USER.REFERRAL_STATS
    );
    return response.data.data!;
  },

  async getReferredUsers(): Promise<ReferredUser[]> {
    const response = await apiClient.get<ApiResponse<ReferredUser[]>>(
      API_ENDPOINTS.USER.REFERRED_USERS
    );
    return response.data.data!;
  },

  async getCreditHistory(): Promise<CreditHistory> {
    const response = await apiClient.get<ApiResponse<CreditHistory>>(
      API_ENDPOINTS.USER.CREDIT_HISTORY
    );
    return response.data.data!;
  },

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<ApiResponse<LeaderboardEntry[]>>(
      `${API_ENDPOINTS.USER.LEADERBOARD}?limit=${limit}`
    );
    return response.data.data!;
  },
};