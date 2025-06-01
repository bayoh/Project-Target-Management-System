import { supabase } from './supabase';

// getProjectStats was refactored to use Supabase RPC function in a previous step
async function getProjectStats() {
  const { data, error } = await supabase.rpc('get_project_and_task_stats');

  if (error) {
    console.error('Failed to load project stats:', error);
    throw error;
  }
  // RPC function returns data in the shape: { projects: {}, tasks: {} }
  return data || { projects: {}, tasks: {} };
}

// getActionStats is the original one from projectApi that counts action statuses
async function getActionStats() {
  try {
    const [projectsResponse] = await Promise.all([
      supabase
        .from('actions')
        .select('status')
        .not('status', 'is', null),
    ]);

    if (projectsResponse.error) throw projectsResponse.error;

    const action = projectsResponse.data.reduce((acc: Record<string, number>, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    return { action };
  } catch (error) {
    console.error('Failed to load stats:', error);
    return { action: {} };
  }
}

export const statsApi = {
  getProjectStats,
  getActionStats,
};
