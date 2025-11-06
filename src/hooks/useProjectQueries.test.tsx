import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClusters, useCluster } from './useProjectQueries';
import { createMockCluster } from '../test/utils';
import * as supabaseModule from '../lib/supabase';
import * as queriesModule from '../lib/queries';
import React from 'react';

// Mock Supabase - return a chainable mock object
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
          single: vi.fn(),
        })),
        order: vi.fn(),
        single: vi.fn(),
      })),
    })),
  },
}));

// Mock executeQuery
vi.mock('../lib/queries', () => ({
  executeQuery: vi.fn(),
}));

describe('useProjectQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe('useClusters', () => {
    it('should fetch clusters successfully', async () => {
      const mockClusters = [
        createMockCluster({ id: '1', name: 'Cluster 1' }),
        createMockCluster({ id: '2', name: 'Cluster 2' }),
      ];

      // Mock executeQuery directly - it's what the hook actually uses
      vi.mocked(queriesModule.executeQuery).mockResolvedValue({
        data: mockClusters,
        error: null,
      } as any);

      const { result } = renderHook(() => useClusters('project-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClusters);
    });

    it('should handle errors gracefully', async () => {
      // Mock executeQuery to throw an error
      vi.mocked(queriesModule.executeQuery).mockRejectedValue(
        new Error('Failed to fetch clusters')
      );

      const { result } = renderHook(() => useClusters('project-1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Failed to fetch clusters');
    });
  });

  describe('useCluster', () => {
    it('should fetch a single cluster successfully', async () => {
      const mockCluster = createMockCluster({ id: '1', name: 'Test Cluster' });

      // Mock executeQuery directly
      vi.mocked(queriesModule.executeQuery).mockResolvedValue({
        data: mockCluster,
        error: null,
      } as any);

      const { result } = renderHook(() => useCluster('1'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCluster);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCluster(''), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });
});

