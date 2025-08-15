import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import type {
  Cluster,
  Pathway,
  Project
} from '../types/project';
import type {
  ProjectFilters,
  ClusterFilters,
  PathwayFilters,
  TargetFilters
} from '../types/queries';

// Target data interfaces (using same structure as in the page)
export interface TargetSummary {
  total: number;
  completed: number;
  at_risk: number;
  in_progress: number;
  categories: { [key: string]: number };
  averageProgress: number;
}

export interface TargetItem {
  id: string;
  description: string;
  metric: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  last_updated: string;
  category?: string;
  action?: {
    id: string;
    name: string;
    intervention?: {
      id: string;
      name: string;
    }
  };
}

// Local type for summary computations to avoid using any
type SummaryTargetRow = {
  target_value: number;
  current_value: number;
  category?: string | null;
};

// Project queries
export const useProjects = (filters?: ProjectFilters) => {
  return useQuery({
    queryKey: queryKeys.projects.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      const result = await executeQuery(async () => query);
      return (result.data || []) as Project[];
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const result = await executeQuery(async () => 
        supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single()
      );
      if (!result.data) throw new Error('Project not found');
      return result.data as Project;
    },
    enabled: !!id,
  });
};

// Cluster queries
export const useClusters = (projectId: string, filters?: ClusterFilters) => {
  return useQuery({
    queryKey: queryKeys.clusters.list(projectId, filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('clusters')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      const result = await executeQuery(async () => query);
      return (result.data || []) as Cluster[];
    },
    enabled: !!projectId,
  });
};

export const useCluster = (id: string) => {
  return useQuery({
    queryKey: queryKeys.clusters.detail(id),
    queryFn: async () => {
      const result = await executeQuery(async () => 
        supabase
          .from('clusters')
          .select('*')
          .eq('id', id)
          .single()
      );
      if (!result.data) throw new Error('Cluster not found');
      return result.data as Cluster;
    },
    enabled: !!id,
  });
};

// Pathway queries
export const usePathways = (clusterId: string, filters?: PathwayFilters) => {
  return useQuery({
    queryKey: queryKeys.pathways.list(clusterId, filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('pathways')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      const result = await executeQuery(async () => query);
      return (result.data || []) as Pathway[];
    },
    enabled: !!clusterId,
  });
};

export const usePathway = (id: string) => {
  return useQuery({
    queryKey: queryKeys.pathways.detail(id),
    queryFn: async () => {
      const result = await executeQuery(async () => 
        supabase
          .from('pathways')
          .select('*')
          .eq('id', id)
          .single()
      );
      if (!result.data) throw new Error('Pathway not found');
      return result.data as Pathway;
    },
    enabled: !!id,
  });
};

// Target queries
export const useTargetSummary = (filters?: TargetFilters) => {
  return useQuery({
    queryKey: queryKeys.targets.summary(filters || {}),
    queryFn: async () => {
      let query = supabase.from('action_targets').select('*');

      if (filters?.job_id) {
        query = query.eq('job_id', filters.job_id);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const result = await executeQuery(async () => query);
      const targets = (result.data || []) as SummaryTargetRow[];
      
      const total = targets.length;
      const completed = targets.filter((t: SummaryTargetRow) => t.target_value > 0 && (t.current_value / t.target_value) >= 1).length;
      const at_risk = targets.filter((t: SummaryTargetRow) => t.target_value > 0 && (t.current_value / t.target_value) < 0.5 && (t.current_value / t.target_value) < 1).length;
      const in_progress = targets.filter((t: SummaryTargetRow) => t.target_value > 0 && (t.current_value / t.target_value) >= 0.5 && (t.current_value / t.target_value) < 1).length;
      
      const categories: Record<string, number> = {};
      targets.forEach((t: SummaryTargetRow) => {
        const category = t.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
      });

      const totalProgress = targets.reduce((acc: number, t: SummaryTargetRow) => {
        if (t.target_value > 0) {
          return acc + Math.min((t.current_value / t.target_value) * 100, 100);
        }
        return acc;
      }, 0);
      const denominator = targets.filter((t: SummaryTargetRow) => t.target_value > 0).length;
      const averageProgress = denominator > 0 ? totalProgress / denominator : 0;

      return {
        total,
        completed,
        at_risk,
        in_progress,
        categories,
        averageProgress
      } as TargetSummary;
    },
  });
};

export const useRecentTargets = (filters?: TargetFilters) => {
  return useQuery({
    queryKey: queryKeys.targets.recent(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('action_targets')
        .select(`
          *,
          action:actions(
            id,
            name,
            intervention:interventions(
              id,
              name
            )
          )
        `)
        .limit(10);

      if (filters?.job_id) {
        query = query.eq('job_id', filters.job_id);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const result = await executeQuery(async () => 
        query.order('last_updated', { ascending: false })
      );
      
      let targets = (result.data || []) as TargetItem[];
      
      // Apply status filters that require calculations in post-processing
      if (filters?.status) {
        if (filters.status === 'completed') {
          targets = targets.filter(t => t.target_value > 0 && (t.current_value / t.target_value) >= 1);
        } else if (filters.status === 'at_risk') {
          targets = targets.filter(t => 
            t.target_value > 0 && 
            (t.current_value / t.target_value) < 0.5 && 
            (t.current_value / t.target_value) < 1
          );
        } else if (filters.status === 'in_progress') {
          targets = targets.filter(t => 
            t.target_value > 0 && 
            (t.current_value / t.target_value) >= 0.5 && 
            (t.current_value / t.target_value) < 1
          );
        }
      }
      
      return targets;
    },
  });
};

export const useTargetFilterOptions = () => {
  return useQuery({
    queryKey: queryKeys.targets.filterOptions(),
    queryFn: async () => {
      const result = await executeQuery(async () => 
        supabase
          .from('action_targets')
          .select('category')
          .not('category', 'is', null)
      );
      
      type CategoryRow = { category: string | null };
      const categoriesSet = new Set(
        ((result.data || []) as CategoryRow[]).map((t) => t.category)
      );
      const categories = Array.from(categoriesSet).filter(
        (c): c is string => typeof c === 'string' && c.length > 0
      );
      return {
        statuses: ['not_started', 'in_progress', 'at_risk', 'completed'] as const,
        categories
      };
    },
  });
};

// Create project mutation
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

// Update project mutation
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

// Delete project mutation
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};