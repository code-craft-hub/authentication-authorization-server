import { useAppSelector } from '@store';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSuperAdmin,
  };
};