import { supabase } from './supabase';
import type { Cluster } from '../types/project'; // Assuming Pathway and Intervention types are not directly needed for the return type of getClusters specifically.

async function getClusters() {
  const { data, error } = await supabase
    .from('clusters')
    .select(`
      *,
      pathways:pathways(
        *,
        interventions:interventions(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Cluster[];
}

export const clusterApi = {
  getClusters,
};
