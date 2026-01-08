import { useEffect } from 'react';
import { AppRoutes } from './routes';
import { useAppDispatch } from '@store';
import { setCredentials } from '@features/auth/store/authSlice';
import { getStorageItem, getStorageObject } from '@utils/helpers/storage';
import { STORAGE_KEYS } from '@utils/helpers/constants';
import { User, AuthTokens } from '@types';

function App() {
  const dispatch = useAppDispatch();

  // Rehydrate auth state on app mount
  useEffect(() => {
    const token = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    const user = getStorageObject<User>(STORAGE_KEYS.USER);

    if (token && refreshToken && user) {
      const tokens: AuthTokens = {
        accessToken: token,
        refreshToken: refreshToken,
      };
      dispatch(setCredentials({ user, tokens }));
    }
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppRoutes />
    </div>
  );
}

export default App;
