import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { actionApi } from '../../lib/actionApi'; // Changed from projectApi
import { interventionApi } from '../../lib/interventionApi'; // Added interventionApi
import type { Action, User, Intervention } from '../../types/project';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { ActionModal } from '../../components/ui/ActionModal';

interface ConfirmationState {
  isOpen: boolean;
  type: 'delete' | 'status';
  actionId: string;
  newStatus?: 'completed' | 'in_progress' | 'at_risk' | 'not_started';
}

export function ActionDashboard() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'delete',
    actionId: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [filters, setFilters] = useState({
    interventionId: '',
    leadId: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
 
  useEffect(() => {
    Promise.all([
      getSessionUser(),
      loadActions(),
      loadInterventions(),
      loadUsers()
    ]);
  }, []);

  const getSessionUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setSessionUser(user);
  };

  const loadActions = async () => {
    try{
      const data = await actionApi.getActions(); // Changed from projectApi
      setActions(data || []);
    } catch (err) {
      console.error('Failed to load actions:', err);
      setError('Failed to load actions');
      toast.error('Failed to load actions');
    } finally {
      setLoading(false);  
    }
  }

  const loadInterventions = async () => {
    try {
      const data = await interventionApi.getInterventions(); // Changed from projectApi
      setInterventions(data || []);
    } catch (err) {
      console.error('Error loading interventions:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

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
      await actionApi.deleteAction(confirmation.actionId); // Changed from projectApi
      
      setConfirmation({
        isOpen: false,
        type: 'delete',
        actionId: '',
      });

      await loadActions();
      
      toast.success('Action deleted successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error deleting action:', err);
      toast.error('Failed to delete action', { id: toastId });
      
      await loadActions();
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
      await actionApi.updateActionStatus(confirmation.actionId, confirmation.newStatus); // Changed from projectApi
      
      setConfirmation({
        isOpen: false,
        type: 'status',
        actionId: '',
      });

      await loadActions();
      
      toast.success('Action status updated successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error updating action status:', err);
      toast.error('Failed to update action status', { id: toastId });
      
      await loadActions();
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

  const filteredActions = actions.filter(action => {
    if (filters.interventionId && action.intervention_id !== filters.interventionId) return false;
    if (filters.leadId && action.lead_id !== filters.leadId) return false;
    if (filters.status && action.status !== filters.status) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = action.name.toLowerCase().includes(searchTerm);
      const matchesDescription = action.description?.toLowerCase().includes(searchTerm) || false;
      if (!matchesName && !matchesDescription) return false;
    }
    return true;
  });

  const getMetrics = () => {
    const totalActions = filteredActions.length;
    const statusCounts = {
      completed: filteredActions.filter(a => a.status === 'completed').length,
      in_progress: filteredActions.filter(a => a.status === 'in_progress').length,
      at_risk: filteredActions.filter(a => a.status === 'at_risk').length,
      not_started: filteredActions.filter(a => a.status === 'not_started').length
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
        await actionApi.updateAction(selectedAction.id, actionData); // Changed from projectApi
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

        await actionApi.createAction(newActionData); // Changed from projectApi
      }
      
      setIsModalOpen(false);
      setSelectedAction(null);
      await loadActions();
      
      toast.success(selectedAction ? 'Action updated successfully' : 'Action created successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error saving action:', err);
      toast.error(err.message || 'Failed to save action', { id: toastId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Actions</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={() => handlenewActionClick()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Action
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div 
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: '' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Actions</p>
                <h3 className="text-xl font-semibold text-gray-900">{metrics.totalActions}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'completed' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <h3 className="text-xl font-semibold text-gray-900">{metrics.statusCounts.completed}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'in_progress' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">On Going/On Track</p>
                <h3 className="text-xl font-semibold text-gray-900">{metrics.statusCounts.in_progress}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'at_risk' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">On Going/Off Track</p>
                <h3 className="text-xl font-semibold text-gray-900">{metrics.statusCounts.at_risk}</h3>
              </div>
            </div>
          </div>
          <div 
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowFilters(true);
              setFilters(prev => ({ ...prev, status: 'not_started' }));
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <X className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Not Started</p>
                <h3 className="text-xl font-semibold text-gray-900">{metrics.statusCounts.not_started}</h3>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Search by name or description"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="intervention" className="block text-sm font-medium text-gray-700 mb-1">
                  Intervention
                </label>
                <Select
                  options={interventions.map(intervention => ({ 
                    value: intervention.id, 
                    label: intervention.name,
                    prefix: intervention.code
                  }))}
                  value={filters.interventionId}
                  onChange={(value) => setFilters(prev => ({ ...prev, interventionId: value }))}
                  placeholder="Select Intervention"
                  allowClear
                  searchable
                  sortable
                />
              </div>
              <div>
                <label htmlFor="lead" className="block text-sm font-medium text-gray-700 mb-1">
                  Lead
                </label>
                <Select
                  options={users.map(user => ({ 
                    value: user.id, 
                    label: user.full_name || user.email || ''
                  }))}
                  value={filters.leadId}
                  onChange={(value) => setFilters(prev => ({ ...prev, leadId: value }))}
                  placeholder="Select Lead"
                  allowClear
                  searchable
                  sortable
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  options={[
                    { value: 'not_started', label: 'Not Started' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'at_risk', label: 'At Risk' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  placeholder="Select Status"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredActions.map((action) => {
              const intervention = interventions.find(i => i.id === action.intervention_id);
              const lead = users.find(u => u.id === action.lead_id);
              
              return (
                <div
                  key={action.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(action.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${action.status === 'completed' ? 'bg-green-100 text-green-800' : action.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : action.status === 'at_risk' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {action.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500">{action.code}</p>
                        <h2 className="text-lg font-medium text-gray-900 truncate">{action.name}</h2>
                      </div>
                      {intervention && (
                        <p className="mt-1 text-sm text-gray-500">Intervention: {intervention.name}</p>
                      )}
                      {lead && (
                        <p className="mt-1 text-sm text-gray-500">Lead: {lead.full_name || lead.email}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Start: {action.start_date ? new Date(action.start_date).toLocaleDateString() : 'Not set'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>End: {action.end_date ? new Date(action.end_date).toLocaleDateString() : 'Not set'}</span>
                        </div>
                      </div>
                      {action.description && (
                        <p className="mt-2 text-sm text-gray-700">{action.description}</p>
                      )}
                    </div>
                    <div className="ml-6 flex items-center gap-4">
                      <button
                        onClick={() => navigate(`/interventions/${action.intervention_id}/actions/${action.id}`)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditClick(action)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(action.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredActions.length === 0 && (
              <div className="p-6 text-center">
                <Network className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No actions found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new action
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => handlenewActionClick()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Action
                  </button>
                </div>
              </div>
            )}
          </div>
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