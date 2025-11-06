import { QueryClient } from '@tanstack/react-query';
import { handleMutationError } from './errorHandler';

// Create a client with optimized settings for our application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (we'll handle this selectively)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Show error notifications by default
      onError: (error) => {
        handleMutationError(error);
      },
    },
  },
});

// Utility functions for cache management
export const queryUtils = {
  // Invalidate all queries
  invalidateAll: () => queryClient.invalidateQueries(),
  
  // Invalidate queries by key pattern
  invalidateByKey: (queryKey: string[]) => 
    queryClient.invalidateQueries({ queryKey }),
  
  // Remove queries from cache
  removeQueries: (queryKey: string[]) => 
    queryClient.removeQueries({ queryKey }),
  
  // Prefetch data
  prefetch: (queryKey: string[], queryFn: () => Promise<unknown>) => 
    queryClient.prefetchQuery({ queryKey, queryFn }),
  
  // Set query data manually
  setQueryData: (queryKey: string[], data: unknown) => 
    queryClient.setQueryData(queryKey, data),
  
  // Get cached query data
  getQueryData: (queryKey: string[]) => 
    queryClient.getQueryData(queryKey),
};