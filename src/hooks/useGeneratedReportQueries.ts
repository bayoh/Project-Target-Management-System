import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import type { GeneratedReport } from '../types/reports';

export interface CreateGeneratedReportInput {
  template_id: string;
  intervention_id: string;
  data: unknown;
}

export function useGeneratedReportsByIntervention(interventionId: string | undefined) {
  return useQuery<GeneratedReport[]>({
    queryKey: interventionId
      ? queryKeys.reports.generated.byIntervention(interventionId)
      : queryKeys.reports.generated.list({ interventionId: 'none' }),
    enabled: !!interventionId,
    queryFn: async () => {
      if (!interventionId) return [] as GeneratedReport[];
      const result = await executeQuery(async () =>
        supabase
          .from('generated_reports')
          .select('*')
          .eq('intervention_id', interventionId)
          .order('created_at', { ascending: false })
      );
      return (result.data || []) as unknown as GeneratedReport[];
    },
  });
}

export function useGeneratedReport(reportId: string | undefined) {
  return useQuery<GeneratedReport | null>({
    queryKey: reportId
      ? queryKeys.reports.generated.detail(reportId)
      : queryKeys.reports.generated.detail('none'),
    enabled: !!reportId,
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw error;
      return data as GeneratedReport;
    },
  });
}

export function useCreateGeneratedReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGeneratedReportInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('generated_reports')
        .insert([
          {
            template_id: input.template_id,
            intervention_id: input.intervention_id,
            data: input.data,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as GeneratedReport;
    },
    onSuccess: (created) => {
      // Invalidate lists related to this intervention
      if (created?.intervention_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reports.generated.byIntervention(created.intervention_id),
        });
      }
    },
  });
}

export function useDeleteGeneratedReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; interventionId?: string }) => {
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: ({ interventionId, id }) => {
      if (interventionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reports.generated.byIntervention(interventionId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.generated.detail(id) });
    },
  });
}