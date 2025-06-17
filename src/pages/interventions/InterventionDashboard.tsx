import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Plus,
  ChevronRight,
  Network,
  List,
  Calendar as CalendarIcon, // Renamed to avoid conflict with Calendar component
  Clock,
  Users,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Eye,
  Filter,
  X,
  LayoutGrid, // Added for grid view icon
  ListChecks // Added for list view icon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { projectApi } from '../../lib/api';
import type { Intervention, User, Cluster, Pathway } from '../../types/project';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table'; // Import custom table components
import { Button } from '../../components/ui/button'; // Assuming Button component is in ui
import { Select } from '../../components/ui/Select'; // Assuming Select component is in ui
import { Input } from '../../components/ui/Input'; // Assuming Input component is in ui

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null); // Changed to any to match usage
  const [filters, setFilters] = useState({
    clusterId: '',
    pathwayId: '',
    leadId: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    setSessionUser(user);
  };

  useEffect(() => {
    if (filters.clusterId) {
      loadPathways(filters.clusterId);
    } else {
      setPathways([]);
      setFilters(prev => {
        if (prev.pathwayId === '') return prev; // Avoid re-render if pathwayId is already empty
        return { ...prev, pathwayId: '' };
      });
    }
  }, [filters.clusterId]);

  const loadInterventions = async () => {
    setLoading(true);
    try{
      const data = await projectApi.getInterventions();
      setInterventions(data || []);
      // if (data && data.length > 0 && data[0].pathway) {
      //   console.log('Sample intervention pathway data on load:', JSON.stringify(data[0].pathway, null, 2));
      //   console.log('Sample intervention pathway.cluster_id on load:', data[0].pathway.cluster_id);
      // }
    } catch (err) {
      console.error('Failed to load interventions:', err);
      setError('Failed to load interventions');
      toast.error('Failed to load interventions');
    } finally {
      setLoading(false);  
    }
  }

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
        .from('profiles') // Assuming 'profiles' is the correct table for users
        .select('*')
        .order('full_name'); // Order by full_name or email

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const filteredInterventions = interventions.filter(intervention => {
    const clusterMatch = (filters.clusterId ? intervention.pathway?.cluster_id === filters.clusterId : true);
    if (filters.clusterId && intervention.pathway) {
      // Log details for the first few interventions when a cluster filter is active
      if (interventions.indexOf(intervention) < 3) { 
        console.log(`Filtering Intervention: "${intervention.name}", PathwayClusterID: "${intervention.pathway.cluster_id}", FilterClusterID: "${filters.clusterId}", Match: ${clusterMatch}`);
      }
    }
    const pathwayMatch = (filters.pathwayId ? intervention.pathway_id === filters.pathwayId : true);
    const leadMatch = (filters.leadId ? intervention.lead_id === filters.leadId : true);
    const statusMatch = (filters.status ? intervention.status === filters.status : true);
    const searchTermMatch = (searchTerm ? intervention.name.toLowerCase().includes(searchTerm.toLowerCase()) : true);
    return clusterMatch && pathwayMatch && leadMatch && statusMatch && searchTermMatch;
  });

  const getMetrics = () => {
    const totalActions = filteredInterventions.length;
    const statusCounts = {
      completed: filteredInterventions.filter(a => a.status === 'completed').length,
      in_progress: filteredInterventions.filter(a => a.status === 'in_progress').length,
      at_risk: filteredInterventions.filter(a => a.status === 'at_risk').length,
      not_started: filteredInterventions.filter(a => a.status === 'not_started').length
    };
    return { totalActions, statusCounts };
  };

  const handleDeleteClick = (id: string) => {
    setConfirmation({
      isOpen: true,
      type: 'delete',
      interventionId: id,
    });
  };

  const handleDelete = async () => {
    if (confirmation.type !== 'delete') return;
    const toastId = toast.loading('Deleting intervention...');
    try {
      await projectApi.deleteIntervention(confirmation.interventionId);
      
      setConfirmation({
        isOpen: false,
        type: 'delete',
        interventionId: '',
      });
      toast.success('Intervention deleted successfully', { id: toastId });
      loadInterventions(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete intervention:', err);
      toast.error('Failed to delete intervention', { id: toastId });
    }
  };

  const handleStatusChangeClick = (id: string, newStatus: 'completed' | 'in_progress' | 'at_risk' | 'not_started') => {
    setConfirmation({
      isOpen: true,
      type: 'status',
      interventionId: id,
      newStatus: newStatus,
    });
  };

  const handleStatusUpdate = async () => {
    if (confirmation.type !== 'status' || !confirmation.newStatus) return;
    const toastId = toast.loading('Updating status...');
    try {
      await projectApi.updateInterventionStatus(confirmation.interventionId, confirmation.newStatus);
      setConfirmation({
        isOpen: false,
        type: 'delete', // Reset type
        interventionId: '',
      });
      toast.success('Status updated successfully', { id: toastId });
      loadInterventions(); // Refresh the list
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  };

  const handleConfirmation = () => {
    if (confirmation.type === 'delete') {
      handleDelete();
    } else if (confirmation.type === 'status') {
      handleStatusUpdate();
    }
  };

  const toggleMenu = (interventionId: string) => {
    setActiveMenu(activeMenu === interventionId ? null : interventionId);
  };

  const { totalActions, statusCounts } = getMetrics();

  const statusColors: { [key: string]: string } = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    at_risk: 'bg-yellow-100 text-yellow-700',
    not_started: 'bg-gray-100 text-gray-700',
  };

  const statusIcons: { [key: string]: React.ElementType } = {
    completed: CheckCircle2,
    in_progress: Clock,
    at_risk: AlertTriangle,
    not_started: List, 
  };

  const renderInterventionCard = (intervention: Intervention) => {
    const StatusIcon = statusIcons[intervention.status] || List;
    return (
      <div key={intervention.id} className="bg-white shadow-lg rounded-lg p-4 md:p-6 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 truncate" title={intervention.name}>{intervention.name}</h3>
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => toggleMenu(intervention.id)}>
                <MoreVertical size={20} />
              </Button>
              {activeMenu === intervention.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                  <button
                    onClick={() => navigate(`/interventions/${intervention.id}`)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Eye size={16} className="inline mr-2" /> View Details
                  </button>
                  {sessionUser?.id === intervention.created_by && (
                    <>
                      <button
                        onClick={() => navigate(`/interventions/edit/${intervention.id}`)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Edit2 size={16} className="inline mr-2" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(intervention.id)}
                        className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                      >
                        <Trash2 size={16} className="inline mr-2" /> Delete
                      </button>
                    </>
                  )}
                  <div className="border-t my-1"></div>
                  <p className="px-4 py-2 text-xs text-gray-500">Change Status:</p>
                  {['not_started', 'in_progress', 'at_risk', 'completed'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChangeClick(intervention.id, status as any)}
                      className={`block px-4 py-2 text-sm w-full text-left ${intervention.status === status ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'}`}
                    >
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1 flex items-center">
            <Network size={16} className="mr-2 text-purple-600" /> 
            {intervention.pathway?.cluster?.name || 'N/A'} <ChevronRight size={16} className="mx-1 text-gray-400" /> {intervention.pathway?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mb-1 flex items-center">
            <Users size={16} className="mr-2 text-indigo-600" /> Lead: {intervention.lead?.full_name || intervention.lead?.email || 'N/A'}
          </p>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[intervention.status] || statusColors.not_started} mb-3`}>
            <StatusIcon size={14} className="mr-1.5" />
            {intervention.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>
        <div className="mt-auto">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span className="flex items-center"><CalendarIcon size={14} className="mr-1 text-green-600" /> {new Date(intervention.start_date).toLocaleDateString()}</span>
            <span className="flex items-center"><CalendarIcon size={14} className="mr-1 text-red-600" /> {new Date(intervention.end_date).toLocaleDateString()}</span>
          </div>
          <Button 
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => navigate(`/interventions/${intervention.id}`)}
          >
            View Details
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <DashboardLayout><div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div></div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-red-500 text-center p-4">Error: {error}. Please try refreshing the page.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Intervention Dashboard</h1>
            <Button 
              onClick={() => navigate('/interventions/new')}
              className="mt-3 md:mt-0"
            >
              <Plus size={20} className="mr-2" /> New Intervention
            </Button>
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 shadow rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Interventions</h3>
              <p className="text-2xl font-semibold text-gray-800">{totalActions}</p>
            </div>
            {Object.entries(statusCounts).map(([status, count]) => {
              const StatusIcon = statusIcons[status] || List;
              return (
                <div key={status} className="bg-white p-4 shadow rounded-lg">
                  <h3 className={`text-sm font-medium flex items-center ${statusColors[status]?.replace('bg-', 'text-').replace('-100', '-700')}`}>
                    <StatusIcon size={16} className="mr-2" /> 
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <p className="text-2xl font-semibold text-gray-800">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Filters and View Toggle Section */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={18} className="mr-2" /> {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Input 
                type="text"
                placeholder="Search interventions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="icon" 
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <ListChecks size={20} />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="icon" 
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid size={20} />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  value={filters.clusterId}
                  onChange={(value) => {
                    console.log('Cluster Select onChange - raw value:', value);
                    const newClusterId = typeof value === 'string' ? value : ''; // Ensure it's a string or empty string
                    console.log('Cluster Select onChange - setting clusterId to:', newClusterId);
                    setFilters(prev => ({ ...prev, clusterId: newClusterId, pathwayId: ''}));
                  }}
                  options={clusters.map(cluster => ({ value: cluster.id, label: cluster.name }))}
                  className="w-full"
                  placeholder="All Clusters"
                >
                  {/* <option value="">All Clusters</option>
                  {clusters.map(cluster => (
                    <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                  ))} */}
                </Select>
                <Select
                  value={filters.pathwayId}
                  onChange={(value) => setFilters(prev => ({ ...prev, pathwayId: value as string}))} // Corrected onChange
                  disabled={!filters.clusterId || pathways.length === 0}
                  className="w-full"
                  options={pathways.map(pathway => ({ value: pathway.id, label: pathway.name }))}
                  placeholder="All Pathways" // Added placeholder
                >
                  {/* <option value="">All Pathways</option> */}
                  {/* {pathways.map(pathway => (
                    <option key={pathway.id} value={pathway.id}>{pathway.name}</option>
                  ))} */}
                </Select>
                <Select
                  value={filters.leadId}
                  onChange={(value) => setFilters(prev => ({ ...prev, leadId: value as string}))} // Corrected onChange
                  options={users.map(user => ({ value: user.id, label: user.full_name || user.email || '' }))} // Added fallback for label
                  className="w-full"
                  placeholder="All Leads" // Added placeholder
                >
                  {/* <option value="">All Leads</option> */}
                  {/* {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                  ))} */}
                </Select>
                <Select
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value as string}))} // Corrected onChange
                  className="w-full"
                  options={Object.keys(statusCounts).map(s => ({ value: s, label: s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }))}
                  placeholder="All Statuses" // Added placeholder
                >
                  {/* <option value="">All Statuses</option>
                  {['not_started', 'in_progress', 'at_risk', 'completed'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))} */}
                </Select>
              </div>
              <Button 
                variant="ghost"
                onClick={() => {
                  setFilters({ clusterId: '', pathwayId: '', leadId: '', status: '' });
                  setSearchTerm('');
                }}
                className="mt-4 text-sm text-gray-600 hover:text-gray-800"
              >
                <X size={16} className="mr-1" /> Clear Filters
              </Button>
            </div>
          )}
        </header>

        {filteredInterventions.length === 0 && !loading && (
          <div className="text-center py-10">
            <List size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Interventions Found</h3>
            <p className="text-gray-500">Try adjusting your filters or create a new intervention.</p>
          </div>
        )}

        {viewMode === 'list' && filteredInterventions.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%] min-w-[200px]">Name</TableHead>
                  <TableHead className="w-[20%] min-w-[180px]">Cluster & Pathway</TableHead>
                  <TableHead className="w-[15%] min-w-[150px]">Lead</TableHead>
                  <TableHead className="w-[15%] min-w-[120px]">Dates (Start/End)</TableHead>
                  <TableHead className="w-[10%] min-w-[100px]">Status</TableHead>
                  <TableHead className="w-[15%] min-w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterventions.map((intervention) => {
                  const StatusIcon = statusIcons[intervention.status] || List;
                  return (
                    <TableRow key={intervention.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <TableCell className="font-medium text-gray-800 py-3 px-4">
                        <span className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate" title={intervention.name}>{intervention.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-3 px-4">
                        {intervention.pathway?.cluster?.name || 'N/A'} <ChevronRight size={14} className="inline mx-1 text-gray-400" /> {intervention.pathway?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-3 px-4">
                        {intervention.lead?.full_name || intervention.lead?.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-3 px-4">
                        {new Date(intervention.start_date).toLocaleDateString()} - {new Date(intervention.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[intervention.status] || statusColors.not_started}`}>
                          <StatusIcon size={14} className="mr-1.5" />
                          {intervention.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3 px-4">
                        <div className="relative flex justify-end items-center">
                          <Button variant="ghost" size="icon-sm" onClick={() => toggleMenu(intervention.id)}>
                            <MoreVertical size={18} />
                          </Button>
                          {activeMenu === intervention.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg z-20 py-1 border border-gray-200">
                              <button
                                onClick={() => navigate(`/interventions/${intervention.id}`)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Eye size={16} className="mr-2" /> View Details
                              </button>
                              {sessionUser?.id === intervention.created_by && (
                                <>
                                  <button
                                    onClick={() => navigate(`/interventions/edit/${intervention.id}`)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Edit2 size={16} className="mr-2" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(intervention.id)}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Trash2 size={16} className="mr-2" /> Delete
                                  </button>
                                </> 
                              )}
                              <div className="border-t my-1 mx-2"></div>
                              <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Change Status:</p>
                              {['not_started', 'in_progress', 'at_risk', 'completed'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => { handleStatusChangeClick(intervention.id, status as any); setActiveMenu(null); }}
                                  className={`flex items-center px-4 py-2 text-sm w-full text-left rounded-md mx-1 hover:bg-gray-100 ${intervention.status === status ? 'bg-gray-100 font-semibold' : ''}`}
                                >
                                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {viewMode === 'grid' && filteredInterventions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredInterventions.map(intervention => renderInterventionCard(intervention))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={handleConfirmation}
        title={confirmation.type === 'delete' ? 'Confirm Deletion' : 'Confirm Status Change'}
        description={
          confirmation.type === 'delete'
            ? 'Are you sure you want to delete this intervention? This action cannot be undone.'
            : `Are you sure you want to change the status to ${confirmation.newStatus?.replace('_', ' ')}?`
        }
        confirmText={confirmation.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmButtonVariant={confirmation.type === 'delete' ? 'destructive' : 'default'}
      />
    </DashboardLayout>
  );
}