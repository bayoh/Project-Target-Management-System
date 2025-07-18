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
import { format } from 'date-fns';
import { useNavigate, useLocation} from 'react-router-dom'
import { AchievementViewModal } from './AchievementViewModal';
import { Button } from '../../components/ui/button'; // Corrected import path
import { projectApi } from '../../lib/api';

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
  status: 'open' | 'in_progress' | 'resolved';
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
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
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

      const { error: commentError } = await supabase
        .from('action_comments')
        .insert([{
          action_id: action.id,
          content: newComment,
          created_by: user.id
        }]);

      if (commentError) throw commentError;
      
      setNewComment('');
      await loadComments();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message);
    } finally {
      setSubmittingComment(false);
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
      switch (formType) {
        case 'achievement':
          table = 'action_achievements';
          break;
        case 'issue':
          table = 'action_issues';
          break;
        case 'need':
          table = 'action_needs';
          break;
        case 'target':
          table = 'action_targets';
          break;
      }

      if (editingItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from(table)
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
      } else {
        // Create new item
        const { error: saveError } = await supabase
          .from(table)
          .insert([{
            ...formData,
            action_id: action.id,
            created_by: user.id
          }]);

        if (saveError) throw saveError;
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Resolved</h3>
            <p className="text-sm text-gray-500 mb-4">
              Is the action no longer at risk? If yes, the action status will be updated to 'In Progress'.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleConfirmRiskAssessment(false)}
              >
                No
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmRiskAssessment(true)}
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
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
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Code</h4>
                <p className="mt-1 text-sm text-gray-900">{action.code || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Status</h4>
                <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  action.status === 'completed' ? 'bg-green-100 text-green-800' :
                  action.status === 'at_risk' ? 'bg-red-100 text-red-800' :
                  action.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {action.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Due Date</h4>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                  {action.end_date ? new Date(action.end_date).toLocaleDateString() : 'No date set'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Budget</h4>
                <div className="mt-1 text-sm text-gray-900">
                  {action.budget ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(action.budget) : 'Not set'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Implementing Partner</h4>
                <div className="mt-1 text-sm text-gray-900">
                   {action.implementing_partners && action.implementing_partners.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {action.implementing_partners.map(id => (
                        <li key={id}>{implementing_parnters.find(u => u.id === id)?.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">No partners</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Associated Project</h4>
                <div className="mt-1 text-sm text-gray-900">
                {action.associated_projects && action.associated_projects.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {action.associated_projects.map(id => (
                        <li key={id}>{associated_projects.find(u => u.id === id)?.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">No linked projects</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Lead</h4>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Users className="h-4 w-4 mr-1 text-gray-400" />
                  {action.lead_id ? allUsers.find(u => u.id === action.lead_id)?.full_name : 'Unassigned'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Supporting Staff</h4>
                <div className="mt-1 text-sm text-gray-900">
                  {action.supporting_staff && action.supporting_staff.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {action.supporting_staff.map(id => (
                        <li key={id}>{allUsers.find(u => u.id === id)?.full_name}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">No supporting staff assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700">Description</h4>
              <p className="mt-1 text-sm text-gray-900">{action.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Achievements</h3>
              {showEdit && <button
                onClick={() => {
                  setFormType('achievement');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Achievement
              </button>}
            </div>

            {achievements.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No achievements</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new achievement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gray-50 shadow-sm rounded-lg p-4 border border-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 cursor-pointer" onClick={() => setViewingAchievement(achievement)}>
                        <h4 className="text-sm font-medium text-gray-900">{achievement.description}</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Achieved on {new Date(achievement.date_achieved).toLocaleDateString()}
                        </p>
                      </div>
                      { showEdit && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            type="button"
                            onClick={() => handleEdit(achievement, 'achievement')}
                            className="text-sm text-blue-600 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                            title="Edit Achievement"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmation({ isOpen: true, item: achievement, itemType: 'achievement' })}
                            className="text-sm text-red-600 hover:text-red-500 p-1 rounded hover:bg-red-50"
                            title="Delete Achievement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Issues</h3>
              {showEdit && <button
                onClick={() => {
                  setFormType('issue');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Issue
              </button>}
            </div>

            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        issue.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {issue.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.severity}
                      </span>
                      {issue.is_blocker && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Blocker
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        {new Date(issue.date_identified).toLocaleDateString()}
                      </div>
                      {issue.status !== 'resolved' && (
                        <button
                          onClick={() => handleQuickResolveIssue(issue)}
                          className="text-green-600 hover:text-green-800"
                          title="Mark as resolved"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {showEdit && <button
                        onClick={() => handleEdit(issue, 'issue')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>}
                      {showEdit && <button
                        onClick={() => setDeleteConfirmation({ isOpen: true, item: issue, itemType: 'issue' })}
                        className="text-red-600 hover:text-blue-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>}
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-900">
                    {issue.description}
                  </h4>

                  {issue.resolution_steps && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-gray-700">Resolution Steps</h5>
                      <p className="mt-1 text-sm text-gray-600">{issue.resolution_steps}</p>
                    </div>
                  )}
                </div>
              ))}

              {issues.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No issues reported yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'needs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Needs Assessment</h3>
              {showEdit && <button
                onClick={() => {
                  setFormType('need');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Need
              </button>
              }

            </div>

            <div className="space-y-4">
              {needs.map((need) => (
                <div
                  key={need.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      need.date_fulfilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {need.date_fulfilled ? 'Fulfilled' : 'Pending'}
                    </span>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        Identified: {new Date(need.date_identified).toLocaleDateString()}
                      </div>
                      {!need.date_fulfilled && (
                        <button
                          onClick={() => handleQuickFulfillNeed(need)}
                          className="text-green-600 hover:text-green-800"
                          title="Mark as fulfilled"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {showEdit && <button
                        onClick={() => handleEdit(need, 'need')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>}
                       <button
                        onClick={() => setDeleteConfirmation({ isOpen: true, item: need, itemType: 'need' })}
                        className="text-red-600 hover:text-blue-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-900">
                    {need.description}
                  </h4>

                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="text-xs font-medium text-gray-700">Resource Requirements</h5>
                      {/* <p className="mt Continuing the ActionDetails.tsx file exactly where it left off: */}

                      <p className="mt-1 text-gray-600">{need.resource_requirements}</p>
                    </div>
                    {need.budget_impact && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Budget Impact</h5>
                        <p className="mt-1 text-gray-600">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(need.budget_impact)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {needs.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No needs identified yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Targets and Progress</h3>
              {showEdit && <button
                onClick={() => {
                  setFormType('target');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Target
              </button>}
            </div>

            <div className="space-y-4">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {target.description}ß
                    </h4>
                    <div className="flex items-center space-x-4">
                      {target.category === 'jobs' &&(<div className="text-sm text-gray-800">
                        Type: {target.job_subcategory ? target.job_subcategory.charAt(0).toUpperCase() + target.job_subcategory.slice(1) : 'N/A'} Jobs
                      </div>)}
                      <div className="text-sm text-gray-500">
                        Last updated: {new Date(target.last_updated).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={target.current_value}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (!isNaN(newValue)) {
                              handleQuickUpdateTarget(target, newValue);
                            }
                          }}
                          className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          title="Update current value"
                        />
                        <span className="text-sm text-gray-500">{target.metric}</span>
                      </div>
                      <button
                        onClick={() => handleEdit(target, 'target')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation({ isOpen: true, item: target, itemType: 'target' })}
                        className="text-red-600 hover:text-blue-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {renderTargetContent(target)}
                </div>
              ))}

              {targets.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No targets set yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <div>
                <label htmlFor="comment" className="sr-only">Add comment</label>
                <textarea
                  id="comment"
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="board block w-full shadow-sm rounded-m border-solid border-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.user.full_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(comment.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No comments yet. Be the first to add one!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Forms */}
      {renderForm()}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this {deleteConfirmation.itemType}: "{deleteConfirmation.item?.description || deleteConfirmation.item?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmation({ isOpen: false, item: null, itemType: null })}
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
                      } 
                      
                      if (deleteConfirmation.itemType === 'achievement') {
                        await projectApi.deleteAchievement(deleteConfirmation.item.id);
                      }

                      if (deleteConfirmation.itemType === 'issue') {
                        await projectApi.deleteIssue(deleteConfirmation.item.id);
                      }

                      if (deleteConfirmation.itemType ===  'need'){
                        await projectApi.deleteNeeeds(deleteConfirmation.item.id)
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
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    )};