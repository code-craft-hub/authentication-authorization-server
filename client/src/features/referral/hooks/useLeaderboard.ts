
import { useQuery } from '@tanstack/react-query';
import { referralService } from '../services/referral.service';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useLeaderboard = (limit: number = 10) => {
  return useQuery({
    queryKey: [QUERY_KEYS.LEADERBOARD, limit],
    queryFn: () => referralService.getLeaderboard(limit),
  });
};
