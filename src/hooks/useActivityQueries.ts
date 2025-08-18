import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { activityLogger } from '../lib/activityLogger';
import type {
  ActivityFilters,
  PaginatedResponse
} from '../types/queries';
import type { ActivityActionType, EntityType } from '../lib/activityLogger';

// Activity tracking types
interface UserActivity {
  id: string;
  user_id: string;
  session_id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ActivitySession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  activity_count: number;
}

interface ActivityMetrics {
  totalActivities: number;
  totalSessions: number;
  averageSessionDuration: number;
  mostActiveEntityType: string;
  mostCommonAction: string;
  activitiesPerDay: Record<string, number>;
  lastActivity?: UserActivity;
}

// Activity query functions
const activityQueries = {
  // Get user activities
  getActivities: async (filters?: ActivityFilters): Promise<UserActivity[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters?.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end);
    }
    if (filters?.action_type) {
      query = query.eq('action_type', filters.action_type);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.session_id) {
      query = query.eq('session_id', filters.session_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get paginated activities
  getPaginatedActivities: async (
    page: number,
    limit: number,
    filters?: ActivityFilters
  ): Promise<PaginatedResponse<UserActivity>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('user_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end);
    }
    if (filters?.action_type) {
      query = query.eq('action_type', filters.action_type);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.session_id) {
      query = query.eq('session_id', filters.session_id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: data || [],
      count: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  },

  // Get user sessions
  getSessions: async (filters?: ActivityFilters): Promise<ActivitySession[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (filters?.date_range?.start) {
      query = query.gte('started_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('started_at', filters.date_range.end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get current session
  getCurrentSession: async (): Promise<ActivitySession | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw new Error(`Failed to get current session: ${(error as { message?: string }).message || 'Unknown error'}`);
    }

    return data;
  },

  // Get activity metrics
  getActivityMetrics: async (filters?: ActivityFilters): Promise<ActivityMetrics> => {
    const activities = await activityQueries.getActivities(filters);
    const sessions = await activityQueries.getSessions(filters);

    const totalActivities = activities.length;
    const totalSessions = sessions.length;
    
    const averageSessionDuration = sessions.length > 0
      ? sessions
          .filter(s => s.duration)
          .reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.filter(s => s.duration).length
      : 0;

    // Calculate most active entity type
    const entityTypeCounts = activities.reduce((acc, activity) => {
      acc[activity.entity_type] = (acc[activity.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveEntityType = Object.entries(entityTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Calculate most common action
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.action_type] = (acc[activity.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonAction = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Calculate activities per day
    const activitiesPerDay = activities.reduce((acc, activity) => {
      const date = activity.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lastActivity = activities[0] || undefined;

    return {
      totalActivities,
      totalSessions,
      averageSessionDuration,
      mostActiveEntityType,
      mostCommonAction,
      activitiesPerDay,
      lastActivity
    };
  },

  // Log activity (using existing activity logger)
  logActivity: async (data: {
    actionType: ActivityActionType;
    entityType: EntityType;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> => {
    await activityLogger.logActivity({
      action_type: data.actionType,
      entity_type: data.entityType,
      entity_id: data.entityId,
      metadata: data.metadata,
    });
  },

  // Start session (using existing activity logger)
  startSession: async (): Promise<string | null> => {
    return await activityLogger.startSession();
  },

  // End session (using existing activity logger)
  endSession: async (): Promise<void> => {
    await activityLogger.endSession();
  },

  // Flush activities (using existing activity logger)
  flushActivities: async (): Promise<void> => {
    await activityLogger.flushActivities();
  }
};

// Custom hooks for activities
export const useActivities = (filters?: ActivityFilters) => {
  return useQuery({
    queryKey: queryKeys.activities.list(filters ? (filters as unknown as Record<string, unknown>) : undefined),
    queryFn: () => activityQueries.getActivities(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false // Don't refetch on focus to avoid excessive requests
  });
};

export const usePaginatedActivities = (
  page: number,
  limit: number,
  filters?: ActivityFilters
) => {
  return useQuery({
    queryKey: queryKeys.activities.paginated(page, limit, filters ? (filters as unknown as Record<string, unknown>) : undefined),
    queryFn: () => activityQueries.getPaginatedActivities(page, limit, filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false
  });
};

export const useSessions = (filters?: ActivityFilters) => {
  return useQuery({
    queryKey: queryKeys.activities.sessions(filters ? (filters as unknown as Record<string, unknown>) : undefined),
    queryFn: () => activityQueries.getSessions(filters),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

export const useCurrentSession = () => {
  return useQuery({
    queryKey: queryKeys.activities.currentSession(),
    queryFn: activityQueries.getCurrentSession,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchOnWindowFocus: true
  });
};

export const useActivityMetrics = (filters?: ActivityFilters) => {
  return useQuery({
    queryKey: queryKeys.activities.metrics(filters ? (filters as unknown as Record<string, unknown>) : undefined),
    queryFn: () => activityQueries.getActivityMetrics(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
};

// Mutation hooks for activity tracking
export const useLogActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activityQueries.logActivity,
    onSuccess: () => {
      // Invalidate activity-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (error) => {
      console.error('Failed to log activity:', error);
    }
  });
};

export const useStartSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activityQueries.startSession,
    onSuccess: () => {
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.currentSession() });
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
    }
  });
};

export const useEndSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activityQueries.endSession,
    onSuccess: () => {
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.currentSession() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.metrics() });
    },
    onError: (error) => {
      console.error('Failed to end session:', error);
    }
  });
};

export const useFlushActivities = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activityQueries.flushActivities,
    onSuccess: () => {
      // Invalidate activity-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (error) => {
      console.error('Failed to flush activities:', error);
    }
  });
};

// Helper hook for activity tracking with automatic logging
export const useActivityTracker = () => {
  const logActivity = useLogActivity();
  
  const trackActivity = (actionType: ActivityActionType, entityType: EntityType, entityId?: string, metadata?: Record<string, unknown>) => {
    logActivity.mutate({ actionType, entityType, entityId, metadata });
  };
  
  return {
    trackActivity,
    isLogging: logActivity.isPending,
    error: logActivity.error
  };
};

// Hook for real-time activity updates
export const useRealtimeActivities = (filters?: ActivityFilters) => {
  const queryClient = useQueryClient();
  const activitiesQuery = useActivities(filters);
  
  React.useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const channel = supabase
        .channel('user-activities-changes')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_activities',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.activities.list(filters ? (filters as unknown as Record<string, unknown>) : undefined) });
            queryClient.invalidateQueries({ queryKey: queryKeys.activities.metrics(filters ? (filters as unknown as Record<string, unknown>) : undefined) });
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [queryClient, filters]);
  
  return activitiesQuery;
};