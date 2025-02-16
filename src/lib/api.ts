import { supabase } from './supabase';
import type { Cluster, Pathway, Intervention, Action, Task } from '../types/project';

interface UserUpdateData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'super_admin' | 'leadership' | 'lead' | 'supporting_staff';
  status?: 'active' | 'inactive';
}

export const userApi = {
  // Get all users
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get user by ID
  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateProfile(userId: string, data: UserUpdateData) {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  // Update user email
  async updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;
  },

  // Update user password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  },

  // Create new user
  async createUser(email: string, password: string, userData: UserUpdateData) {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        status: userData.status
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Then create the user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (profileError) throw profileError;

    return authData.user;
  },

  // Update user role
  async updateUserRole(userId: string, role: UserUpdateData['role']) {
    // Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { role } }
    );

    if (authError) throw authError;

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) throw profileError;
  },

  // Update user status (activate/deactivate)
  async updateUserStatus(userId: string, status: UserUpdateData['status']) {
    const { error } = await supabase
      .from('profiles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  // Get user activity
  async getUserActivity(userId: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  // Search users
  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get users by role
  async getUsersByRole(role: UserUpdateData['role']) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get active users
  async getActiveUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .order('email');

    if (error) throw error;
    return data;
  }
};

export const projectApi = {
  // Project Stats
  async getProjectStats() {
    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        supabase
          .from('interventions')
          .select('status')
          .not('status', 'is', null),
        supabase
          .from('tasks')
          .select('status')
          .not('status', 'is', null)
      ]);

      if (projectsResponse.error) throw projectsResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;

      // Count projects by status
      const projects = projectsResponse.data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      // Count tasks by status
      const tasks = tasksResponse.data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      return { projects, tasks };
    } catch (error) {
      console.error('Failed to load stats:', error);
      return { projects: {}, tasks: {} };
    }
  },

  // Clusters
  async getClusters() {
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
  },

  // Interventions
  async getInterventions() {
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
    return data;
  },

  // Get intervention by ID with all related data
  async getInterventionById(id: string) {
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
    return data;
  },

  async createIntervention(intervention: Omit<Intervention, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const { data, error } = await supabase
      .from('interventions')
      .insert([intervention])
      .select()
      .single();

    if (error) throw error;
    return data as Intervention;
  },

  async updateIntervention(id: string, updates: Partial<Intervention>) {
    const { data, error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Intervention;
  },

async updateInterventionAssignment(interventionIds: string[], leadId: string, supportingStaffIds?: string[]) {
  const updates: any = {  };

  if (leadId && leadId.trim() !== '') {
    updates.lead_id = leadId;
  }
  
  if (supportingStaffIds) {
    updates.supporting_staffs = supportingStaffIds;
  }
  console.log(updates)
  const { error } = await supabase
    .from('interventions')
    .update(updates)
    .in('id', interventionIds);
    
  if (error) throw error;
},

// async updateInterventionAssignment(interventionIds: string[], leadId: string, supportingStaffIds?: string[]) {
//   const updates: any = { lead_id: leadId };
  
//   if (supportingStaffIds) {
//     updates.supporting_staffs = supportingStaffIds;
//   }
//   console.log(updates)
//   const { error } = await supabase
//     .from('interventions')
//     .update(updates)
//     .in('id', interventionIds);
    
//   if (error) throw error;
// },
  

  async deleteIntervention(id: string) {
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
  },

  // Actions
  async createAction(action: Omit<Action, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const { data, error } = await supabase
      .from('actions')
      .insert([action])
      .select()
      .single();

    if (error) throw error;
    return data as Action;
  },

  async updateAction(id: string, updates: Partial<Action>) {
    const { data, error } = await supabase
      .from('actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Action;
  },

  // Tasks
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async updateTask(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .order('email');

    if (error) throw error;
    return data;
  }
};

export const reportApi = {
  // Get action report data
  async getActionReport(actionId: string) {
    try {
      const [actionData, achievementsData, issuesData, targetsData] = await Promise.all([
        // Get action details
        supabase
          .from('actions')
          .select(`
            *,
            intervention:interventions(
              name,
              description,
              pathway:pathways(
                name,
                cluster:clusters(name)
              )
            )
          `)
          .eq('id', actionId)
          .single(),

        // Get achievements
        supabase
          .from('action_achievements')
          .select('*')
          .eq('action_id', actionId)
          .order('date_achieved', { ascending: false }),

        // Get issues
        supabase
          .from('action_issues')
          .select('*')
          .eq('action_id', actionId)
          .order('date_identified', { ascending: false }),

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
      if (targetsData.error) throw targetsData.error;

      // Process job targets
      const jobTargets = targetsData.data.filter(target => target.category === 'jobs');
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
        status: 'completed' as const
      }));

      // Get active issues
      const activeIssues = issuesData.data
        .filter(issue => issue.status !== 'resolved')
        .map(issue => issue.description);

      return {
        id: actionData.data.id,
        name: actionData.data.name,
        description: actionData.data.description,
        status: actionData.data.status,
        milestones,
        keyMilestones: achievementsData.data
          .slice(0, 3)
          .map(a => a.description),
        issues: activeIssues,
        jobsTarget: totalJobs.target > 0 
          ? `Target: ${totalJobs.target} jobs (Current: ${totalJobs.current})\nWomen: ${totalJobs.women_target} (Current: ${totalJobs.women_current})\nYouth: ${totalJobs.youth_target} (Current: ${totalJobs.youth_current})` 
          : 'No job targets set',
        projectCost: actionData.data.budget 
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(actionData.data.budget)
          : 'Budget not set',
        lastUpdated: actionData.data.updated_at,
        path: actionData.data.intervention?.pathway?.cluster?.name 
          ? `${actionData.data.intervention.pathway.cluster.name} > ${actionData.data.intervention.pathway.name} > ${actionData.data.intervention.name}`
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
      .select(`
        id,
        name,
        intervention:interventions(
          name,
          pathway:pathways(
            name,
            cluster:clusters(name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};