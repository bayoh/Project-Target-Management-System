import { supabase } from '../supabase';
import type { Cluster, Pathway, Intervention, Action, Task } from '../../types/project';
import { logError } from '../errorHandler';

export const projectApi = {
  // Project Stats
  async getProjectStats() {
    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        supabase
          .from('actions')
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
      logError(error, 'getProjectStats');
      return { projects: {}, tasks: {} };
    }
  },

  async deleteAchievementFile(achievementId: string, fileUrl: string) {
    try {
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('achievements')
        .remove([fileUrl]);

      if (storageError) {
        logError(storageError, 'deleteAchievementFile - storage');
        throw storageError;
      }

      // Update the achievement record to remove the file URL
      const { data: currentFiles, error: fetchError } = await supabase
        .from('action_achievements')
        .select('evidence_file')
        .eq('id', achievementId)
        .single();

      if (fetchError) throw fetchError;

      const updatedFiles = currentFiles.evidence_file.filter((file: string) => !file.includes(fileUrl));

      const { error: dbError } = await supabase
        .from('action_achievements')
        .update({ evidence_file: updatedFiles })
        .eq('id', achievementId);
      if (dbError) {
        logError(dbError, 'deleteAchievementFile - database');
        throw dbError;
      }

      return true;
    } catch (error) {
      logError(error, 'deleteAchievementFile');
      throw error;
    }
  },

  async deleteTarget(targetId: string) {
    try {
      // 1. Check if there is any history to delete
      const { data: historyData, error: fetchHistoryError } = await supabase
        .from('target_history')
        .select('id')
        .eq('target_id', targetId)
        .limit(1);

      if (fetchHistoryError) {
        logError(fetchHistoryError, 'deleteTarget - fetch history');
        throw fetchHistoryError;
      }

      // If history exists, delete it
      if (historyData && historyData.length > 0) {
        const { error: historyError } = await supabase
          .from('target_history')
          .delete()
          .eq('target_id', targetId);

        if (historyError) {
          logError(historyError, 'deleteTarget - delete history');
          throw historyError;
        }
      }

      // 2. Delete the target record from action_targets
      const { error: targetError } = await supabase
        .from('action_targets')
        .delete()
        .eq('id', targetId);

      if (targetError) {
        logError(targetError, 'deleteTarget');
        throw targetError;
      }

      return true; // Successfully deleted
    } catch (error) {
      logError(error, 'deleteTarget');
      throw error;
    }
  },

  async deleteIssue(issueId: string) {
    const { error } = await supabase
      .from('action_issues')
      .delete()
      .eq('id', issueId);

    if (error) {
      logError(error, 'deleteIssue');
      throw error;
    }
  },

  async deleteNeeeds(needId: string) {
    const { error } = await supabase
      .from('action_needs')
      .delete()
      .eq('id', needId);

    if (error) {
      logError(error, 'deleteNeeeds');
      throw error;
    }
  },

  async deleteAchievement(achievementId: string) {
    try {
      // 1. Fetch the achievement to get file URLs
      const { data: achievement, error: fetchError } = await supabase
        .from('action_achievements')
        .select('evidence_file')
        .eq('id', achievementId)
        .single();

      if (fetchError) {
        logError(fetchError, 'deleteAchievement - fetch');
        throw fetchError;
      }

      if (achievement && achievement.evidence_file && achievement.evidence_file.length > 0) {
        // 2. Delete files from storage
        const filePaths = achievement.evidence_file.map((file: string) => {
          // Attempt to extract path if it's a full URL
          try {
            const url = new URL(file);
            const pathParts = url.pathname.split('/');
            const bucketNameInPath = 'achievements';
            const bucketIndex = pathParts.indexOf(bucketNameInPath);
            if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
              return pathParts.slice(bucketIndex + 1).join('/');
            }
            return file;
          } catch (e) {
            // Not a valid URL, assume it's already a path
            return file;
          }
        });

        const { error: storageError } = await supabase.storage
          .from('achievements')
          .remove(filePaths);

        if (storageError) {
          logError(storageError, 'deleteAchievement - storage');
          throw storageError;
        }
      }

      // 3. Delete the achievement record from the database
      const { error: dbError } = await supabase
        .from('action_achievements')
        .delete()
        .eq('id', achievementId);

      if (dbError) {
        logError(dbError, 'deleteAchievement - database');
        throw dbError;
      }

      return true; // Successfully deleted
    } catch (error) {
      logError(error, 'deleteAchievement');
      throw error;
    }
  },

  async getActionStats() {
    try {
      const [projectsResponse] = await Promise.all([
        supabase
          .from('actions')
          .select('status')
          .not('status', 'is', null),
      ]);

      if (projectsResponse.error) throw projectsResponse.error;

      // Count projects by status
      const action = projectsResponse.data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      return { action };
    } catch (error) {
      logError(error, 'getActionStats');
      return { action: {} };
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
        pathway:pathways(*, cluster:clusters(id, name)),
        lead:profiles(*)
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

  async updateActionAssignment(actionIds: string[], leadId: string, supportingStaffIds?: string[]) {
    const updates: Record<string, unknown> = {};
    if (leadId && leadId.trim() !== '') {
      updates.lead_id = leadId;
    }

    if (supportingStaffIds) {
      updates.supporting_staff = supportingStaffIds;
    }
    const { error } = await supabase
      .from('actions')
      .update(updates)
      .in('id', actionIds);

    if (error) throw error;
  },

  async getActions() {
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
    return data;
  },

  async deleteIntervention(id: string) {
    try {
      // First verify the intervention exists and we have access to it
      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .select('id')
        .eq('id', id)
        .single();

      if (interventionError) {
        logError(interventionError, 'deleteIntervention - fetch');
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
        logError(documentsError, 'deleteIntervention - fetch documents');
        throw new Error('Failed to fetch document data');
      }

      // Get all actions for this intervention
      const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('id')
        .eq('intervention_id', id);

      if (actionsError) {
        logError(actionsError, 'deleteIntervention - fetch actions');
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
          logError(achievementsError, 'deleteIntervention - fetch achievements');
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
          logError(storageError, 'deleteIntervention - storage');
          // Continue with deletion but log the error
        }
      }

      // Delete the intervention (this will cascade to all related records)
      const { error: deleteError } = await supabase
        .from('interventions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        logError(deleteError, 'deleteIntervention');
        throw new Error('Failed to delete intervention');
      }

      return true;
    } catch (error) {
      logError(error, 'deleteIntervention');
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

  async deleteAction(id: string) {
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
      logError(error, 'deleteAction');
      throw error;
    }
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

