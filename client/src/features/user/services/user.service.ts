// src/features/user/services/user.service.ts
import { apiClient } from '@lib/axios';
import { API_ENDPOINTS } from '@utils/helpers/constants';
import { User, UpdateProfileRequest, ApiResponse } from '@types';

export const userService = {
  async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE);
    return response.data.data!;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      API_ENDPOINTS.USER.UPDATE_PROFILE,
      data
    );
    return response.data.data!;
  },
};

// src/features/user/hooks/useProfile.ts

// src/features/user/hooks/useUpdateProfile.ts

// src/features/referral/services/referral.service.ts

// src/features/referral/hooks/useReferralStats.ts

// src/features/referral/hooks/useReferredUsers.ts


// src/features/referral/hooks/useCreditHistory.ts

// src/features/referral/hooks/useLeaderboard.ts
// src/features/admin/services/admin.service.ts