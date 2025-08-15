import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import type { ReportTemplate, ReportLayout } from '../types/reports';

// List templates
export const useReportTemplates = () => {
  return useQuery<ReportTemplate[]>({
    queryKey: queryKeys.reports.templates.list(),
    queryFn: async () => {
      const result = await executeQuery(async () =>
        supabase
          .from('report_templates')
          .select('*')
          .order('created_at', { ascending: false })
      );
      return (result.data || []) as ReportTemplate[];
    },
  });
};

// Get single template
export const useReportTemplate = (id?: string) => {
  return useQuery<ReportTemplate | null>({
    queryKey: id ? queryKeys.reports.templates.detail(id) : ['reports', 'templates', 'detail', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const result = await executeQuery(async () =>
        supabase
          .from('report_templates')
          .select('*')
          .eq('id', id)
          .single()
      );
      if (!result.data) return null;
      return result.data as ReportTemplate;
    },
    enabled: !!id,
  });
};

// Create template
export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; name: string; description: string | null; layout: ReportLayout }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const payload = [{
        id: input.id,
        name: input.name,
        description: input.description,
        layout: input.layout,
        created_by: user.id,
      }];

      const { data, error } = await supabase
        .from('report_templates')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.detail(data.id) });
      }
    },
  });
};

// Update template
export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name: string; description: string | null; layout: ReportLayout }) => {
      const { data, error } = await supabase
        .from('report_templates')
        .update({
          name: input.name,
          description: input.description,
          layout: input.layout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.detail(data.id) });
      }
    },
  });
};

// Delete template
export const useDeleteReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.lists() });
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.templates.detail(id) });
      }
    },
  });
};