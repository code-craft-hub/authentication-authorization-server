import { useQuery } from '@tanstack/react-query';
import { referralService } from '../services/referral.service';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useReferredUsers = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.REFERRED_USERS],
    queryFn: referralService.getReferredUsers,
  });
};