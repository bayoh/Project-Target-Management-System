import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Target,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowUpDown,
  Filter,
  Edit2,
  Check,
  Trash2,
  ShieldAlert // Added ShieldAlert icon for risk assessment
} from 'lucide-react';
import type { Action, User } from '../../types/project';
import { DocumentList } from '../documents/DocumentList';
import { supabase } from '../../lib/supabase';
import { AchievementForm } from './forms/AchievementForm';
import { IssueForm } from './forms/IssueForm';
import { NeedForm } from './forms/NeedForm';
import { TargetForm } from './forms/TargetForm';

import { useNavigate, useLocation} from 'react-router-dom'
import { AchievementViewModal } from './AchievementViewModal';
import { Button } from '../../components/ui/button'; // Corrected import path
import { projectApi } from '../../lib/api';
import { CommentsSection } from '../comments/CommentsSection';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface Partner {
  id: string;
  name: string;
  description: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface ActionDetailsProps {
  action: Action & {
    implementing_partner?: Partner;
    associated_project?: Project;
  };
  users: User[];
  onUpdate: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  user: User;
}

interface Achievement {
  id: string;
  description: string;
  date_achieved: string;
  evidence_url?: string;
}

interface Issue {
  id: string;
  description: string;
  status: 'open' | 'on_track' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  date_identified: string;
  date_resolved?: string;
  is_blocker: boolean;
  resolution_steps?: string;
}

interface Need {
  id: string;
  description: string;
  date_identified: string;
  date_fulfilled?: string;
  resource_requirements: string;
  budget_impact?: number;
}

interface Target {
  id: string;
  description: string;
  metric: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  last_updated: string;
  category?: string;
  women_target?: number;
  women_current?: number;
  youth_target?: number;
  youth_current?: number;
  job_subcategory?: string;
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  itemName: string;
  itemType: string;
  onConfirm: () => void;
  onCancel: () => void;
}


export function ActionDetails({ action, users, onUpdate }: ActionDetailsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackCreate, trackUpdate, trackDelete } = useActivityTracking();
  const [activeTab, setActiveTab] = useState<'details' | 'achievements' | 'issues' | 'needs' | 'targets' | 'comments'>(() => {
    const tab = location.hash.slice(1);
    return ['details', 'achievements', 'issues', 'needs', 'targets', 'comments'].includes(tab) ? tab as any : 'details';
  });
  const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [allUsers, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [implementing_parnters, setImplementingPartners] = useState<Partner[]>([]);
  const [associated_projects, setAssociatedProjects] = useState<Project[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'achievement' | 'issue' | 'need' | 'target' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: any; itemType: string | null }>({ 
    isOpen: false, 
    item: null, 
    itemType: null 
  });

  const [showRiskAssessmentDialog, setShowRiskAssessmentDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const deleteConfirmationDialog = ({ isOpen, itemName, itemType, onConfirm, onCancel }: DeleteConfirmationDialogProps) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete this {itemType}: "{itemName}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const handleIssueResolved = () => {
    setShowRiskAssessmentDialog(true);
  };

  const handleConfirmRiskAssessment = async (isNoLongerAtRisk: boolean) => {
    if (isNoLongerAtRisk) {
      setLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('actions')
          .update({ status: 'on_track', updated_at: new Date().toISOString() })
          .eq('id', action.id);

        if (updateError) throw updateError;
        onUpdate(); // Refresh action details
      } catch (err: any) {
        console.error('Error updating action status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    setShowRiskAssessmentDialog(false);
  };

  useEffect(() => {
    loadData();
    loadComments();
    getUserPermission();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, [action.id]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('action_comments')
        .select(`
          *,
          user:profiles!action_comments_created_by_fkey1(email, full_name)
        `)
        .eq('action_id', action.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: commentData, error: commentError } = await supabase
        .from('action_comments')
        .insert([{
          action_id: action.id,
          content: newComment,
          created_by: user.id
        }])
        .select('id')
        .single();

      if (commentError) throw commentError;
      
      // Track comment creation activity
      await trackCreate('comment', commentData.id, {
        action_id: action.id,
        content_preview: newComment.substring(0, 100)
      });
      
      setNewComment('');
      await loadComments();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('action_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      // Track comment deletion activity
      await trackDelete('comment', commentId, {
        action_id: action.id
      });
      
      await loadComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const loadData = async () => {
    try {
      const [achievementsData, issuesData, needsData, targetsData, userData, implementing_parnters, associated_partners] = await Promise.all([
        supabase
          .from('action_achievements')
          .select('*')
          .eq('action_id', action.id)
          .order('date_achieved', { ascending: false }),
        supabase
          .from('action_issues')
          .select('*')
          .eq('action_id', action.id)
          .order('date_identified', { ascending: false }),
        supabase
          .from('action_needs')
          .select('*')
          .eq('action_id', action.id)
          .order('date_identified', { ascending: false }),
        supabase
          .from('action_targets')
          .select('*')
          .eq('action_id', action.id)
          .order('created_at', { ascending: false }),
         supabase
         .from('profiles')
         .select('*'),
         supabase
         .from('implementing_partners')
         .select('*'),
         supabase
         .from('associated_projects')
         .select('*')
      ]);

      if (achievementsData.error) throw achievementsData.error;
      if (issuesData.error) throw issuesData.error;
      if (needsData.error) throw needsData.error;
      if (targetsData.error) throw targetsData.error;
      if(userData.error) throw userData.error;
      if(implementing_parnters.error) throw implementing_parnters.error;
      if(associated_partners.error) throw associated_partners.error;

      setAchievements(achievementsData.data);
      setIssues(issuesData.data);
      setNeeds(needsData.data);
      setTargets(targetsData.data);
      setUsers(userData.data);
      setImplementingPartners(implementing_parnters.data);
      setAssociatedProjects(associated_partners.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const calculateProgress = () => {
    if (!targets.length) return 0;
    const completedTargets = targets.filter(
      target => target.current_value >= target.target_value
    ).length;
    return (completedTargets / targets.length) * 100;
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let table = '';
      let entityType = '';
      switch (formType) {
        case 'achievement':
          table = 'action_achievements';
          entityType = 'achievement';
          break;
        case 'issue':
          table = 'action_issues';
          entityType = 'issue';
          break;
        case 'need':
          table = 'action_needs';
          entityType = 'need';
          break;
        case 'target':
          table = 'action_targets';
          entityType = 'target';
          break;
      }

      // Strip server-managed fields from formData
      const { id, created_at, updated_at, created_by, action_id, ...cleanFormData } = formData;

      if (editingItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from(table)
          .update({
            ...cleanFormData,
            action_id: action.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
        
        // Track update activity
        await trackUpdate(entityType as any, editingItem.id, {
          action_id: action.id,
          description: formData.description || formData.name,
          changes: Object.keys(formData)
        });
      } else {
        // Create new item
        const { data: newItem, error: saveError } = await supabase
          .from(table)
          .insert([{
            ...cleanFormData,
            action_id: action.id,
            created_by: user.id
          }])
          .select('id')
          .single();

        if (saveError) throw saveError;
        
        // Track create activity
        await trackCreate(entityType as any, newItem.id, {
          action_id: action.id,
          description: formData.description || formData.name
        });
      }

      await loadData();
      onUpdate();
      setShowForm(false);
      setFormType(null);
      setEditingItem(null);
    } catch (err: any) {
      console.error(`Error saving ${formType}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any, type: 'achievement' | 'issue' | 'need' | 'target') => {
    setFormType(type);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleQuickResolveIssue = async (issue: any) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('action_issues')
        .update({
          status: 'resolved',
          date_resolved: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', issue.id);

      if (updateError) throw updateError;
      
      // Track issue resolution activity
      await trackUpdate('issue', issue.id, {
        action_id: action.id,
        status: 'resolved',
        description: issue.description
      });
      
      await loadData();
      onUpdate();
      handleIssueResolved(); // Call the risk assessment dialog
    } catch (err: any) {
      console.error('Error resolving issue:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFulfillNeed = async (need: any) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('action_needs')
        .update({
          date_fulfilled: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', need.id);

      if (updateError) throw updateError;
      
      // Track need fulfillment activity
      await trackUpdate('need', need.id, {
        action_id: action.id,
        date_fulfilled: new Date().toISOString().split('T')[0],
        description: need.description
      });
      
      await loadData();
      onUpdate();
    } catch (err: any) {
      console.error('Error fulfilling need:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserPermission = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    setShowEdit(user?.id === action.lead_id || user?.user_metadata.role === 'super_admin');
 
  }

  const handleQuickUpdateTarget = async (target: any, newValue: number) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('action_targets')
        .update({
          current_value: newValue,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', target.id);

      if (updateError) throw updateError;
      
      // Track target update activity
      await trackUpdate('target', target.id, {
        action_id: action.id,
        current_value: newValue,
        previous_value: target.current_value,
        description: target.description
      });
      
      await loadData();
      onUpdate();
    } catch (err: any) {
      console.error('Error updating target:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAchievementView = (achievement: Achievement) => {
    setViewingAchievement(achievement);
  };

  const renderForm = () => {
    if (!showForm || !formType) return null;

    const commonProps = {
      onSubmit: handleSubmit,
      onCancel: () => {
        setShowForm(false);
        setFormType(null);
        setEditingItem(null);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Edit' : 'Add'} {' '}
            {formType === 'achievement' && 'Achievement'}
            {formType === 'issue' && 'Issue'}
            {formType === 'need' && 'Need'}
            {formType === 'target' && 'Target'}
          </h3>
          {formType === 'achievement' && <AchievementForm {...commonProps} achievement={editingItem} action={action.id} showEdit/>}
          {formType === 'issue' && <IssueForm {...commonProps} issue={editingItem} onIssueResolved={handleIssueResolved} showEdit />}
          {formType === 'need' && <NeedForm {...commonProps} need={editingItem} showEdit />}
          {formType === 'target' && <TargetForm {...commonProps} target={editingItem} showEdit />}
        </div>
      </div>
    );
  };

  const renderTargetContent = (target: Target) => {
    return (
      <div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {target.current_value} / {target.target_value} {target.metric}
            </span>
            <span className="font-medium text-blue-600">
              {((target.current_value / target.target_value) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${Math.min((target.current_value / target.target_value) * 100, 100)}%`
              }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Baseline: {target.baseline_value} {target.metric}
          </div>

          {/* Category display */}
          {target.category && (
            <div className="mt-2 mb-4">
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium text-xs">
                {target.category.charAt(0).toUpperCase() + target.category.slice(1).replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {/* Job-specific progress tracking */}
          {target.category === 'jobs' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Women Jobs Progress */}
              {(target.women_target || target.women_current) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Women Jobs Progress</h5>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Target: {target.women_target || 0}</span>
                    <span>Current: {target.women_current || 0}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${target.women_target ? Math.min((target.women_current || 0) / target.women_target * 100, 100) : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Youth Jobs Progress */}
              {(target.youth_target || target.youth_current) && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-green-900 mb-2">Youth Jobs Progress</h5>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Target: {target.youth_target || 0}</span>
                    <span>Current: {target.youth_current || 0}</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${target.youth_target ? Math.min((target.youth_current || 0) / target.youth_target * 100, 100) : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Achievement View Modal */}
      <AchievementViewModal
        isOpen={!!viewingAchievement}
        onClose={() => setViewingAchievement(null)}
        achievement={viewingAchievement || {
          description: '',
          date_achieved: '',
          evidence_url: '',
          evidence_file: []
        }}
      />
      {/* Progress Overview */}
      {/* <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Progress Overview</h3>
          <span className="text-2xl font-bold text-blue-600">
            {calculateProgress().toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div> */}

      {/* Risk Assessment Dialog */}
      {showRiskAssessmentDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Is the action no longer off track? If yes, the action status will be updated to 'On Track'.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleConfirmRiskAssessment(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                No, Still Off Track
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmRiskAssessment(true)}
                className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700 text-white"
              >
                Yes, No Longer Off Track
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
          <div className="flex space-x-1 sm:space-x-4 min-w-max">
            {[
              { id: 'details', label: 'Details' },
              { id: 'achievements', label: 'Achievements' },
              { id: 'issues', label: 'Issues' },
              { id: 'needs', label: 'Needs' },
              { id: 'targets', label: 'Targets' },
              { id: 'comments', label: 'Comments' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  navigate(`#${tab.id}`, { replace: true });
                }}
                className={`
                  whitespace-nowrap pb-2.5 sm:pb-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'}
                `}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Code</h4>
                <p className="text-sm font-medium text-gray-900 leading-relaxed">{action.code || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</h4>
                <StatusBadge status={action.status} />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Due Date</h4>
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                  {action.end_date ? new Date(action.end_date).toLocaleDateString() : 'No date set'}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Budget</h4>
                <div className="text-sm font-medium text-gray-900">
                  {action.budget ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(action.budget) : 'Not specified'}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Implementing Partners</h4>
                <div className="flex flex-wrap gap-1.5">
                   {action.implementing_partners && action.implementing_partners.length > 0 ? (
                      action.implementing_partners.map(id => {
                        const partner = implementing_parnters.find(u => u.id === id);
                        return partner ? (
                          <span key={id} className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                            {partner.name}
                          </span>
                        ) : null;
                      })
                  ) : (
                    <span className="text-gray-500 text-sm">No partners assigned</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Associated Projects</h4>
                <div className="flex flex-wrap gap-1.5">
                {action.associated_projects && action.associated_projects.length > 0 ? (
                    action.associated_projects.map(id => {
                      const project = associated_projects.find(u => u.id === id);
                      return project ? (
                        <span key={id} className="inline-block bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-md border border-green-200 font-medium">
                          {project.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-gray-500 text-sm">No projects linked</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lead</h4>
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                  {action.lead_id ? allUsers.find(u => u.id === action.lead_id)?.full_name : 'Not assigned'}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Supporting Staff</h4>
                <div className="flex flex-wrap gap-1.5">
                  {action.supporting_staff && action.supporting_staff.length > 0 ? (
                    action.supporting_staff.map(id => {
                      const staff = allUsers.find(u => u.id === id);
                      return staff ? (
                        <span key={id} className="inline-block bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-md border border-purple-200 font-medium">
                          {staff.full_name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-gray-500 text-sm">No supporting staff</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">Description</h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{action.description}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Achievements</h3>
              {showEdit && (
                <Button
                  onClick={() => {
                    setFormType('achievement');
                    setShowForm(true);
                    setEditingItem(null);
                  }}
                  className="flex items-center justify-center text-sm px-3 py-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Achievement
                </Button>
              )}
            </div>
            
            {achievements.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">No achievements yet</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  Get started by adding your first achievement to track progress.
                </p>
                {showEdit && (
                  <Button
                    onClick={() => {
                      setFormType('achievement');
                      setShowForm(true);
                      setEditingItem(null);
                    }}
                    className="flex items-center justify-center text-sm px-4 py-2"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Achievement
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingAchievement(achievement)}>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1.5 leading-tight">{achievement.description}</h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          Achieved on {new Date(achievement.date_achieved).toLocaleDateString()}
                        </div>
                      </div>
                      {showEdit && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Button
                            onClick={() => handleEdit(achievement, 'achievement')}
                            variant="outline"
                            size="sm"
                            className="p-1.5"
                            title="Edit Achievement"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmation({ isOpen: true, item: achievement, itemType: 'achievement' })}
                            variant="outline"
                            size="sm"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete Achievement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Issues</h3>
              {showEdit && (
                <Button
                  onClick={() => {
                    setFormType('issue');
                    setShowForm(true);
                    setEditingItem(null);
                  }}
                  className="flex items-center justify-center text-sm px-3 py-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Issue
                </Button>
              )}
            </div>

            {issues.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">No issues reported</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  No issues have been reported for this action yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            issue.status === 'off_track' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {issue.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          {issue.is_blocker && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              BLOCKER
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1.5 leading-tight">{issue.description}</h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          Reported on {new Date(issue.date_identified).toLocaleDateString()}
                        </div>
                        {issue.resolution_steps && (
                          <div className="mt-2.5">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Resolution Steps</h5>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{issue.resolution_steps}</p>
                          </div>
                        )}
                      </div>
                      {showEdit && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {issue.status !== 'resolved' && (
                            <Button
                              onClick={() => handleQuickResolveIssue(issue)}
                              variant="outline"
                              size="sm"
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50"
                              title="Mark as resolved"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleEdit(issue, 'issue')}
                            variant="outline"
                            size="sm"
                            className="p-1.5"
                            title="Edit Issue"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmation({ isOpen: true, item: issue, itemType: 'issue' })}
                            variant="outline"
                            size="sm"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete Issue"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'needs' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Needs</h3>
              {showEdit && (
                <Button
                  onClick={() => {
                    setFormType('need');
                    setShowForm(true);
                    setEditingItem(null);
                  }}
                  className="flex items-center justify-center text-sm px-3 py-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Need
                </Button>
              )}
            </div>

            {needs.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">No needs identified</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  No resource needs have been identified for this action yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {needs.map((need) => (
                  <div
                    key={need.id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            need.date_fulfilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {need.date_fulfilled ? 'FULFILLED' : 'PENDING'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">{need.description}</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            Identified: {new Date(need.date_identified).toLocaleDateString()}
                          </div>
                          {need.budget_impact && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Target className="h-3.5 w-3.5 mr-1.5" />
                              Budget Impact: {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(need.budget_impact)}
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5">
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Resource Requirements</h5>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{need.resource_requirements}</p>
                        </div>
                      </div>
                      {showEdit && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {!need.date_fulfilled && (
                            <Button
                              onClick={() => handleQuickFulfillNeed(need)}
                              variant="outline"
                              size="sm"
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50"
                              title="Mark as fulfilled"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleEdit(need, 'need')}
                            variant="outline"
                            size="sm"
                            className="p-1.5"
                            title="Edit Need"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmation({ isOpen: true, item: need, itemType: 'need' })}
                            variant="outline"
                            size="sm"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete Need"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Targets and Progress</h3>
              {showEdit && (
                <Button
                  onClick={() => {
                    setFormType('target');
                    setShowForm(true);
                    setEditingItem(null);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target
                </Button>
              )}
            </div>

            {targets.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <Target className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">No targets set yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-tight">
                          {target.description}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {target.category && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs">
                              {target.category.charAt(0).toUpperCase() + target.category.slice(1).replace(/_/g, ' ')}
                              {target.category === 'jobs' && target.job_subcategory && (
                                <span className="ml-1">- {target.job_subcategory.charAt(0).toUpperCase() + target.job_subcategory.slice(1)}</span>
                              )}
                            </span>
                          )}
                          <span className="text-gray-500 font-medium">
                            Updated: {new Date(target.last_updated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                          <input
                            type="number"
                            value={target.current_value}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value);
                              if (!isNaN(newValue)) {
                                handleQuickUpdateTarget(target, newValue);
                              }
                            }}
                            className="w-16 bg-transparent border-none text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
                            title="Update current value"
                          />
                          <span className="text-xs text-gray-500 font-medium">{target.metric}</span>
                        </div>
                        
                        {showEdit && (
                          <div className="flex items-center space-x-1">
                            <Button
                              onClick={() => handleEdit(target, 'target')}
                              variant="outline"
                              size="sm"
                              className="p-1.5"
                              title="Edit Target"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => setDeleteConfirmation({ isOpen: true, item: target, itemType: 'target' })}
                              variant="outline"
                              size="sm"
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50"
                              title="Delete Target"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {renderTargetContent(target)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4 p-4 sm:p-6">
            <CommentsSection
              title="Comments"
              comments={comments as any}
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleCommentSubmit}
              submitting={submittingComment}
               currentUserId={currentUserId ?? undefined}
               contentCreatorId={action.created_by}
               onDelete={handleDeleteComment}
               showAvatars={true}
            />
          </div>
        )}
      </div>

      {/* Forms */}
      {renderForm()}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to delete this {deleteConfirmation.itemType}: <span className="font-medium text-gray-900">"{deleteConfirmation.item?.description || deleteConfirmation.item?.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmation({ isOpen: false, item: null, itemType: null })}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (deleteConfirmation.item && deleteConfirmation.itemType) {
                    try {
                      if (deleteConfirmation.itemType === 'target') {
                        await projectApi.deleteTarget(deleteConfirmation.item.id);
                        trackDelete('target', {
                          action_id: action.id,
                          description: deleteConfirmation.item.description,
                          metric: deleteConfirmation.item.metric,
                          current_value: deleteConfirmation.item.current_value
                        });
                      } 
                      
                      if (deleteConfirmation.itemType === 'achievement') {
                        await projectApi.deleteAchievement(deleteConfirmation.item.id);
                        trackDelete('achievement', {
                          action_id: action.id,
                          description: deleteConfirmation.item.description,
                          status: deleteConfirmation.item.status
                        });
                      }

                      if (deleteConfirmation.itemType === 'issue') {
                        await projectApi.deleteIssue(deleteConfirmation.item.id);
                        trackDelete('issue', {
                          action_id: action.id,
                          description: deleteConfirmation.item.description,
                          status: deleteConfirmation.item.status,
                          priority: deleteConfirmation.item.priority
                        });
                      }

                      if (deleteConfirmation.itemType ===  'need'){
                        await projectApi.deleteNeeeds(deleteConfirmation.item.id)
                        trackDelete('need', {
                          action_id: action.id,
                          description: deleteConfirmation.item.description,
                          status: deleteConfirmation.item.status,
                          priority: deleteConfirmation.item.priority
                        });
                      }

                      // if (deleteConfirmation.itemType === 'comment'){
                      //   await projectApi.deleteComment(deleteConfirmation.item.id)
                      // }
                      // update the achievement list
                      setAchievements(achievements.filter((a) => a.id !== deleteConfirmation.item.id));
                      setTargets(targets.filter((t) => t.id !== deleteConfirmation.item.id));
                      setIssues(issues.filter((i) => i.id !== deleteConfirmation.item.id));
                      setNeeds(needs.filter((n) => n.id !== deleteConfirmation.item.id)); 
                    } catch (error) {
                      console.error('Error deleting achievement:', error);
                      // Handle error appropriately
                    }
                  }
                  setDeleteConfirmation({ isOpen: false, item: null, itemType: null });
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    )};