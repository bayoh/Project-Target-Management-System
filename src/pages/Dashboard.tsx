import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
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
import { supabase } from '../lib/supabase';

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

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    clusters: { total: 0, pathways: 0, interventions: 0 },
    interventions: { total: 0, onTrack: 0, atRisk: 0, completed: 0, byStatus: {} },
    actions: { total: 0, onTrack: 0, atRisk: 0, completed: 0, byStatus: {} },
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0, byStatus: {} }
  });
  const [clusters, setClusters] = useState<ClusterWithProgress[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [
        clustersData,
        pathwaysData,
        interventionsData,
        actionsData,
        tasksData
      ] = await Promise.all([
        supabase.from('clusters').select('*'),
        supabase.from('pathways').select('*, cluster_id'),
        supabase.from('interventions').select('*, pathway_id, status'),
        supabase.from('actions').select('*, intervention_id, status'),
        supabase.from('tasks').select('*, action_id, status')
      ]);

      // Check for errors
      if (clustersData.error) throw clustersData.error;
      if (pathwaysData.error) throw pathwaysData.error;
      if (interventionsData.error) throw interventionsData.error;
      if (actionsData.error) throw actionsData.error;
      if (tasksData.error) throw tasksData.error;

      // Process clusters and pathways
      const processedClusters = clustersData.data.map((cluster: any) => {
        const clusterPathways = pathwaysData.data.filter(p => p.cluster_id === cluster.id);
        const pathwaysWithProgress = clusterPathways.map(pathway => {
          const pathwayInterventions = interventionsData.data.filter(i => i.pathway_id === pathway.id);
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
          total: clustersData.data.length,
          pathways: pathwaysData.data.length,
          interventions: interventionsData.data.length
        },
        interventions: {
          total: interventionsData.data.length,
          onTrack: interventionsData.data.filter(i => i.status === 'in_progress').length,
          atRisk: interventionsData.data.filter(i => i.status === 'at_risk').length,
          completed: interventionsData.data.filter(i => i.status === 'completed').length,
          byStatus: countByStatus(interventionsData.data)
        },
        actions: {
          total: actionsData.data.length,
          onTrack: actionsData.data.filter(a => a.status === 'in_progress').length,
          atRisk: actionsData.data.filter(a => a.status === 'at_risk').length,
          completed: actionsData.data.filter(a => a.status === 'completed').length,
          byStatus: countByStatus(actionsData.data)
        },
        tasks: {
          total: tasksData.data.length,
          pending: tasksData.data.filter(t => t.status === 'pending').length,
          inProgress: tasksData.data.filter(t => t.status === 'in_progress').length,
          completed: tasksData.data.filter(t => t.status === 'completed').length,
          delayed: tasksData.data.filter(t => t.status === 'delayed').length,
          byStatus: countByStatus(tasksData.data)
        }
      };

      setStats(newStats);
      setClusters(processedClusters);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={loadDashboardData}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of clusters and critical pathways
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.clusters.total}</div>
            <div className="text-sm font-medium text-gray-500">Clusters</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.clusters.pathways}</div>
            <div className="text-sm font-medium text-gray-500">Critical pathways</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.interventions.onTrack}</div>
            <div className="text-sm font-medium text-gray-500">On track</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.interventions.atRisk}</div>
            <div className="text-sm font-medium text-gray-500">Need attention</div>
          </div>
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
                            {/* <div className="flex items-center space-x-2">
                              <div className={`h-3 w-3 rounded-full ${getStatusColor(pathway.status)}`}></div>
                              <span className="text-gray-500 capitalize">{pathway.status}</span>
                            </div> */}
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
                              <span className="text-amber-600">{pathway.atRiskInterventions} at risk</span>
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
      {/* <ProjectStats/> */}
    </DashboardLayout>
  );
}