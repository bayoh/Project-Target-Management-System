import { supabase } from './supabase';
import type { Cluster, Pathway, Intervention, Action, Task } from '../types/project'; // Assuming these types might be used by reportApi or its functions indirectly

// Interface originally in api.ts
interface ActionPramas {
  actionId: string;
  startDate: Date;
  endDate: Date;
}

// Renamed to avoid conflict with jobsApi.ts
export interface ReportActionStats {
  total: number;
  completed: number;
  in_progress: number;
  at_risk: number;
  not_started: number;
}

// Renamed to avoid conflict with jobsApi.ts
export interface ReportClusterActionStats extends ReportActionStats {
  id: string;
  name: string;
}

// Helper function moved from api.ts
// const formatdate = (date: Date) => { // This function will be removed if no longer used
//   const d = new Date(date);
//   return d.toISOString().slice(0, 19).replace('T', ' ');
// }

export const reportApi = {
  // Get action report data
  async getActionReport({actionId, endDate, startDate,}: ActionPramas) {
    // Commented out console.log statements removed
    try {
      let achievementsQuery = supabase
        .from('action_achievements')
        .select('*')
        .eq('action_id', actionId);

      let issuesQuery = supabase
        .from('action_issues')
        .select('*')
        .eq('action_id', actionId);

      let needsQuery = supabase
        .from('action_needs')
        .select('*')
        .eq('action_id', actionId);

      if (startDate) {
        achievementsQuery = achievementsQuery.gte('date_achieved', startDate.toISOString());
        issuesQuery = issuesQuery.gte('date_identified', startDate.toISOString());
        needsQuery = needsQuery.gte('date_identified', startDate.toISOString());
      }
      if (endDate) {
        achievementsQuery = achievementsQuery.lte('date_achieved', endDate.toISOString());
        issuesQuery = issuesQuery.lte('date_identified', endDate.toISOString());
        needsQuery = needsQuery.lte('date_identified', endDate.toISOString());
      }

      const [actionData, achievementsData, issuesData, needsData, commentsData, targetsData] = await Promise.all([
        // Get action details
        supabase
          .from('actions')
          .select(\`
            *,
            intervention:interventions(
              name,
              description,
              pathway:pathways(
                name,
                cluster:clusters(name)
              )
            )
          \`)
          .eq('id', actionId)
          .single(),

        achievementsQuery.order('date_achieved', { ascending: false }),
        issuesQuery.order('date_identified', { ascending: false }),
        needsQuery.order('date_identified', { ascending: false }),
        supabase // comments are not date filtered in this version
          .from('action_comments')
          .select('*')
          .eq('action_id', actionId)
          .order('created_at', { ascending: false }),
        // Get targets
        supabase
          .from('action_targets')
          .select('*')
          .eq('action_id', actionId)
          .order('created_at', { ascending: false })
      ]);

      if (actionData.error) throw actionData.error;
      if (achievementsData.error) throw achievementsData.error;
      if (issuesData.error) throw issuesData.error;
      if (needsData.error) throw needsData.error;
      if (commentsData.error) throw commentsData.error;
      if (targetsData.error) throw targetsData.error;

      // Process job targets
      const jobTargets = targetsData.data.filter(target => target.category === 'jobs');
      const otherTargets = targetsData.data.filter(target => target.category === 'other')
      // const progressOnTargets = otherTargets.reduce()
      const totalJobs = jobTargets.reduce((sum, target) => {
        return {
          target: (sum.target || 0) + (target.target_value || 0),
          current: (sum.current || 0) + (target.current_value || 0),
          women_target: (sum.women_target || 0) + (target.women_target || 0),
          women_current: (sum.women_current || 0) + (target.women_current || 0),
          youth_target: (sum.youth_target || 0) + (target.youth_target || 0),
          youth_current: (sum.youth_current || 0) + (target.youth_current || 0)
        };
      }, {
        target: 0,
        current: 0,
        women_target: 0,
        women_current: 0,
        youth_target: 0,
        youth_current: 0
      });

      // Process milestones from achievements
      const milestones = achievementsData.data.map(achievement => ({
        date: achievement.date_achieved,
        title: achievement.description,
        status: 'completed' as const,
        images: achievement.evidence_file || []
      }));
      // const milestones = achievementsData.data.map(achievement => achievement.description)

      // Get active issues
      const activeIssues = issuesData.data
        .filter(issue => issue.status !== 'resolved')
        .map(issue => issue.description);

     const budget = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(actionData.data.budget)

      return {
        id: actionData.data.id,
        name: actionData.data.name,
        description: actionData.data.description,
        status: actionData.data.status,
        lead: actionData.data.lead?.full_name,
        supportingStaff: actionData.data.supporting_staff || [],
        milestones: milestones,
        keyMilestones: achievementsData.data
          .slice(0, 3)
          .map(a => a.description),
        issues: issuesData.data,
        needs: needsData.data,
        comments: commentsData.data,
        otherTargets: otherTargets,
        jobsTarget: totalJobs.target > 0
          ? \`Target: \${totalJobs.target} jobs (Current: \${totalJobs.current})\\nWomen: \${totalJobs.women_target} (Current: \${totalJobs.women_current})\\nYouth: \${totalJobs.youth_target} (Current: \${totalJobs.youth_current})\`
          : 'No job targets set',
        projectCost: budget,
        lastUpdated: actionData.data.updated_at,
        path: actionData.data.intervention?.pathway?.cluster?.name
          ? \`\${actionData.data.intervention.pathway.cluster.name} > \${actionData.data.intervention.pathway.name} > \${actionData.data.intervention.name}\`
          : undefined
      };
    } catch (error) {
      console.error('Error fetching action report:', error);
      throw error;
    }
  },

  // Get all actions for the dropdown
  async getActions() {
    const { data, error } = await supabase
      .from('actions')
      .select(\`
        id,
        name,
        intervention:interventions(
          name,
          pathway:pathways(
            name,
            cluster:clusters(name)
          )
        )
      \`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAllActionsIssues() {
    const {data, error } = await supabase
     .from('action_issues')
     .select('*')
     .order('date_identified', { ascending: false });

     if(error) throw error;
     return data;
  }
};
