import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useActivityTracking } from './useActivityTracking';
import { executeQuery } from '../lib/queries';
import { PaginationParams, PaginatedResponse } from '../types/queries';

// Target interfaces
export interface TargetItem {
  id: string;
  description: string;
  metric: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  last_updated: string;
  category?: string;
  women_target?: number;
  women_current?: number;
  youth_target?: number;
  youth_current?: number;
  action?: {
    id: string;
    name: string;
    intervention?: {
      id: string;
      name: string;
      pathway?: {
        id: string;
        name: string;
        cluster?: {
          id: string;
          name: string;
        }
      }
    }
  };
}

export interface FilterOption {
  id: string;
  name: string;
  cluster_id?: string;
  pathway_id?: string;
  intervention_id?: string;
}

export interface FilterOptions {
  clusters: FilterOption[];
  pathways: FilterOption[];
  interventions: FilterOption[];
  actions: FilterOption[];
}

export interface TargetFilters {
  clusterId?: string;
  pathwayId?: string;
  interventionId?: string;
  actionId?: string;
  category?: string;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Hook to get all targets with full relationships
export const useTargets = () => {
  return useQuery({
    queryKey: queryKeys.targets.list(),
    queryFn: async () => {
      const result = await executeQuery(async () =>
        supabase
          .from('action_targets')
          .select(`
            *,
            action:actions(
              id,
              name,
              intervention:interventions(
                id,
                name,
                pathway:pathways(
                  id,
                  name,
                  cluster:clusters(
                    id,
                    name
                  )
                )
              )
            )
          `)
      );
      return (result.data || []) as TargetItem[];
    },
  });
};

export const usePaginatedTargets = (
  filters: TargetFilters = {},
  pagination: PaginationParams = {}
) => {
  return useQuery<PaginatedResponse<TargetItem>>({
    queryKey: queryKeys.targets.list({ ...filters, ...pagination }),
    queryFn: async () => {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;
      const from = offset;
      const to = offset + limit - 1;

      let query = supabase
        .from('action_targets')
        .select(
          `
          id, description, metric, baseline_value, target_value, current_value, last_updated, category,
          action:actions!inner(
            id, name,
            intervention:interventions!inner(
              id, name,
              pathway:pathways!inner(
                id, name,
                cluster:clusters!inner(id, name)
              )
            )
          )
        `,
          { count: 'exact' }
        );

      if (filters.clusterId) {
        query = query.eq('action.intervention.pathway.cluster.id', filters.clusterId);
      }
      if (filters.pathwayId) {
        query = query.eq('action.intervention.pathway.id', filters.pathwayId);
      }
      if (filters.interventionId) {
        query = query.eq('action.intervention.id', filters.interventionId);
      }
      if (filters.actionId) {
        query = query.eq('action_id', filters.actionId);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.searchTerm) {
        query = query.or(`description.ilike.%${filters.searchTerm}%,metric.ilike.%${filters.searchTerm}%`);
      }

      if (filters.sortBy && filters.sortDirection) {
        const isNestedSort = filters.sortBy.includes('.');
        const [foreignTable, ...rest] = filters.sortBy.split('.');
        const sortColumn = rest.join('.');

        query = query.order(isNestedSort ? sortColumn : filters.sortBy, {
          ascending: filters.sortDirection === 'asc',
          foreignTable: isNestedSort ? foreignTable : undefined,
        });
      } else {
        query = query.order('last_updated', { ascending: false });
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching paginated targets:', error);
        throw error;
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: (data || []) as unknown as TargetItem[],
        count: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
  });
};

// Hook to get filter options (clusters, pathways, interventions, actions)
export const useTargetFilterOptions = () => {
  return useQuery({
    queryKey: queryKeys.targets.filterOptions(),
    queryFn: async () => {
      const [clustersResult, pathwaysResult, interventionsResult, actionsResult] = await Promise.all([
        executeQuery(async () => 
          supabase.from('clusters').select('id, name').order('name')
        ),
        executeQuery(async () => 
          supabase.from('pathways').select('id, name, cluster_id').order('name')
        ),
        executeQuery(async () => 
          supabase.from('interventions').select('id, name, pathway_id').order('name')
        ),
        executeQuery(async () => 
          supabase.from('actions').select('id, name, intervention_id').order('name')
        ),
      ]);

      return {
        clusters: (clustersResult.data || []) as FilterOption[],
        pathways: (pathwaysResult.data || []) as FilterOption[],
        interventions: (interventionsResult.data || []) as FilterOption[],
        actions: (actionsResult.data || []) as FilterOption[],
      } as FilterOptions;
    },
  });
};

// Mutation to update target
export const useUpdateTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      current_value, 
      women_current, 
      youth_current 
    }: {
      id: string;
      current_value: number;
      women_current?: number;
      youth_current?: number;
    }) => {
      const updateData: { 
        current_value: number; 
        last_updated: string; 
        women_current?: number; 
        youth_current?: number; 
      } = {
        current_value,
        last_updated: new Date().toISOString()
      };
      
      if (women_current !== undefined) {
        updateData.women_current = women_current;
      }
      if (youth_current !== undefined) {
        updateData.youth_current = youth_current;
      }

      const { data, error } = await supabase
        .from('action_targets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch targets list
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.list() });
    },
  });
};

