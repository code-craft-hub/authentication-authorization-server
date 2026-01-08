import { useQuery } from '@tanstack/react-query';
import { referralService } from '../services/referral.service';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useReferralStats = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.REFERRAL_STATS],
    queryFn: referralService.getReferralStats,
  });
};
