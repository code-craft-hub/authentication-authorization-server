import { useQuery } from '@tanstack/react-query';
import { referralService } from '../services/referral.service';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useCreditHistory = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.CREDIT_HISTORY],
    queryFn: referralService.getCreditHistory,
  });
};
