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
    // Refactored to use Supabase RPC function
    const { data, error } = await supabase.rpc('get_overall_action_stats');

    if (error) throw error;
    // The RPC function returns an array with a single object
    return data && data.length > 0 ? data[0] : {
      total: 0,
      completed: 0,
      on_going_on: 0,
      on_going_off: 0,
      not_started: 0
    };
  },

  async getActionStatusByCluster(): Promise<ClusterActionStats[]> {
    // Refactored to use Supabase RPC function
    const { data, error } = await supabase.rpc('get_cluster_action_stats');

    if (error) {
      console.error('Error fetching action status by cluster:', error);
      throw error;
    }
    return data || [];
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
  },

  async getJobsByCluster() {
    // Refactored to use Supabase RPC function
    const { data, error } = await supabase.rpc('get_cluster_job_targets');

    if (error) {
      console.error('Error fetching jobs by cluster:', error);
      throw error;
    }

    // Map SQL results to the desired nested structure
    return data ? data.map(item => ({
      id: item.id,
      name: item.name,
      total_jobs: {
        target: item.total_target_value,
        current: item.total_current_value
      },
      women_jobs: {
        target: item.women_target_value,
        current: item.women_current_value
      },
      youth_jobs: {
        target: item.youth_target_value,
        current: item.youth_current_value
      }
    })) : [];
  }
};