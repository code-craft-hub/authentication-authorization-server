import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
      onError: (error: any) => {
        const message = error?.response?.data?.error || error?.message || 'An error occurred';
        toast.error(message);
      },
    },
  },
});
