import type { ReactNode } from "react";
import { queryClient } from "./react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClientProvider } from "@tanstack/react-query";


// Query provider wrapper
interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

// Prefetch utilities
export const prefetchQuery = async (queryKey: any[], queryFn: () => Promise<any>) => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
};

export const invalidateQueries = (queryKey: any[]) => {
  queryClient.invalidateQueries({ queryKey });
};

export const setQueryData = <T,>(queryKey: any[], data: T) => {
  queryClient.setQueryData(queryKey, data);
};

export const getQueryData = <T,>(queryKey: any[]): T | undefined => {
  return queryClient.getQueryData(queryKey);
};