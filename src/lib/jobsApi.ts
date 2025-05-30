import { supabase } from './supabase';

export interface JobStats {
  id: string;
  sector: string;
  total_jobs: number;
  percentage: number;
  women_jobs: number;
  youth_jobs: number;
  target_jobs: number;
  actual_jobs: number;
  created_at: string;
  updated_at: string;
}

export interface ActionStats {
  total: number;
  completed: number;
  on_going_on: number;
  on_going_off: number;
  not_started: number;
}

export interface ClusterActionStats extends ActionStats {
  id: string;
  name: string;
}

export const jobsApi = {
  async getJobStats(): Promise<JobStats[]> {
    const { data, error } = await supabase
      .from('jobs_stats')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getActionStats(): Promise<ActionStats> {
    const { data: actions, error } = await supabase
      .from('actions')
      .select('status');

    if (error) throw error;

    const stats: ActionStats = {
      total: actions.length,
      completed: actions.filter(a => a.status === 'completed').length,
      on_going_on: actions.filter(a => a.status === 'on_going_on').length,
      on_going_off: actions.filter(a => a.status === 'on_going_off').length,
      not_started: actions.filter(a => a.status === 'not_started').length
    };

    return stats;
  },

  async getActionStatusByCluster(): Promise<ClusterActionStats[]> {
    try {
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select(`
          id,
          name,
          pathways!inner(id, interventions!inner(id, actions!inner(id, status)))
        `);

      if (clustersError) throw clustersError;

      const clusterStats = clusters.map(cluster => {
        let actionStats = {
          id: cluster.id,
          name: cluster.name,
          total: 0,
          completed: 0,
          on_going_on: 0,
          on_going_off: 0,
          not_started: 0
        };

        // Aggregate action status data from all pathways and interventions in the cluster
        cluster.pathways?.forEach(pathway => {
          pathway.interventions?.forEach(intervention => {
            intervention.actions?.forEach(action => {
              actionStats.total++;
              switch (action.status) {
                case 'completed':
                  actionStats.completed++;
                  break;
                case 'on_going_on':
                  actionStats.on_going_on++;
                  break;
                case 'on_going_off':
                  actionStats.on_going_off++;
                  break;
                case 'not_started':
                  actionStats.not_started++;
                  break;
              }
            });
          });
        });

        return actionStats;
      });

      return clusterStats;
    } catch (error) {
      console.error('Error fetching action status by cluster:', error);
      throw error;
    }
  },

  async updateJobStats(id: string, stats: Partial<JobStats>): Promise<JobStats> {
    const { data, error } = await supabase
      .from('jobs_stats')
      .update(stats)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};