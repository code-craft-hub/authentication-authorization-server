import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAppDispatch } from '@store';
import { setCredentials } from '../store/authSlice';
import { RegisterRequest } from '@types';
import { ROUTES, STORAGE_KEYS } from '@utils/helpers/constants';
import { setStorageItem, setStorageObject } from '@utils/helpers/storage';
import toast from 'react-hot-toast';

export const useRegister = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
      setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken);
      setStorageObject(STORAGE_KEYS.USER, data.user);

      dispatch(setCredentials({ user: data.user, tokens: data.tokens }));

      toast.success('Registration successful!');
      navigate(ROUTES.DASHBOARD);
    },
  });
};