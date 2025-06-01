import { supabase } from './supabase';
import type { Action, Intervention, Pathway, Cluster } from '../types/project'; // Adjusted based on function signatures

async function getActions(){
  const { data, error } = await supabase
   .from('actions')
   .select(`
          *,
          lead:profiles!actions_lead_id_fkey1(id, email, full_name),
          action_achievements:action_achievements(*),
          action_issues:action_issues(*),
          action_targets:action_targets(*),
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
        `)
  .order('created_at', { ascending: false });
  if (error) throw error;
  return data; // Consider adding 'as Action[]' or a more specific type
}

async function createAction(action: Omit<Action, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
  const { data, error } = await supabase
    .from('actions')
    .insert([action])
    .select()
    .single();

  if (error) throw error;
  return data as Action;
}

async function updateAction(id: string, updates: Partial<Action>) {
  const { data, error } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Action;
}

async function deleteAction(id: string) {
  try {
    // Delete all related achievements
    const { error: achievementsError } = await supabase
      .from('action_achievements')
      .delete()
      .eq('action_id', id);
    if (achievementsError) throw achievementsError;

    // Delete all related needs
    const { error: needsError } = await supabase
      .from('action_needs')
      .delete()
      .eq('action_id', id);
    if (needsError) throw needsError;

    // Delete all related issues
    const { error: issuesError } = await supabase
      .from('action_issues')
      .delete()
      .eq('action_id', id);
    if (issuesError) throw issuesError;

    // Delete all related comments
    const { error: commentsError } = await supabase
      .from('action_comments')
      .delete()
      .eq('action_id', id);
    if (commentsError) throw commentsError;

    // Delete all related targets
    const { error: targetsError } = await supabase
      .from('action_targets')
      .delete()
      .eq('action_id', id);
    if (targetsError) throw targetsError;

    // Finally delete the action itself
    const { error: actionError } = await supabase
      .from('actions')
      .delete()
      .eq('id', id);
    if (actionError) throw actionError;

  } catch (error) {
    console.error('Error deleting action and related data:', error);
    throw error;
  }
}

async function updateActionAssignment(actionIds: string[], leadId: string, supportingStaffIds?: string[]) {
  const updates: any = {  };
  if (leadId && leadId.trim() !== '') {
    updates.lead_id = leadId;
  }

  if (supportingStaffIds) {
    updates.supporting_staff = supportingStaffIds;
  }
  // console.log(updates) // This was removed in a previous subtask, ensuring it stays removed
  const { error } = await supabase
   .from('actions')
   .update(updates)
   .in('id', actionIds);

  if (error) throw error;
}

export const actionApi = {
  getActions,
  createAction,
  updateAction,
  deleteAction,
  updateActionAssignment,
};
