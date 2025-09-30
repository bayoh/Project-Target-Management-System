import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Action, User } from '../types/project';

// Query keys for caching
export const queryKeys = {
  actionDetail: (id: string) => ['action', id],
  users: () => ['profiles'],
  actions: () => ['actions'],
};

// Extended Action type for detailed queries with relations
interface ActionWithRelations extends Omit<Action, 'issues' | 'needs' | 'comments' | 'targets'> {
  intervention?: {
    id: string;
    name: string;
    pathway?: {
      id: string;
      name: string;
      cluster?: {
        id: string;
        name: string;
      };
    };
  };
  lead?: {
    id: string;
    full_name: string;
    email: string;
  };
  targers?: string[];
  issues?: string[];
  needs?: string[];
  comments?: string[];
}

export function useActionDetail(actionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.actionDetail(actionId || ''),
    queryFn: async (): Promise<ActionWithRelations | null> => {
      if (!actionId) return null;
      
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
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
          ),
          lead:profiles!actions_lead_id_fkey1(
            id,
            full_name,
            email
          )
        `)
        .eq('id', actionId)
        .single();

      if (error) throw error;
      
      // Transform the data to match expected structure
      const action = data as any;
      return {
        id: action.id,
        created_by: action.created_by,
        created_at: action.created_at,
        updated_at: action.updated_at,
        intervention_id: action.intervention_id,
        name: action.name,
        code: action.code,
        description: action.description,
        status: action.status,
        start_date: action.start_date,
        actual_startDate: action.actual_startDate,
        actual_endDate: action.actual_endDate,
        end_date: action.end_date,
        lead_id: action.lead_id,
        supporting_staff: action.supporting_staff || [],
        issues: action.issues || [],
        needs: action.needs || [],
        comments: action.comments || [],
        budget: action.budget,
        associated_projects: action.associated_projects || [],
        implementing_partners: action.implementing_partners || [],
        intervention: action.intervention,
        lead: action.lead,
        indicators: action.indicators || []
      } as ActionWithRelations;
    },
    enabled: !!actionId,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as User[];
    },
  });
}

// Additional query for fetching all actions (useful for lists)
export function useActions() {
  return useQuery({
    queryKey: queryKeys.actions(),
    queryFn: async (): Promise<ActionWithRelations[]> => {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          intervention:interventions(
            id,
            name
          ),
          lead:users!actions_lead_id_fkey(
            id,
            full_name
          )
        `)
        .order('name');

      if (error) throw error;
      
      return data.map(action => {
        const actionData = action as any;
        return {
          id: actionData.id,
          created_by: actionData.created_by,
          created_at: actionData.created_at,
          updated_at: actionData.updated_at,
          intervention_id: actionData.intervention_id,
          name: actionData.name,
          code: actionData.code,
          description: actionData.description,
          status: actionData.status,
          start_date: actionData.start_date,
          actual_startDate: actionData.actual_startDate,
          actual_endDate: actionData.actual_endDate,
          end_date: actionData.end_date,
          lead_id: actionData.lead_id,
          supporting_staff: actionData.supporting_staff || [],
          issues: actionData.issues || [],
          needs: actionData.needs || [],
          comments: actionData.comments || [],
          budget: actionData.budget,
          associated_projects: actionData.associated_projects || [],
          implementing_partners: actionData.implementing_partners || [],
          intervention: actionData.intervention,
          lead: actionData.lead
        } as ActionWithRelations;
      });
    },
  });
}