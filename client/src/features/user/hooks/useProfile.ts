
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useProfile = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFILE],
    queryFn: userService.getProfile,
  });
};