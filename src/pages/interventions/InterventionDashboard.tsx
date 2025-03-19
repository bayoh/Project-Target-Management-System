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
  Eye,
  Filter,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { projectApi } from '../../lib/api';
import type { Intervention, User, Cluster, Pathway } from '../../types/project';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

interface ConfirmationState {
  isOpen: boolean;
  type: 'delete' | 'status';
  interventionId: string;
  newStatus?: 'completed' | 'in_progress' | 'at_risk' | 'not_started';
}

export function InterventionDashboard() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'delete',
    interventionId: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [filters, setFilters] = useState({
    clusterId: '',
    pathwayId: '',
    leadId: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
 
  useEffect(() => {
    Promise.all([
      getSessionUser(),
      loadInterventions(),
      loadClusters(),
      loadUsers()
    ]);
  }, []);

  const getSessionUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log(user?.user_metadata)
    setSessionUser(user);
  };

  useEffect(() => {
    if (filters.clusterId) {
      loadPathways(filters.clusterId);
    } else {
      setPathways([]);
      setFilters(prev => ({ ...prev, pathwayId: '' }));
    }
  }, [filters.clusterId]);

  const loadInterventions = async () => {
    try{
      const data = await projectApi.getInterventions();
      setInterventions(data || []);
    } catch (err) {
      console.error('Failed to load interventions:', err);
      setError('Failed to load interventions');
      toast.error('Failed to load interventions');
    } finally {
      setLoading(false);  
    }
  }

  // const loadInterventions = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('interventions')
  //       .select(`
  //         *,
  //         pathway:pathways(
  //           id,
  //           name,
  //           cluster:clusters(
  //             id,
  //             name
  //           )
  //         ),
  //         lead:profiles!interventions_lead_id_fkey1(email, id, full_name)
  //       `)
  //       .order('created_at', { ascending: false });
  //       console.log(error)
  //       // lead:profiles!interventions_lead_id_fkey1(email, id, full_name)
  //       // lead:users_view!interventions_lead_id_fkey(email, id, full_name)
  //     if (error) throw error;
  //     setInterventions(data || []);
  //   } catch (err) {
  //     console.error('Failed to load interventions:', err);
  //     setError('Failed to load interventions');
  //     toast.error('Failed to load interventions');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const loadClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('name');

      if (error) throw error;
      setClusters(data || []);
    } catch (err) {
      console.error('Error loading clusters:', err);
    }
  };

  const loadPathways = async (clusterId: string) => {
    try {
      const { data, error } = await supabase
        .from('pathways')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('name');

      if (error) throw error;
      setPathways(data || []);
    } catch (err) {
      console.error('Error loading pathways:', err);
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
      interventionId: id,
    });
  };

  const handleDelete = async () => {
    const toastId = toast.loading('Deleting intervention...');
    try {
      await projectApi.deleteIntervention(confirmation.interventionId);
      
      setConfirmation({
        isOpen: false,
        type: 'delete',
        interventionId: '',
      });

      await loadInterventions();
      
      toast.success('Intervention deleted successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error deleting intervention:', err);
      toast.error('Failed to delete intervention', { id: toastId });
      
      await loadInterventions();
    }
  };

  const handleStatusClick = (id: string, status: 'completed' | 'in_progress' | 'at_risk' | 'not_started') => {
    setConfirmation({
      isOpen: true,
      type: 'status',
      interventionId: id,
      newStatus: status,
    });
  };

  const handleStatusChange = async () => {
    if (!confirmation.newStatus) return;

    const toastId = toast.loading('Updating status...');
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ status: confirmation.newStatus })
        .eq('id', confirmation.interventionId);

      if (error) throw error;
      
      setInterventions(interventions.map(intervention => 
        intervention.id === confirmation.interventionId
          ? { ...intervention, status: confirmation.newStatus! }
          : intervention
      ));
      
      setConfirmation({
        isOpen: false,
        type: 'status',
        interventionId: '',
      });

      toast.success('Status updated successfully', { id: toastId });
    } catch (err: any) {
      console.error('Error updating intervention status:', err);
      toast.error('Failed to update status', { id: toastId });
      
      await loadInterventions();
    }
  };

  const filteredInterventions = interventions.filter(intervention => {
    if (filters.clusterId && intervention.pathway?.cluster?.id !== filters.clusterId) return false;
    if (filters.pathwayId && intervention.pathway_id !== filters.pathwayId) return false;
    if (filters.leadId && intervention.lead_id !== filters.leadId) return false;
    if (filters.status && intervention.status !== filters.status) return false;
    return true;
  });

  const resetFilters = () => {
    setFilters({
      clusterId: '',
      pathwayId: '',
      leadId: '',
      status: ''
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      at_risk: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || colors.not_started;
  };

  const renderListView = (interventions: Intervention[]) => (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="min-w-full">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Timeline
              </th>
              <th className="relative px-6 py-3 w-[100px]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interventions.map((intervention) => (
              <tr key={intervention.id} className="hover:bg-gray-50">
                <td>
                  <div className="text-sm font-medium text-gray-900 text-center max-w-xs">
                    {intervention.code || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {intervention.name}
                  </div>
                  {intervention.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {intervention.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(intervention.status)}`}>
                    {intervention.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="truncate max-w-[150px]">
                    {intervention.lead?.full_name || 'Unassigned'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {intervention.start_date && new Date(intervention.start_date).toLocaleDateString()}
                      {intervention.end_date && ` - ${new Date(intervention.end_date).toLocaleDateString()}`}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === intervention.id ? null : intervention.id);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {activeMenu === intervention.id && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                          <button
                            onClick={() => navigate(`/interventions/${intervention.id}`)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          { (intervention.lead_id === sessionUser?.id || intervention.created_by === sessionUser?.id || sessionUser?.user_metadata.role === 'super_admin') && (
                            <>
                          <button
                            onClick={() => navigate(`/interventions/${intervention.id}/edit`)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(intervention.id)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                          </>
                          )}
                          {intervention.status !== 'completed' && intervention.lead_id === sessionUser?.id && (
                            <button
                              onClick={() => handleStatusClick(intervention.id, 'completed')}
                              className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Complete
                            </button>
                          )}
                        
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = (interventions: Intervention[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {interventions.map((intervention) => (
        <div
          key={intervention.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(intervention.status)}`}>
                {intervention.status.replace('_', ' ')}
              </span>
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === intervention.id ? null : intervention.id)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {activeMenu === intervention.id && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu">
                      <button
                        onClick={() => navigate(`/interventions/${intervention.id}`)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button
                        onClick={() => navigate(`/interventions/${intervention.id}/edit`)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      { intervention.lead_id === sessionUser?.id && (
                      <button
                        onClick={() => handleDeleteClick(intervention.id)}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>) }
                      {intervention.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusClick(intervention.id, 'completed')}
                          className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{intervention.name}</h3>
            {intervention.description && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{intervention.description}</p>
            )}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-2" />
                {intervention.lead?.full_name || 'Unassigned'}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                {intervention.start_date && new Date(intervention.start_date).toLocaleDateString()}
                {intervention.end_date && ` - ${new Date(intervention.end_date).toLocaleDateString()}`}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col space-y-6 p-6">
        <div className="flex items-center justify-between flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                showFilters || getActiveFiltersCount() > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>

            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Network className="h-4 w-4 mr-2" />
                Grid View
              </button>
            </div>
            <button
              onClick={() => navigate('/interventions/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Intervention
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <h2 className="text-sm font-medium text-gray-700">Filters</h2>
              </div>
              <div className="flex items-center space-x-4">
                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Reset filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cluster
                </label>
                <select
                  value={filters.clusterId}
                  onChange={(e) => setFilters(prev => ({ ...prev, clusterId: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Clusters</option>
                  {clusters.map((cluster) => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pathway
                </label>
                <select
                  value={filters.pathwayId}
                  onChange={(e) => setFilters(prev => ({ ...prev, pathwayId: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!filters.clusterId}
                >
                  <option value="">All Pathways</option>
                  {pathways.map((pathway) => (
                    <option key={pathway.id} value={pathway.id}>
                      {pathway.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead
                </label>
                <select
                  value={filters.leadId}
                  onChange={(e) => setFilters(prev => ({ ...prev, leadId: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Leads</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="at_risk">At Risk</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {viewMode === 'list' ? renderListView(filteredInterventions) : renderGridView(filteredInterventions)}
        </div>

        <ConfirmationDialog
          isOpen={confirmation.isOpen && confirmation.type === 'delete'}
          onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
          onConfirm={handleDelete}
          title="Delete Intervention"
          message="Are you sure you want to delete this intervention? This action cannot be undone and will delete all related data including actions, tasks, and documents."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          type="danger"
        />

        <ConfirmationDialog
          isOpen={confirmation.isOpen && confirmation.type === 'status'}
          onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
          onConfirm={handleStatusChange}
          title={`Change Status to ${confirmation.newStatus?.replace('_', ' ')}`}
          message={`Are you sure you want to mark this intervention as ${confirmation.newStatus?.replace('_', ' ')}?`}
          confirmLabel="Change Status"
          cancelLabel="Cancel"
          type={confirmation.newStatus === 'completed' ? 'success' : confirmation.newStatus === 'at_risk' ? 'danger' : 'warning'}
        />
      </div>
    </DashboardLayout>
  );
}