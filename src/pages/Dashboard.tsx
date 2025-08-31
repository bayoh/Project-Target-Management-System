import React, { useState, useMemo } from 'react';

import { 
  TreePine, 
  Recycle, 
  Building2, 
  Landmark, 
  MonitorSmartphone,
  GraduationCap,
  Droplets,
  Heart,
  Sprout,
  AlertTriangle
} from 'lucide-react';
import { ProjectStats } from '../components/dashboard/ProjectStats.tsx'
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';

interface DashboardStats {
  clusters: {
    total: number;
    pathways: number;
    interventions: number;
  };
  interventions: {
    total: number;
    onTrack: number;
    atRisk: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  actions: {
    total: number;
    onTrack: number;
    atRisk: number;
    completed: number;
    notStarted: number
    byStatus: Record<string, number>;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    delayed: number;
    byStatus: Record<string, number>;
  };
}

interface ClusterWithProgress {
  id: number;
  name: string;
  color: string;
  pathways: PathwayWithProgress[];
}

interface PathwayWithProgress {
  id: string;
  name: string;
  icon: React.ReactNode;
  progress: number;
  status: 'on-track' | 'at-risk' | 'delayed';
  interventionCount: number;
  completedInterventions: number;
  atRiskInterventions: number;
}

// Query function for dashboard data
const fetchDashboardData = async () => {
  // Fetch all required data in parallel using executeQuery
  const [
    clustersResult,
    pathwaysResult,
    interventionsResult,
    actionsResult,
    tasksResult
  ] = await Promise.all([
    executeQuery(supabase.from('clusters').select('*')),
    executeQuery(supabase.from('pathways').select('*, cluster_id')),
    executeQuery(supabase.from('interventions').select('*, pathway_id, status')),
    executeQuery(supabase.from('actions').select('*, intervention_id, status')),
    executeQuery(supabase.from('tasks').select('*, action_id, status'))
  ]);

  return {
    clusters: clustersResult.data || [],
    pathways: pathwaysResult.data || [],
    interventions: interventionsResult.data || [],
    actions: actionsResult.data || [],
    tasks: tasksResult.data || []
  };
};

export function Dashboard() {
  const { trackPageView } = useActivityTracking();

  // Use TanStack Query for data fetching
  const { data: dashboardData, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.dashboard.adminData(),
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Process clusters and pathways using useMemo for performance
  const { stats, clusters } = useMemo(() => {
    if (!dashboardData) {
      return {
        stats: {
          clusters: { total: 0, pathways: 0, interventions: 0 },
          interventions: { total: 0, onTrack: 0, atRisk: 0, completed: 0, byStatus: {} },
          actions: { total: 0, onTrack: 0, atRisk: 0, completed: 0, notStarted: 0, byStatus: {} },
          tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0, byStatus: {} }
        },
        clusters: []
      };
    }

    const { clusters: clustersData, pathways: pathwaysData, interventions: interventionsData, actions: actionsData, tasks: tasksData } = dashboardData;

    // Process clusters and pathways
    const processedClusters = clustersData.map((cluster: any) => {
      const clusterPathways = pathwaysData.filter(p => p.cluster_id === cluster.id);
      const pathwaysWithProgress = clusterPathways.map(pathway => {
        const pathwayInterventions = interventionsData.filter(i => i.pathway_id === pathway.id);
        const completedCount = pathwayInterventions.filter(i => i.status === 'completed').length;
        const atRiskCount = pathwayInterventions.filter(i => i.status === 'at_risk').length;
        const progress = pathwayInterventions.length > 0 
          ? (completedCount / pathwayInterventions.length) * 100 
          : 0;

        return {
          id: pathway.id,
          name: pathway.name,
          icon: getPathwayIcon(pathway.name),
          progress,
          status: getPathwayStatus(completedCount, atRiskCount, pathwayInterventions.length),
          interventionCount: pathwayInterventions.length,
          completedInterventions: completedCount,
          atRiskInterventions: atRiskCount
        };
      });

      return {
        id: cluster.id,
        name: cluster.name,
        color: getClusterColor(cluster.name),
        pathways: pathwaysWithProgress
      };
    });

    // Calculate statistics
    const newStats: DashboardStats = {
      clusters: {
        total: clustersData.length,
        pathways: pathwaysData.length,
        interventions: interventionsData.length
      },
      interventions: {
        total: interventionsData.length,
        onTrack: interventionsData.filter(i => i.status === 'in_progress').length,
        atRisk: interventionsData.filter(i => i.status === 'at_risk').length,
        completed: interventionsData.filter(i => i.status === 'completed').length,
        byStatus: countByStatus(interventionsData)
      },
      actions: {
        total: actionsData.length,
        onTrack: actionsData.filter(a => a.status === 'in_progress').length,
        atRisk: actionsData.filter(a => a.status === 'at_risk').length,
        completed: actionsData.filter(a => a.status === 'completed').length,
        notStarted: actionsData.filter(a => a.status === 'not_started').length,
        byStatus: countByStatus(actionsData)
      },
      tasks: {
        total: tasksData.length,
        pending: tasksData.filter(t => t.status === 'pending').length,
        inProgress: tasksData.filter(t => t.status === 'in_progress').length,
        completed: tasksData.filter(t => t.status === 'completed').length,
        delayed: tasksData.filter(t => t.status === 'delayed').length,
        byStatus: countByStatus(tasksData)
      }
    };

    return { stats: newStats, clusters: processedClusters };
  }, [dashboardData]);

  const countByStatus = (items: any[]): Record<string, number> => {
    return items.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  };

  const getPathwayIcon = (name: string): React.ReactNode => {
    if (name.toLowerCase().includes('reforestation')) return <TreePine className="h-6 w-6" />;
    if (name.toLowerCase().includes('waste')) return <Recycle className="h-6 w-6" />;
    if (name.toLowerCase().includes('settlement')) return <Building2 className="h-6 w-6" />;
    if (name.toLowerCase().includes('heritage')) return <Landmark className="h-6 w-6" />;
    if (name.toLowerCase().includes('digital')) return <MonitorSmartphone className="h-6 w-6" />;
    if (name.toLowerCase().includes('education')) return <GraduationCap className="h-6 w-6" />;
    if (name.toLowerCase().includes('water')) return <Droplets className="h-6 w-6" />;
    if (name.toLowerCase().includes('health')) return <Heart className="h-6 w-6" />;
    return <Sprout className="h-6 w-6" />;
  };

  const getClusterColor = (name: string): string => {
    if (name.toLowerCase().includes('climate')) return 'bg-emerald-800';
    if (name.toLowerCase().includes('heritage')) return 'bg-orange-700';
    if (name.toLowerCase().includes('digital')) return 'bg-purple-700';
    if (name.toLowerCase().includes('human')) return 'bg-blue-800';
    return 'bg-gray-700';
  };

  const getPathwayStatus = (completed: number, atRisk: number, total: number): 'on-track' | 'at-risk' | 'delayed' => {
    if (total === 0) return 'on-track';
    const completionRate = completed / total;
    const riskRate = atRisk / total;
    
    if (completionRate >= 0.7) return 'on-track';
    if (riskRate >= 0.3) return 'at-risk';
    return 'delayed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-emerald-500';
      case 'at-risk':
        return 'bg-amber-500';
      case 'delayed':
        return 'bg-red-500';
      case 'completed':
        return 'bg-green-500';
      case 'not_started':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of clusters
          </p>
        </div>
        <ProjectStats/>

        {/* Clusters and Pathways */}
        <div className="space-y-6">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Cluster Header */}
              <div className={`px-6 py-4 ${cluster.color} text-white`}>
                <h2 className="text-lg font-semibold">
                  {cluster.name}
                </h2>
              </div>

              {/* Pathways */}
              <div className="divide-y divide-gray-200">
                {cluster.pathways.map((pathway) => (
                  <div key={pathway.id} className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 bg-gray-100 rounded-lg p-2">
                        {pathway.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {pathway.name}
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900">{pathway.progress.toFixed(0)}%</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getStatusColor(pathway.status)}`}
                              style={{ width: `${pathway.progress}%` }}
                            ></div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>{pathway.interventionCount} interventions</span>
                            <span>{pathway.completedInterventions} completed</span>
                            {pathway.atRiskInterventions > 0 && (
                              <span className="text-amber-600">{pathway.atRiskInterventions} off track</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {cluster.pathways.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No pathways defined for this cluster
                  </div>
                )}
              </div>
            </div>
          ))}

          {clusters.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-900">No clusters found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by creating clusters and defining pathways
              </p>
            </div>
          )}
        </div>
    </div>
  );
}