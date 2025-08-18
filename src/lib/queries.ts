// Base query functions with error handling and Supabase integration
// This provides a foundation for all data fetching operations

import { supabase } from './supabase';
import { QueryClient } from '@tanstack/react-query';
import type { 
  QueryResponse, 
  PaginatedResponse, 
  PaginationParams,
  QueryError,
  ProjectFilters,
  ClusterFilters,
  PathwayFilters,
  ReportFilters,
  ActivityFilters,
} from '../types/queries';

// Base query function with error handling
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown; count?: number | null }>
): Promise<QueryResponse<T>> {
  try {
    const result = await queryFn();
    
    if (result.error) {
      const message = (result.error as { message?: string } | null)?.message ?? 'Query failed';
      throw new Error(message);
    }
    
    return {
      data: result.data as T,
      error: null,
      count: result.count || undefined,
    };
  } catch (error) {
    console.error('Query execution error:', error);
    return {
      data: null as T,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Paginated query function
export async function executePaginatedQuery<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown; count?: number | null }>,
  pagination: PaginationParams = {}
): Promise<PaginatedResponse<T>> {
  const { page = 1, limit = 10 } = pagination;
  const offset = (page - 1) * limit;
  const from = offset;
  const to = offset + limit - 1;
  
  try {
    const result = await queryFn(from, to);
    
    if (result.error) {
      const message = (result.error as { message?: string } | null)?.message ?? 'Paginated query failed';
      throw new Error(message);
    }
    
    const totalCount = result.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      data: result.data || [],
      count: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  } catch (error) {
    console.error('Paginated query execution error:', error);
    throw error;
  }
}

// Authentication queries
export const authQueries = {
  // Get current user
  getCurrentUser: async () => {
    return executeQuery(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { data: user, error };
    });
  },
  
  // Get current session
  getCurrentSession: async () => {
    return executeQuery(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { data: session, error };
    });
  },
  
  // Get user permissions
  getUserPermissions: async (userId: string) => {
    return executeQuery(async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();
      return { data, error };
    });
  },
};

// Project queries
export const projectQueries = {
  // Get all projects
  getProjects: async (filters: ProjectFilters = {}, pagination?: PaginationParams) => {
    if (pagination) {
      return executePaginatedQuery(async (from, to) => {
        let query = supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .range(from, to)
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters.created_by) {
          query = query.eq('created_by', filters.created_by);
        }
        
        return query;
      }, pagination);
    }
    
    return executeQuery(async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      
      return query;
    });
  },
  
  // Get project by ID
  getProject: async (id: string) => {
    return executeQuery(async () => {
      return supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
    });
  },
};

// Cluster queries
export const clusterQueries = {
  // Get clusters by project
  getClusters: async (projectId: string, filters: ClusterFilters = {}, pagination?: PaginationParams) => {
    if (pagination) {
      return executePaginatedQuery(async (from, to) => {
        let query = supabase
          .from('clusters')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .range(from, to)
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        
        return query;
      }, pagination);
    }
    
    return executeQuery(async () => {
      let query = supabase
        .from('clusters')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      return query;
    });
  },
  
  // Get cluster by ID
  getCluster: async (id: string) => {
    return executeQuery(async () => {
      return supabase
        .from('clusters')
        .select('*')
        .eq('id', id)
        .single();
    });
  },
};

// Pathway queries
export const pathwayQueries = {
  // Get pathways by cluster
  getPathways: async (clusterId: string, filters: PathwayFilters = {}, pagination?: PaginationParams) => {
    if (pagination) {
      return executePaginatedQuery(async (from, to) => {
        let query = supabase
          .from('pathways')
          .select('*', { count: 'exact' })
          .eq('cluster_id', clusterId)
          .range(from, to)
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        
        return query;
      }, pagination);
    }
    
    return executeQuery(async () => {
      let query = supabase
        .from('pathways')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      return query;
    });
  },
  
  // Get pathway by ID
  getPathway: async (id: string) => {
    return executeQuery(async () => {
      return supabase
        .from('pathways')
        .select('*')
        .eq('id', id)
        .single();
    });
  },
};

// Report queries
export const reportQueries = {
  // Get dashboard data
  getDashboardData: async () => {
    return executeQuery(async () => {
      // This would typically call a database function or multiple queries
      // For now, we'll use a placeholder structure
      const { data, error } = await supabase.rpc('get_dashboard_data');
      return { data, error };
    });
  },
  
  // Get analytics data
  getAnalytics: async (type: string, filters: ReportFilters = {}) => {
    return executeQuery(async () => {
      const { data, error } = await supabase.rpc('get_analytics_data', {
        analytics_type: type,
        filters: filters
      });
      return { data, error };
    });
  },
};

// Activity queries
export const activityQueries = {
  // Get user activities
  getActivities: async (userId: string, filters: ActivityFilters = {}, pagination?: PaginationParams) => {
    if (pagination) {
      return executePaginatedQuery(async (from, to) => {
        let query = supabase
          .from('user_activities')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .range(from, to)
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.entity_type) {
          query = query.eq('entity_type', filters.entity_type);
        }
        if (filters.action_type) {
          query = query.eq('action_type', filters.action_type);
        }
        if (filters.session_id) {
          query = query.eq('session_id', filters.session_id);
        }
        
        return query;
      }, pagination);
    }
    
    return executeQuery(async () => {
      let query = supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.session_id) {
        query = query.eq('session_id', filters.session_id);
      }
      
      return query;
    });
  },
  
  // Get user sessions
  getUserSessions: async (userId: string) => {
    return executeQuery(async () => {
      return supabase
        .from('user_activity_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
    });
  },
};

// Error handling utility
export function handleQueryError(error: unknown): QueryError {
  if ((error as { message?: string })?.message) {
    return {
      message: (error as { message: string }).message,
      code: (error as { code?: string }).code,
      details: (error as { details?: unknown }).details,
      hint: (error as { hint?: string }).hint,
    };
  }
  
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

// Cache invalidation helpers
export const cacheHelpers = {
  // Invalidate all project-related queries
  invalidateProjectQueries: (queryClient: QueryClient, projectId?: string) => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      queryClient.invalidateQueries({ queryKey: ['clusters', 'list', projectId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  },
  
  // Invalidate all cluster-related queries
  invalidateClusterQueries: (queryClient: QueryClient, clusterId?: string, projectId?: string) => {
    if (clusterId) {
      queryClient.invalidateQueries({ queryKey: ['clusters', 'detail', clusterId] });
      queryClient.invalidateQueries({ queryKey: ['pathways', 'list', clusterId] });
    }
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['clusters', 'list', projectId] });
    }
  },
  
  // Invalidate dashboard and reports
  invalidateReports: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  },
};