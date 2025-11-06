import { supabase } from '../supabase';
import { logError } from '../errorHandler';

export interface ActionStats {
  total: number;
  completed: number;
  on_track: number;
  off_track: number;
  not_started: number;
}

export interface ClusterActionStats extends ActionStats {
  id: string;
  name: string;
}

export const jobsApi = {
  async getActionStats(): Promise<ActionStats> {
    const { data: actions, error } = await supabase
      .from('actions')
      .select('status');

    if (error) throw error;

    const stats: ActionStats = {
      total: actions.length,
      completed: actions.filter(a => a.status === 'completed').length,
      on_track: actions.filter(a => a.status === 'on_track').length,
      off_track: actions.filter(a => a.status === 'off_track').length,
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
          on_track: 0,
          off_track: 0,
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
                case 'on_track':
                  actionStats.on_track++;
                  break;
                case 'off_track':
                  actionStats.off_track++;
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
      logError(error, 'getActionStatusByCluster');
      throw error;
    }
  },

  async getJobsByCluster() {
    try {
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select(`
          id,
          name,
          pathways!inner(id, interventions!inner(id, actions!inner(id, action_targets(*))))
        `);

      if (clustersError) throw clustersError;

      const clusterStats = clusters.map(cluster => {
        let totalJobs = { target: 0, current: 0 };
        let womenJobs = { target: 0, current: 0 };
        let youthJobs = { target: 0, current: 0 };

        // Aggregate jobs data from all pathways, interventions, and actions in the cluster
        cluster.pathways?.forEach(pathway => {
          pathway.interventions?.forEach(intervention => {
            intervention.actions?.forEach(action => {
              action.action_targets?.forEach(target => {
                if (target.category === 'jobs') {
                  totalJobs.target += target.target_value || 0;
                  totalJobs.current += target.current_value || 0;
                  womenJobs.target += target.women_target || 0;
                  womenJobs.current += target.women_current || 0;
                  youthJobs.target += target.youth_target || 0;
                  youthJobs.current += target.youth_current || 0;
                }
              });
            });
          });
        });

        return {
          id: cluster.id,
          name: cluster.name,
          total_jobs: totalJobs,
          women_jobs: womenJobs,
          youth_jobs: youthJobs,
        };
      });

      return clusterStats;
    } catch (error) {
      logError(error, 'getJobsByCluster');
      throw error;
    }
  }
};

