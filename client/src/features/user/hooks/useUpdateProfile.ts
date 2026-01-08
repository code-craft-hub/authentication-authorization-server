
import { useMutation } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { useAppDispatch } from '@store';
import { updateUser } from '@features/auth/store/authSlice';
import { UpdateProfileRequest } from '@types';
import { invalidateQueries } from '@lib/react-query';
import { QUERY_KEYS, STORAGE_KEYS } from '@utils/helpers/constants';
import { setStorageObject, getStorageObject } from '@utils/helpers/storage';
import toast from 'react-hot-toast';

export const useUpdateProfile = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => userService.updateProfile(data),
    onSuccess: (data) => {
      dispatch(updateUser(data));
      
      // Update storage
      const storedUser = getStorageObject(STORAGE_KEYS.USER);
      if (storedUser) {
        setStorageObject(STORAGE_KEYS.USER, { ...storedUser, ...data });
      }

      invalidateQueries([QUERY_KEYS.PROFILE]);
      toast.success('Profile updated successfully');
    },
  });
};