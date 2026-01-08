
import { useMutation } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import { AdminUpdateUserRequest, AdminUserActionRequest } from '@types';
import { invalidateQueries } from '@lib/tanstack';
import { QUERY_KEYS } from '@utils/helpers/constants';
import toast from 'react-hot-toast';

export const useUpdateUser = () => {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUpdateUserRequest }) =>
      adminService.updateUser(userId, data),
    onSuccess: () => {
      invalidateQueries([QUERY_KEYS.ADMIN_USERS]);
      toast.success('User updated successfully');
    },
  });
};

export const useSuspendUser = () => {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUserActionRequest }) =>
      adminService.suspendUser(userId, data),
    onSuccess: () => {
      invalidateQueries([QUERY_KEYS.ADMIN_USERS]);
      toast.success('User suspended successfully');
    },
  });
};

export const useBanUser = () => {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUserActionRequest }) =>
      adminService.banUser(userId, data),
    onSuccess: () => {
      invalidateQueries([QUERY_KEYS.ADMIN_USERS]);
      toast.success('User banned successfully');
    },
  });
};

export const useSignOutUser = () => {
  return useMutation({
    mutationFn: (userId: string) => adminService.signOutUser(userId),
    onSuccess: () => {
      invalidateQueries([QUERY_KEYS.ADMIN_USERS]);
      toast.success('User signed out successfully');
    },
  });
};

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      invalidateQueries([QUERY_KEYS.ADMIN_USERS]);
      toast.success('User deleted successfully');
    },
  });
};
