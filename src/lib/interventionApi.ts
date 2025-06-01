import { supabase } from './supabase';
import type { Intervention, Pathway, Cluster, Action } from '../types/project'; // Adjusted based on function signatures and return types

async function getInterventions() {
  const { data, error } = await supabase
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
            lead:profiles!interventions_lead_id_fkey1(email, id, full_name)
          `)
   .order('created_at', { ascending: false });
  if (error) throw error;
  return data; // Consider adding 'as Intervention[]' or a more specific type if known
}

async function getInterventionById(id: string) {
  const { data, error } = await supabase
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
    .eq('id', id)
    .single();

  if (error) throw error;
  return data; // Consider adding 'as Intervention' or a more specific type
}

async function createIntervention(intervention: Omit<Intervention, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
  const { data, error } = await supabase
    .from('interventions')
    .insert([intervention])
    .select()
    .single();

  if (error) throw error;
  return data as Intervention;
}

async function updateIntervention(id: string, updates: Partial<Intervention>) {
  const { data, error } = await supabase
    .from('interventions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Intervention;
}

async function deleteIntervention(id: string) {
  try {
    // First verify the intervention exists and we have access to it
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id')
      .eq('id', id)
      .single();

    if (interventionError) {
      console.error('Error fetching intervention:', interventionError);
      throw new Error('Access denied or intervention not found');
    }

    if (!intervention) {
      throw new Error('Intervention not found');
    }

    // Get document URLs that need to be deleted
    const { data: documents, error: documentsError } = await supabase
      .from('intervention_documents')
      .select('url')
      .eq('intervention_id', id);

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      throw new Error('Failed to fetch document data');
    }

    // Get all actions for this intervention
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('id')
      .eq('intervention_id', id);

    if (actionsError) {
      console.error('Error fetching actions:', actionsError);
      throw new Error('Failed to fetch actions data');
    }

    // Collect all document URLs to delete
    const documentUrls: string[] = [];

    // Add intervention document URLs
    if (documents) {
      documentUrls.push(...documents.map(d => d.url).filter(Boolean));
    }

    // If there are actions, get their achievement evidence URLs
    if (actions && actions.length > 0) {
      const actionIds = actions.map(a => a.id);
      const { data: achievements, error: achievementsError } = await supabase
        .from('action_achievements')
        .select('evidence_url')
        .in('action_id', actionIds)
        .filter('evidence_url', 'not.is', null);

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
        throw new Error('Failed to fetch achievement data');
      }

      if (achievements) {
        documentUrls.push(...achievements.map(a => a.evidence_url).filter(Boolean));
      }
    }

    // Delete files from storage if there are any
    if (documentUrls.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('intervention-documents')
        .remove(documentUrls);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
        // Continue with deletion but log the error
      }
    }

    // Delete the intervention (this will cascade to all related records)
    const { error: deleteError } = await supabase
      .from('interventions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting intervention:', deleteError);
      throw new Error('Failed to delete intervention');
    }

    return true;
  } catch (error: any) {
    console.error('Error in deleteIntervention:', error);
    throw error;
  }
}

export const interventionApi = {
  getInterventions,
  getInterventionById,
  createIntervention,
  updateIntervention,
  deleteIntervention,
};
