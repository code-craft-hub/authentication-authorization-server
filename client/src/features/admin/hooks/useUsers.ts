import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import { AdminUserFilters } from '@types';
import { QUERY_KEYS } from '@utils/helpers/constants';

export const useUsers = (filters: AdminUserFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_USERS, filters],
    queryFn: () => adminService.getUsers(filters),
    keepPreviousData: true,
  });
};