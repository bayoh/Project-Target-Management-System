import { useState, useEffect, useMemo } from 'react';

import {
  Plus,
  Filter,
  Loader2,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { projectApi } from '../../lib/api';
import type { Action } from '../../types/project';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';
import { ActionModal } from '../../components/ui/ActionModal';
import { ActionCard } from '../../components/ui/ActionCard';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui/button';
import { MetricsGrid, createActionMetrics } from '../../components/ui/MetricsGrid';
import { FilterPanel, FilterConfig } from '../../components/ui/FilterPanel';
import { statusBadge } from '../../components/ui/statusBadge';

interface ConfirmationState {
  isOpen: boolean;
  type: 'delete' | 'status';
  actionId: string;
  newStatus?: 'completed' | 'on_track' | 'off_track' | 'not_started';
}

export function ActionDashboard() {
  const { trackPageView, trackDelete } = useActivityTracking();
  const { user: sessionUser } = useAuth();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'delete',
    actionId: '',
  });
  // const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  // const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    interventionId: '',
    leadId: '',
    status: '',
    search: '',
    intervention: '',
    lead: '',
    supportingStaff: [] as string[],
    implementingPartners: [] as string[],
    associatedProjects: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  // Fetch actions using TanStack Query
  const { data: actions = [], isLoading: loading } = useQuery({
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
        lead: action.lead || { id: '', full_name: 'Unassigned' },
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
        full_name: user.full_name || user.id || 'Unknown User'
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch projects for associated projects filter
  const { data: projects = [] } = useQuery({
    queryKey: ['associated_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('associated_projects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });


  // Fetch partners for implementing partners filter
  const { data: partners = [] } = useQuery({
    queryKey: ['implementing_partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implementing_partners')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => projectApi.deleteAction(actionId),
    onSuccess: (_, actionId) => {
      const deletedAction = actions.find(action => action.id === actionId);
      if (deletedAction) {
        trackDelete('action', actionId, {
          name: deletedAction.name,
          intervention_id: deletedAction.intervention_id,
          status: deletedAction.status
        });
      }
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

  // const handleStatusClick = (id: string, status: 'completed' | 'in_progress' | 'at_risk' | 'not_started') => {
  //   setConfirmation({
  //     isOpen: true,
  //     type: 'status',
  //     actionId: id,
  //     newStatus: status,
  //   });
  // };

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

  // const getStatusIcon = (status: string) => {
  //   switch (status) {
  //     case 'completed':
  //       return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  //     case 'in_progress':
  //       return <Clock className="h-5 w-5 text-blue-500" />;
  //     case 'at_risk':
  //       return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  //     case 'not_started':
  //       return <X className="h-5 w-5 text-gray-500" />;
  //     default:
  //       return null;
  //   }
  // };

  const filteredActions = (actions || []).filter((action: any) => {
    if (filters.interventionId && action.intervention_id !== filters.interventionId) return false;
    if (filters.leadId && action.lead_id !== filters.leadId) return false;
    // if (filters.lead && action.lead_id !== filters.lead) return false;
    if (filters.status && action.status !== filters.status) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const actionName = (action.name || '').toString();
      const actionDescription = (action.description || '').toString();
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

  // Create filter configurations
  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'interventionId',
      label: 'Intervention',
      placeholder: 'All Interventions',
      options: interventions.map(intervention => ({
        value: intervention.id,
        label: intervention.name
      }))
    },
    {
      key: 'leadId',
      label: 'Lead',
      placeholder: 'All Leads',
      options: users.map(user => ({
        value: user.id,
        label: user.full_name
      }))
    },
    {
      key: 'status',
      label: 'Status',
      placeholder: 'All Statuses',
      options: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'on_track', label: 'On Track' },
        { value: 'off_track', label: 'Off Track' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    {
      key: 'associatedProjects',
      label: 'Associated Projects',
      placeholder: 'All Projects',
      options: projects.map(project => ({
        value: project.id,
        label: project.name
      })),
      multiple: true
    },
    {
      key: 'supportingStaff',
      label: 'Supporting Staff',
      placeholder: 'Supporting Staff',
      options: [
        ...new Set(
          actions.flatMap(action => action.supporting_staff || [])
        )
      ].filter(Boolean).map(staff => ({
        value: staff as string,
        label: users.find(user => user.id === staff)?.full_name || staff as string
      })),
      multiple: true
    },
    {
      key: 'implementingPartners',
      label: 'Implementing Partners',
      placeholder: 'Implementing Partners',
      options: partners.map(partner => ({
        value: partner.id as string,
        label: partner.name as string
      })),
      multiple: true
    }
  ], [interventions, users, projects, actions, partners]);

  const getMetrics = () => {
    const safeActions = Array.isArray(filteredActions) ? filteredActions : [];
    const totalActions = safeActions.length;
    const statusCounts = {
      completed: safeActions.filter((a: any) => a.status === 'completed').length,
      on_track: safeActions.filter((a: any) => a.status === 'on_track').length,
      off_track: safeActions.filter((a: any) => a.status === 'off_track').length,
      not_started: safeActions.filter((a: any) => a.status === 'not_started').length
    };
    return { totalActions, statusCounts };
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
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
          intervention_id: actionData.intervention_id || '',
          name: actionData.name || '',
          code: actionData.code || 0,
          description: actionData.description || null,
          status: actionData.status || 'not_started',
          start_date: actionData.start_date || null,
          actual_startDate: actionData.actual_startDate || null,
          actual_endDate: actionData.actual_endDate || null,
          end_date: actionData.end_date || null,
          lead_id: actionData.lead_id || null,
          supporting_staff: actionData.supporting_staff || [],
          budget: actionData.budget || null,
          associated_projects: actionData.associated_projects || [],
          implementing_partners: actionData.implementing_partners || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: sessionUser?.id
        } as const;

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
    <div className="space-y-5 lg:space-y-6 p-3 md:p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Actions</h1>
            <p className="text-sm lg:text-base text-gray-600">Manage and track all actions across interventions</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'secondary' : 'outline'}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={() => handlenewActionClick()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Action
            </Button>
          </div>
        </div>

        <MetricsGrid 
          metrics={createActionMetrics(
            metrics.totalActions,
            metrics.statusCounts,
            (status) => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status, intervention: '', lead: '' }));
            }
          )}
        />

        {showFilters && (
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            filterConfigs={filterConfigs}
            searchPlaceholder="Search actions..."
            onClearFilters={() => setFilters({
              search: '',
              interventionId: '',
              leadId: '',
              status: '',
              intervention: '',
              lead: '',
              supportingStaff: [],
              implementingPartners: [],
              associatedProjects: []
            })}
          />
        )}

        {/* Removed TooltipProvider wrapper; using global provider */}
          <div className="space-y-6">
            {filteredActions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredActions.map((action: any) => {
                    // const intervention = (interventions || []).find((i: any) => i.id === action.intervention_id) || action.intervention;
                    // const lead = (users || []).find((u: any) => u.id === action.lead_id) || action.lead;
                    
                    return (
                      <ActionCard
                        key={action.id}
                        action={action}
                        users={users}
                        interventions={interventions}
                        onView={(action) => navigate(`/interventions/${action.intervention_id}/actions/${action.id}`)}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                      />
                    );
                  })}
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 pt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-8 h-8 p-0 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      2
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      3
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
          {/* Removed closing TooltipProvider tag */}
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
    </div>
  );
}