import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAppDispatch } from '@store';
import { logout } from '../store/authSlice';
import { ROUTES, STORAGE_KEYS } from '@utils/helpers/constants';
import { getStorageItem, clearStorage } from '@utils/helpers/storage';
import toast from 'react-hot-toast';

export const useLogout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
      await authService.logout(refreshToken || undefined);
    },
    onSuccess: () => {
      dispatch(logout());
      clearStorage();
      toast.success('Logged out successfully');
      navigate(ROUTES.LOGIN);
    },
    onError: () => {
      // Even if API call fails, clear local state
      dispatch(logout());
      clearStorage();
      navigate(ROUTES.LOGIN);
    },
  });
};