// Mutation to delete target
export const useDeleteTarget = () => {
  const queryClient = useQueryClient();
  const { trackDelete } = useActivityTracking();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the target data for tracking
      const { data: targetData, error: fetchError } = await supabase
        .from('action_targets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('action_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return targetData;
    },
    onSuccess: (targetData, targetId) => {
      // Track target deletion
      trackDelete('target', targetId, {
        metric: targetData.metric,
        category: targetData.category,
        target_value: targetData.target_value,
        current_value: targetData.current_value,
        entity_type: 'target'
      });
      
      // Invalidate and refetch targets list
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.list() });
    },
  });
};

// Hook to get single target with full relationships (for TargetDetail)
export const useTargetDetail = (id: string) => {
  return useQuery<TargetItem | null>({
    queryKey: queryKeys.targets.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const result = await executeQuery(async () =>
        supabase
          .from('action_targets')
          .select(`
            *,
            action:actions(
              id,
              name,
              intervention:interventions(
                id,
                name,
                pathway:pathways(
                  id,
                  name,
                  cluster:clusters(
                    id,
                    name
                  )
                )
              )
            )
          `)
          .eq('id', id)
          .single()
      );
      return (result.data as TargetItem) ?? null;
    },
    enabled: !!id,
  });
};

// Hook to get target history
export const useTargetHistory = (targetId: string) => {
  return useQuery({
    queryKey: queryKeys.targets.history(targetId),
    queryFn: async () => {
      const result = await executeQuery(async () =>
        supabase
          .from('target_history')
          .select(`*, changed_by:profiles(full_name)`)
          .eq('target_id', targetId)
          .order('changed_at', { ascending: false })
      );
      return result.data || [];
    },
    enabled: !!targetId,
  });
};

// Hook to get actions for NewTarget dropdown
export const useActionsForTarget = () => {
  return useQuery({
    queryKey: queryKeys.actions.lists(),
    queryFn: async () => {
      const result = await executeQuery(async () =>
        supabase
          .from('actions')
          .select(`
            id,
            name,
            intervention:interventions(name)
          `)
      );
      
      const formattedActions = result.data?.map((action: any) => ({
        id: action.id,
        name: action.name,
        intervention_name: action.intervention?.name || 'Unknown'
      })) || [];
      
      return formattedActions;
    },
  });
};

// Mutation to create new target
export const useCreateTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetData: {
      action_id: string;
      description: string;
      metric: string;
      baseline_value: number;
      target_value: number;
      current_value: number;
      category?: string;
      women_target?: number;
      women_current?: number;
      youth_target?: number;
      youth_current?: number;
      job_subcategory?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('action_targets')
        .insert([
          {
            ...targetData,
            created_by: user?.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch targets list
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.list() });
    },
  });
};