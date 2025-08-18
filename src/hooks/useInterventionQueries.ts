import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import type { Intervention } from '../types/project';

// Hook to get intervention details with all related data
export function useInterventionDetail(interventionId: string | undefined) {
  return useQuery<Intervention | null>({
    queryKey: interventionId
      ? queryKeys.interventions.detail(interventionId)
      : queryKeys.interventions.detail('none'),
    enabled: !!interventionId,
    queryFn: async () => {
      if (!interventionId) return null;
      
      const result = await executeQuery(async () =>
        supabase
          .from('interventions')
          .select(`
            *,
            pathway:pathways(
              id,
              name,
              cluster:clusters(
                id,
                name
              )
            ),
            lead:profiles!interventions_lead_id_fkey1(id, email, full_name),
            actions(*): 
              actions(*, 
                lead:profiles!actions_lead_id_fkey1(id, email, full_name),
                supporting_staff:profiles(id, email, full_name),
                achievements:action_achievements(*),
                issues:action_issues(*),
                targets:action_targets(*)
              ),
            documents:intervention_documents(*),
            comments:intervention_comments(
              *,
              user:profiles!intervention_comments_created_by_fkey1(*)
            )
          `)
          .eq('id', interventionId)
          .single()
      );
      
      if (!result.data) return null;

      // Calculate start and end dates from actions
      const intervention = result.data as Intervention;
      const actions = intervention.actions || [];
      if (actions.length > 0) {
        const actionDates = actions.reduce((dates: Date[], action: any) => {
          if (action.start_date) dates.push(new Date(action.start_date));
          if (action.end_date) dates.push(new Date(action.end_date));
          return dates;
        }, []);

        if (actionDates.length > 0) {
          intervention.start_date = new Date(Math.min(...actionDates.map((d: Date) => d.getTime()))).toISOString().split('T')[0];
          intervention.end_date = new Date(Math.max(...actionDates.map((d: Date) => d.getTime()))).toISOString().split('T')[0];
        }
      }

      return intervention;
    },
  });
}