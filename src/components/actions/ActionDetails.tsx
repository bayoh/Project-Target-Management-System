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
  Check
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
}

export function ActionDetails({ action, users, onUpdate }: ActionDetailsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'details' | 'achievements' | 'issues' | 'needs' | 'targets' | 'comments'>(() => {
    const tab = location.hash.slice(1);
    return ['details', 'achievements', 'issues', 'needs', 'targets', 'comments'].includes(tab) ? tab as any : 'details';
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'achievement' | 'issue' | 'need' | 'target' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadComments();
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
      const [achievementsData, issuesData, needsData, targetsData] = await Promise.all([
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
          .order('created_at', { ascending: false })
      ]);

      if (achievementsData.error) throw achievementsData.error;
      if (issuesData.error) throw issuesData.error;
      if (needsData.error) throw needsData.error;
      if (targetsData.error) throw targetsData.error;

      setAchievements(achievementsData.data);
      setIssues(issuesData.data);
      setNeeds(needsData.data);
      setTargets(targetsData.data);
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
          {formType === 'achievement' && <AchievementForm {...commonProps} achievement={editingItem} />}
          {formType === 'issue' && <IssueForm {...commonProps} issue={editingItem} />}
          {formType === 'need' && <NeedForm {...commonProps} need={editingItem} />}
          {formType === 'target' && <TargetForm {...commonProps} target={editingItem} />}
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
                  {action.implementing_partner?.name || 'Not assigned'}
                  {action.implementing_partner?.description && (
                    <p className="mt-1 text-xs text-gray-500">{action.implementing_partner.description}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Associated Project</h4>
                <div className="mt-1 text-sm text-gray-900">
                  {action.associated_project?.name || 'Not assigned'}
                  {action.associated_project?.description && (
                    <p className="mt-1 text-xs text-gray-500">{action.associated_project.description}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Lead</h4>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Users className="h-4 w-4 mr-1 text-gray-400" />
                  {action.lead_id ? users.find(u => u.id === action.lead_id)?.full_name : 'Unassigned'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Supporting Staff</h4>
                <div className="mt-1 text-sm text-gray-900">
                  {action.supporting_staff && action.supporting_staff.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {action.supporting_staff.map(id => (
                        <li key={id}>{users.find(u => u.id === id)?.full_name}</li>
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
              <button
                onClick={() => {
                  setFormType('achievement');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Achievement
              </button>
            </div>

            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {achievement.description}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Achieved on {new Date(achievement.date_achieved).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(achievement, 'achievement')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {achievement.evidence_url && (
                        <a
                          href={achievement.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {achievements.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No achievements recorded yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Issues</h3>
              <button
                onClick={() => {
                  setFormType('issue');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Issue
              </button>
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
                      <button
                        onClick={() => handleEdit(issue, 'issue')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
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
              <button
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
                      <button
                        onClick={() => handleEdit(need, 'need')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
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
              <button
                onClick={() => {
                  setFormType('target');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Target
              </button>
            </div>

            <div className="space-y-4">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {target.description}
                    </h4>
                    <div className="flex items-center space-x-4">
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
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
    </div>
    )};