import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAppDispatch } from '@store';
import { setCredentials } from '../store/authSlice';
import { GoogleAuthRequest } from '@types';
import { ROUTES, STORAGE_KEYS } from '@utils/helpers/constants';
import { setStorageItem, setStorageObject } from '@utils/helpers/storage';
import toast from 'react-hot-toast';

export const useGoogleAuth = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (data: GoogleAuthRequest) => authService.googleAuth(data),
    onSuccess: (data) => {
      setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
      setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken);
      setStorageObject(STORAGE_KEYS.USER, data.user);

      dispatch(setCredentials({ user: data.user, tokens: data.tokens }));

      toast.success('Google authentication successful!');
      navigate(ROUTES.DASHBOARD);
    },
  });
};
