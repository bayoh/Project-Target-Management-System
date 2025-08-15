import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Plus,
  ChevronRight,
  Network,
  List,
  Calendar,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Target,
  Eye,
  Filter,
  X,
  Loader2,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { projectApi, userApi } from '../../lib/api';
import type { Action, User, Intervention } from '../../types/project';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { ActionModal } from '../../components/ui/ActionModal';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import { useAuth } from '../../lib/auth';

interface ConfirmationState {
  isOpen: boolean;
  type: 'delete' | 'status';
  actionId: string;
  newStatus?: 'completed' | 'in_progress' | 'at_risk' | 'not_started';
}

export function ActionDashboard() {
  const { trackPageView } = useActivityTracking();
  const { user: sessionUser } = useAuth();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'delete',
    actionId: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    interventionId: '',
    leadId: '',
    status: '',
    search: '',
    intervention: '',
    lead: '',
    supportingStaff: [],
    implementingPartners: [],
    associatedProjects: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  // Fetch actions using TanStack Query
  const { data: actions = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.projects.actions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          intervention:interventions(*),
          lead:profiles!actions_lead_id_fkey1(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((action: any) => ({
        ...action,
        intervention: action.intervention || { id: '', name: 'Unknown Intervention', code: '' },
        lead: action.lead || { id: '', email: 'Unassigned', full_name: 'Unassigned' },
        supporting_staff: action.supporting_staff ? (typeof action.supporting_staff === 'string' ? action.supporting_staff.split(',').map((s: string) => s.trim()) : action.supporting_staff) : [],
        implementing_partners: action.implementing_partners ? (typeof action.implementing_partners === 'string' ? action.implementing_partners.split(',').map((s: string) => s.trim()) : action.implementing_partners) : [],
        associated_projects: action.associated_projects ? (typeof action.associated_projects === 'string' ? action.associated_projects.split(',').map((s: string) => s.trim()) : action.associated_projects) : [],
        confirmText: `Are you sure you want to delete "${action.name || 'this action'}"?`
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch interventions using TanStack Query
  const { data: interventions = [] } = useQuery({
    queryKey: queryKeys.projects.interventions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return (data || []).map((intervention: any) => ({
        ...intervention,
        name: intervention.name || 'Unknown Intervention',
        code: intervention.code || ''
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch users using TanStack Query
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return (data || []).map((user: any) => ({
        ...user,
        full_name: user.full_name || user.email || 'Unknown User'
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch projects for associated projects filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => projectApi.deleteAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.actions() });
      toast.success('Action deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting action:', error);
      toast.error('Failed to delete action');
    },
  });
 
  useEffect(() => {
    trackPageView('Action Dashboard');
  }, []);

  const handleDeleteClick = (id: string) => {
    setConfirmation({
      isOpen: true,
      type: 'delete',
      actionId: id,
    });
  };

  const handleDelete = async () => {
    const toastId = toast.loading('Deleting action...');
    try {
      await deleteActionMutation.mutateAsync(confirmation.actionId);
      
      setConfirmation({
        isOpen: false,
        type: 'delete',
        actionId: '',
      });
      
      toast.dismiss(toastId);
    } catch (err: any) {
      console.error('Error deleting action:', err);
      toast.dismiss(toastId);
    }
  };

  const handleStatusClick = (id: string, status: 'completed' | 'in_progress' | 'at_risk' | 'not_started') => {
    setConfirmation({
      isOpen: true,
      type: 'status',
      actionId: id,
      newStatus: status,
    });
  };

  const handleStatusChange = async () => {
    if (!confirmation.newStatus) return;

    const toastId = toast.loading('Updating action status...');
    try {
      await projectApi.updateAction(confirmation.actionId, { status: confirmation.newStatus });
      
      setConfirmation({
        isOpen: false,
        type: 'status',
        actionId: '',
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.projects.actions() });
      
      toast.success('Action status updated successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error updating action status:', err);
      toast.error('Failed to update action status', { id: toastId });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.actions() });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'not_started':
        return <X className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const filteredActions = (actions || []).filter((action: any) => {
    if (filters.interventionId && action.intervention_id !== filters.interventionId) return false;
    if (filters.intervention && action.intervention_id !== filters.intervention) return false;
    if (filters.leadId && action.lead_id !== filters.leadId) return false;
    if (filters.lead && action.lead_id !== filters.lead) return false;
    if (filters.status && action.status !== filters.status) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const actionName = action.name || '';
      const actionDescription = action.description || '';
      const matchesName = actionName.toLowerCase().includes(searchTerm);
      const matchesDescription = actionDescription.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesDescription) return false;
    }
    
    const matchesSupportingStaff = filters.supportingStaff.length === 0 || 
      filters.supportingStaff.some(staff => 
        action.supporting_staff?.some((actionStaff: string) => 
          actionStaff.toLowerCase().includes(staff.toLowerCase())
        )
      );
    
    const matchesImplementingPartners = filters.implementingPartners.length === 0 || 
      filters.implementingPartners.some(partner => 
        action.implementing_partners?.some((actionPartner: string) => 
          actionPartner.toLowerCase().includes(partner.toLowerCase())
        )
      );
    
    const matchesAssociatedProjects = filters.associatedProjects.length === 0 || 
      filters.associatedProjects.some(projectId => 
        action.associated_projects?.some((actionProject: string) => 
          actionProject === projectId
        )
      );
    
    return matchesSupportingStaff && matchesImplementingPartners && matchesAssociatedProjects;
  });

  const getMetrics = () => {
    const safeActions = Array.isArray(filteredActions) ? filteredActions : [];
    const totalActions = safeActions.length;
    const statusCounts = {
      completed: safeActions.filter((a: any) => a.status === 'completed').length,
      in_progress: safeActions.filter((a: any) => a.status === 'in_progress').length,
      at_risk: safeActions.filter((a: any) => a.status === 'at_risk').length,
      not_started: safeActions.filter((a: any) => a.status === 'not_started').length
    };
    return { totalActions, statusCounts };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      </DashboardLayout>
    );
  }

  const metrics = getMetrics();

  const handleEditClick = (action: Action) => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  const handlenewActionClick = () => {
    setSelectedAction(null);
    setIsModalOpen(true);
    
  };
  
  const handleActionSubmit = async (actionData: Partial<Action>) => {
    const toastId = toast.loading(selectedAction ? 'Updating action...' : 'Creating action...');
    try {
      if (selectedAction) {
        await projectApi.updateAction(selectedAction.id, actionData);
      } else {
        // Ensure required fields are present for new action
        if (!actionData.intervention_id) {
          throw new Error('Intervention is required');
        }
        if (!actionData.name) {
          throw new Error('Action name is required');
        }
        if (!actionData.lead_id) {
          throw new Error('Action lead is required');
        }

        // Set default values for new action
        const newActionData = {
          ...actionData,
          status: actionData.status || 'not_started',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: sessionUser?.id
        };

        await projectApi.createAction(newActionData);
      }
      
      setIsModalOpen(false);
      setSelectedAction(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.actions() });
      
      toast.success(selectedAction ? 'Action updated successfully' : 'Action created successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error saving action:', err);
      toast.error(err.message || 'Failed to save action', { id: toastId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 lg:space-y-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Actions Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-600">Manage and track all actions across interventions</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg shadow-sm text-sm font-medium transition-all duration-200 ${
                showFilters 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={() => handlenewActionClick()}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Action
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 mb-5 lg:mb-6">
          <div 
            className="bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: '', intervention: '', lead: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Actions</p>
                <h3 className="text-lg font-bold text-gray-900">{metrics.totalActions}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'completed', intervention: '', lead: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
                <h3 className="text-lg font-bold text-gray-900">{metrics.statusCounts.completed}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'in_progress', intervention: '', lead: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">On Track</p>
                <h3 className="text-lg font-bold text-gray-900">{metrics.statusCounts.in_progress}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'at_risk', intervention: '', lead: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Off Track</p>
                <h3 className="text-lg font-bold text-gray-900">{metrics.statusCounts.at_risk}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'not_started', intervention: '', lead: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <X className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Not Started</p>
                <h3 className="text-lg font-bold text-gray-900">{metrics.statusCounts.not_started}</h3>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search actions..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>
              
              {/* Primary Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={filters.interventionId}
                  onChange={(e) => setFilters(prev => ({ ...prev, interventionId: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="">All Interventions</option>
                  {interventions?.map((intervention) => (
                    <option key={intervention.id} value={intervention.id}>
                      {intervention.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.leadId}
                  onChange={(e) => setFilters(prev => ({ ...prev, leadId: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="">All Leads</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="">All Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="at_risk">At Risk</option>
                </select>
                <Select
                  options={projects.map(project => ({ value: project.id, label: project.name }))}
                  value={filters.associatedProjects}
                  onChange={(value) => setFilters(prev => ({ ...prev, associatedProjects: value }))}
                  placeholder="Associated Projects"
                  multiple
                  searchable
                  allowClear
                  className="min-w-0"
                />
              </div>
              
              {/* Secondary Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  options={[
                    ...new Set(
                      actions.flatMap(action => action.supporting_staff || [])
                    )
                  ].filter(Boolean).map(staff => ({ value: staff, label: staff }))}
                  value={filters.supportingStaff}
                  onChange={(value) => setFilters(prev => ({ ...prev, supportingStaff: value }))}
                  placeholder="Supporting Staff"
                  multiple
                  searchable
                  allowClear
                  className="min-w-0"
                />
                <Select
                  options={[
                    ...new Set(
                      actions.flatMap(action => action.implementing_partners || [])
                    )
                  ].filter(Boolean).map(partner => ({ value: partner, label: partner }))}
                  value={filters.implementingPartners}
                  onChange={(value) => setFilters(prev => ({ ...prev, implementingPartners: value }))}
                  placeholder="Implementing Partners"
                  multiple
                  searchable
                  allowClear
                  className="min-w-0"
                />
              </div>
              
              {/* Clear All Filters */}
              {(filters.search || filters.interventionId || filters.leadId || filters.status || 
                filters.supportingStaff.length > 0 || filters.implementingPartners.length > 0 || 
                filters.associatedProjects.length > 0) && (
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setFilters({
                      interventionId: '',
                      leadId: '',
                      status: '',
                      search: '',
                      intervention: '',
                      lead: '',
                      supportingStaff: [],
                      implementingPartners: [],
                      associatedProjects: []
                    })}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No actions found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {filters.search || filters.interventionId || filters.leadId || filters.status ||
                 filters.supportingStaff.length > 0 || filters.implementingPartners.length > 0 ||
                 filters.associatedProjects.length > 0
                  ? 'Try adjusting your filters to see more results'
                  : 'Get started by creating your first action'}
              </p>
            </div>
          ) : (
            filteredActions.map((action: any) => {
              const intervention = (interventions || []).find((i: any) => i.id === action.intervention_id) || action.intervention;
              const lead = (users || []).find((u: any) => u.id === action.lead_id) || action.lead;
              
              return (
                <div key={action.id} className="bg-white shadow-md rounded-xl p-5 hover:shadow-lg transition-all duration-300 border border-gray-100 group">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(action.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{action.name || 'Untitled Action'}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium text-gray-700 mr-1">Intervention:</span>
                              <span className="truncate">{intervention?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium text-gray-700 mr-1">Lead:</span>
                              <span className="truncate">{lead?.full_name || lead?.email || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                              <span className="font-medium text-gray-700 mr-1">Start:</span>
                              <span>{action.start_date ? (() => {
                                try {
                                  const date = typeof action.start_date === 'string' ? new Date(action.start_date) : action.start_date;
                                  return date.toLocaleDateString();
                                } catch {
                                  return 'Invalid date';
                                }
                              })() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                              <span className="font-medium text-gray-700 mr-1">End:</span>
                              <span>{action.end_date ? (() => {
                                try {
                                  const date = typeof action.end_date === 'string' ? new Date(action.end_date) : action.end_date;
                                  return date.toLocaleDateString();
                                } catch {
                                  return 'Invalid date';
                                }
                              })() : 'N/A'}</span>
                            </div>
                          </div>
                          {action.description && (
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{action.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row lg:flex-col xl:flex-row items-center gap-2 lg:ml-4">
                      <button
                        onClick={() => navigate(`/interventions/${action.intervention_id}/actions/${action.id}`)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleEditClick(action)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center px-3 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-1.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(action.id)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center px-3 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.type === 'delete' ? 'Delete Action' : 'Update Status'}
        message={confirmation.type === 'delete' 
          ? 'Are you sure you want to delete this action? This action cannot be undone.'
          : 'Are you sure you want to update the status of this action?'}
        confirmLabel={confirmation.type === 'delete' ? 'Delete' : 'Update'}
        onConfirm={confirmation.type === 'delete' ? handleDelete : handleStatusChange}
        onClose={() => setConfirmation({ isOpen: false, type: 'delete', actionId: '' })}
      />
      
      
      <ActionModal
        isOpen={isModalOpen}
        onClose={() => {
            setSelectedAction(null);
          setIsModalOpen(false);
          
        }}
        onSubmit={handleActionSubmit}
        action={selectedAction || undefined}
        users={users}
        interventions={interventions}
        title={selectedAction ? 'Edit Action' : 'New Action'}
      />
    </DashboardLayout>
  );
}