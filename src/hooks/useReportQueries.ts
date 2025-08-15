import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import type {
  DashboardData,
  AnalyticsData,
  PerformanceMetrics,
  ReportFilters,
  ActivitySummary,
  ProjectStats,
  ClusterStats,
  PathwayStats
} from '../types/queries';

// Report query functions
const reportQueries = {
  // Get dashboard data
  getDashboardData: async (filters?: ReportFilters): Promise<DashboardData> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get project stats
    let projectQuery = supabase
      .from('projects')
      .select('id, name, status, created_at')
      .eq('created_by', user.id);

    if (filters?.dateRange?.start) {
      projectQuery = projectQuery.gte('created_at', filters.dateRange.start);
    }
    if (filters?.dateRange?.end) {
      projectQuery = projectQuery.lte('created_at', filters.dateRange.end);
    }

    const projects = await executeQuery(projectQuery);

    // Get cluster stats
    const clusters = await executeQuery(
      supabase
        .from('clusters')
        .select('id, project_id, status, created_at')
        .in('project_id', projects.map(p => p.id) || [])
    );

    // Get pathway stats
    const pathways = await executeQuery(
      supabase
        .from('pathways')
        .select('id, cluster_id, status, created_at')
        .in('cluster_id', clusters.map(c => c.id) || [])
    );

    // Get intervention stats
    const interventions = await executeQuery(
      supabase
        .from('interventions')
        .select('id, pathway_id, status, created_at')
        .in('pathway_id', pathways.map(p => p.id) || [])
    );

    // Get action stats
    const actions = await executeQuery(
      supabase
        .from('actions')
        .select('id, intervention_id, status, created_at')
        .in('intervention_id', interventions.map(i => i.id) || [])
    );

    // Calculate stats
    const projectStats: ProjectStats = {
      total: projects.length,
      not_started: projects.filter(p => p.status === 'not_started').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      at_risk: projects.filter(p => p.status === 'at_risk').length,
      completed: projects.filter(p => p.status === 'completed').length
    };

    const clusterStats: ClusterStats = {
      total: clusters.length,
      not_started: clusters.filter(c => c.status === 'not_started').length,
      in_progress: clusters.filter(c => c.status === 'in_progress').length,
      at_risk: clusters.filter(c => c.status === 'at_risk').length,
      completed: clusters.filter(c => c.status === 'completed').length
    };

    const pathwayStats: PathwayStats = {
      total: pathways.length,
      not_started: pathways.filter(p => p.status === 'not_started').length,
      in_progress: pathways.filter(p => p.status === 'in_progress').length,
      at_risk: pathways.filter(p => p.status === 'at_risk').length,
      completed: pathways.filter(p => p.status === 'completed').length
    };

    return {
      projects: projectStats,
      clusters: clusterStats,
      pathways: pathwayStats,
      interventions: {
        total: interventions.length,
        not_started: interventions.filter(i => i.status === 'not_started').length,
        in_progress: interventions.filter(i => i.status === 'in_progress').length,
        at_risk: interventions.filter(i => i.status === 'at_risk').length,
        completed: interventions.filter(i => i.status === 'completed').length
      },
      actions: {
        total: actions.length,
        not_started: actions.filter(a => a.status === 'not_started').length,
        in_progress: actions.filter(a => a.status === 'in_progress').length,
        at_risk: actions.filter(a => a.status === 'at_risk').length,
        completed: actions.filter(a => a.status === 'completed').length
      },
      recentProjects: projects.slice(0, 5),
      lastUpdated: new Date().toISOString()
    };
  },

  // Get analytics data
  getAnalyticsData: async (filters?: ReportFilters): Promise<AnalyticsData> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get activity data
    let activityQuery = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters?.dateRange?.start) {
      activityQuery = activityQuery.gte('created_at', filters.dateRange.start);
    }
    if (filters?.dateRange?.end) {
      activityQuery = activityQuery.lte('created_at', filters.dateRange.end);
    }

    const activities = await executeQuery(activityQuery);

    // Process activity data for analytics
    const activityByType = activities.reduce((acc: any, activity: any) => {
      const type = activity.action_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activityByDate = activities.reduce((acc: any, activity: any) => {
      const date = activity.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activityByEntity = activities.reduce((acc: any, activity: any) => {
      const entity = activity.entity_type;
      acc[entity] = (acc[entity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActivities: activities.length,
      activityByType,
      activityByDate,
      activityByEntity,
      averageSessionDuration: 0, // Calculate from session data
      mostActiveHours: [], // Calculate from activity timestamps
      lastUpdated: new Date().toISOString()
    };
  },

  // Get performance metrics
  getPerformanceMetrics: async (filters?: ReportFilters): Promise<PerformanceMetrics> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get completion rates
    const projects = await executeQuery(
      supabase
        .from('projects')
        .select('status')
        .eq('created_by', user.id)
    );

    const projectIds = projects.map((p: any) => p.id);
    if (projectIds.length === 0) {
      return {
        completionRates: { projects: 0, clusters: 0, pathways: 0 },
        averageCompletionTime: { projects: 0, clusters: 0, pathways: 0 },
        productivityTrends: { daily: [], weekly: [], monthly: [] },
        bottlenecks: [],
        recommendations: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const clusters = await executeQuery(
      supabase
        .from('clusters')
        .select('status, project_id')
        .in('project_id', projectIds)
    );

    const clusterIds = clusters.map((c: any) => c.id);
    const pathways = clusterIds.length > 0 ? await executeQuery(
      supabase
        .from('pathways')
        .select('status, cluster_id')
        .in('cluster_id', clusterIds)
    ) : [];

    const completionRates = {
      projects: projects.length > 0 ? (projects.filter((p: any) => p.status === 'completed').length / projects.length) * 100 : 0,
      clusters: clusters.length > 0 ? (clusters.filter((c: any) => c.status === 'completed').length / clusters.length) * 100 : 0,
      pathways: pathways.length > 0 ? (pathways.filter((p: any) => p.status === 'completed').length / pathways.length) * 100 : 0
    };

    const averageCompletionTime = {
      projects: 0, // Calculate from created_at to completion
      clusters: 0,
      pathways: 0
    };

    const productivityTrends = {
      daily: [],
      weekly: [],
      monthly: []
    };

    return {
      completionRates,
      averageCompletionTime,
      productivityTrends,
      bottlenecks: [], // Identify common bottlenecks
      recommendations: [], // AI-generated recommendations
      lastUpdated: new Date().toISOString()
    };
  },

  // Get activity summary
  getActivitySummary: async (filters?: ReportFilters): Promise<ActivitySummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let activityQuery = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id);

    if (filters?.dateRange?.start) {
      activityQuery = activityQuery.gte('created_at', filters.dateRange.start);
    }
    if (filters?.dateRange?.end) {
      activityQuery = activityQuery.lte('created_at', filters.dateRange.end);
    }

    const activities = await executeQuery(activityQuery);

    const totalActivities = activities.length;
    const uniqueSessions = new Set(activities.map((a: any) => a.session_id)).size;
    const totalTimeSpent = 0; // Calculate from session durations
    const mostActiveDay = ''; // Calculate from activity dates
    const topActions = []; // Calculate most frequent actions

    return {
      totalActivities,
      uniqueSessions,
      totalTimeSpent,
      mostActiveDay,
      topActions,
      lastUpdated: new Date().toISOString()
    };
  }
};

// Custom hooks for reports
export const useDashboardData = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: queryKeys.reports.dashboard(filters),
    queryFn: () => reportQueries.getDashboardData(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });
};

export const useAnalyticsData = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: queryKeys.reports.analytics(filters),
    queryFn: () => reportQueries.getAnalyticsData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

export const usePerformanceMetrics = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: queryKeys.reports.performance(filters),
    queryFn: () => reportQueries.getPerformanceMetrics(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });
};

export const useActivitySummary = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: queryKeys.reports.activitySummary(filters),
    queryFn: () => reportQueries.getActivitySummary(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

// Real-time dashboard hook
export const useRealtimeDashboard = (filters?: ReportFilters) => {
  const queryClient = useQueryClient();
  
  const dashboardQuery = useDashboardData(filters);
  
  // Set up real-time subscriptions
  React.useEffect(() => {
    const channels = [
      supabase
        .channel('projects-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'projects' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.dashboard(filters) });
          }
        ),
      supabase
        .channel('clusters-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'clusters' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.dashboard(filters) });
          }
        ),
      supabase
        .channel('pathways-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'pathways' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.dashboard(filters) });
          }
        )
    ];
    
    channels.forEach(channel => channel.subscribe());
    
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient, filters]);
  
  return dashboardQuery;
};

// Helper hook for refreshing all report data
export const useRefreshReports = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
  };
};