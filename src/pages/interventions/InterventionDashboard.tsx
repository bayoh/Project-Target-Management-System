import React, { useState, useEffect } from 'react';

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
import { MetricsGrid } from '../../components/ui/MetricsGrid';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { projectApi, userApi } from '../../lib/api';
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
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import { useAuth } from '../../lib/auth';

interface ConfirmationState {
  isOpen: boolean;
  type: 'delete' | 'status';
  interventionId: string;
  newStatus?: 'completed' | 'on_track' | 'off_track' | 'not_started';
}

export function InterventionDashboard() {
  const { trackPageView, trackDelete } = useActivityTracking();
  const { user: sessionUser } = useAuth();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: 'delete',
    interventionId: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [filters, setFilters] = useState({
    clusterId: '',
    pathwayId: '',
    leadId: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch interventions using TanStack Query
  const { data: interventions = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.projects.interventions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          pathway:pathways(*, cluster:clusters(*)),
          lead:profiles(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((intervention: any) => ({
        ...intervention,
        pathway: intervention.pathway || { id: '', name: 'Unknown Pathway', cluster_id: '', cluster: { id: '', name: 'Unknown Cluster' } },
        lead: intervention.lead || { id: '', email: 'Unassigned', full_name: 'Unassigned' }
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch clusters using TanStack Query
  const { data: clusters = [] } = useQuery({
    queryKey: queryKeys.projects.clusters(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch users using TanStack Query
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delete intervention mutation
  const deleteInterventionMutation = useMutation({
    mutationFn: (interventionId: string) => projectApi.deleteIntervention(interventionId),
    onSuccess: (_, interventionId) => {
      const deletedIntervention = interventions.find(intervention => intervention.id === interventionId);
      if (deletedIntervention) {
        trackDelete('intervention', interventionId, {
          name: deletedIntervention.name,
          pathway_id: deletedIntervention.pathway_id,
          status: deletedIntervention.status
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.interventions() });
      toast.success('Intervention deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting intervention:', error);
      toast.error('Failed to delete intervention');
    },
  });
 
  useEffect(() => {
    trackPageView('Intervention Dashboard');
  }, []);

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

  // Load pathways when cluster filter changes
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
    const searchTermMatch = (searchTerm ? (intervention.name || '').toLowerCase().includes(searchTerm.toLowerCase()) : true);
    return clusterMatch && pathwayMatch && leadMatch && statusMatch && searchTermMatch;
  });

  const getMetrics = () => {
    const totalActions = filteredInterventions.length;
    const statusCounts = {
      completed: filteredInterventions.filter((a: any) => a.status === 'completed').length,
      on_track: filteredInterventions.filter((a: any) => a.status === 'on_track').length,
      off_track: filteredInterventions.filter((a: any) => a.status === 'off_track').length,
      not_started: filteredInterventions.filter((a: any) => a.status === 'not_started').length
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
      await deleteInterventionMutation.mutateAsync(confirmation.interventionId);
      toast.dismiss(toastId);
      
      setConfirmation({
        isOpen: false,
        type: 'delete',
        interventionId: '',
      });
      toast.success('Intervention deleted successfully', { id: toastId });
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
      const { error } = await supabase
        .from('interventions')
        .update({ status: confirmation.newStatus })
        .eq('id', confirmation.interventionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.interventions() });
      setConfirmation({
        isOpen: false,
        type: 'delete', // Reset type
        interventionId: '',
      });
      toast.success('Status updated successfully', { id: toastId });
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
    on_track: 'bg-blue-100 text-blue-700',
    off_track: 'bg-yellow-100 text-yellow-700',
    not_started: 'bg-gray-100 text-gray-700',
  };

  const statusIcons: { [key: string]: React.ElementType } = {
    completed: CheckCircle2,
    on_track: Clock,
    off_track: AlertTriangle,
    not_started: List, 
  };

  const renderInterventionCard = (intervention: Intervention) => {
    const StatusIcon = statusIcons[intervention.status] || List;
    return (
      <div key={intervention.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md hover:border-gray-200 transition-all duration-200">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="text-base font-semibold text-gray-900 truncate pr-2" title={intervention.name || 'Untitled'}>
              {intervention.name || 'Untitled'}
            </h3>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-xs text-gray-600 flex items-center">
              <Network size={14} className="mr-1.5 text-purple-500 flex-shrink-0" /> 
              <span className="truncate">
                {intervention.pathway?.cluster?.name || 'N/A'} 
                <ChevronRight size={12} className="inline mx-1 text-gray-400" /> 
                {intervention.pathway?.name || 'N/A'}
              </span>
            </p>
            <p className="text-xs text-gray-600 flex items-center">
              <Users size={14} className="mr-1.5 text-indigo-500 flex-shrink-0" /> 
              <span className="truncate">Lead: {intervention.lead?.full_name || intervention.lead?.email || 'N/A'}</span>
            </p>
          </div>
          
          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusColors[intervention.status] || statusColors.not_started}`}>
            <StatusIcon size={12} className="mr-1" />
            {intervention.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
            <div className="flex items-center">
              <CalendarIcon size={12} className="mr-1 text-green-500 flex-shrink-0" /> 
              <span className="truncate">{intervention.start_date ? new Date(intervention.start_date).toLocaleDateString() : 'No start'}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon size={12} className="mr-1 text-red-500 flex-shrink-0" /> 
              <span className="truncate">{intervention.end_date ? new Date(intervention.end_date).toLocaleDateString() : 'No end'}</span>
            </div>
          </div>
          <Button 
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs font-medium transition-colors duration-200 hover:bg-gray-50"
            onClick={() => navigate(`/interventions/${intervention.id}`)}
          >
            View Details
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div></div>;
  if (error) return <div className="text-red-500 text-center p-4">Error: {(error as Error).message}. Please try refreshing the page.</div>;

  return (
    <>
      <div className="p-3 md:p-4 lg:p-6">
        <header className="mb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Interventions</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and track intervention progress</p>
            </div>
            <Button 
              onClick={() => navigate('/interventions/new')}
              size="sm"
              className="transition-all duration-200 hover:shadow-sm"
            >
              <Plus size={16} className="mr-2" /> New Intervention
            </Button>
          </div>

          {/* Metrics Section */}
          <MetricsGrid 
            metrics={[
              {
                id: 'total',
                label: 'Total Interventions',
                value: totalActions,
                icon: Network,
                gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
                onClick: () => setFilters(prev => ({ ...prev, status: '' }))
              },
              {
                id: 'completed',
                label: 'Completed',
                value: statusCounts.completed,
                icon: CheckCircle2,
                gradient: 'bg-gradient-to-br from-green-500 to-green-600',
                onClick: () => setFilters(prev => ({ ...prev, status: 'completed' }))
              },
              {
                id: 'on_track',
                label: 'On Track',
                value: statusCounts.on_track,
                icon: Clock,
                gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
                onClick: () => setFilters(prev => ({ ...prev, status: 'on_track' }))
              },
              {
                id: 'off_track',
                label: 'Off Track',
                value: statusCounts.off_track,
                icon: AlertTriangle,
                gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
                onClick: () => setFilters(prev => ({ ...prev, status: 'off_track' }))
              },
              {
                id: 'not_started',
                label: 'Not Started',
                value: statusCounts.not_started,
                icon: X,
                gradient: 'bg-gradient-to-br from-gray-500 to-gray-600',
                onClick: () => setFilters(prev => ({ ...prev, status: 'not_started' }))
              }
            ]}
          />

          {/* Filters and Search Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="transition-all duration-200 hover:bg-gray-50"
                >
                  <Filter size={16} className="mr-2" /> 
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Input 
                  type="text"
                  placeholder="Search interventions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Select
                    value={filters.clusterId}
                    onChange={(value) => {
                      console.log('Cluster Select onChange - raw value:', value);
                      const newClusterId = typeof value === 'string' ? value : '';
                      console.log('Cluster Select onChange - setting clusterId to:', newClusterId);
                      setFilters(prev => ({ ...prev, clusterId: newClusterId, pathwayId: ''}));
                    }}
                    options={clusters.map(cluster => ({ value: cluster.id, label: cluster.name }))}
                    className="w-full"
                    placeholder="All Clusters"
                  />
                  <Select
                    value={filters.pathwayId}
                    onChange={(value) => setFilters(prev => ({ ...prev, pathwayId: value as string}))}
                    disabled={!filters.clusterId || pathways.length === 0}
                    className="w-full"
                    options={pathways.map(pathway => ({ value: pathway.id, label: pathway.name }))}
                    placeholder="All Pathways"
                  />
                  <Select
                    value={filters.leadId}
                    onChange={(value) => setFilters(prev => ({ ...prev, leadId: value as string}))}
                    options={users.map(user => ({ value: user.id, label: user.full_name || user.email || '' }))}
                    className="w-full"
                    placeholder="All Leads"
                  />
                  <Select
                    value={filters.status}
                    onChange={(value) => setFilters(prev => ({ ...prev, status: value as string}))}
                    className="w-full"
                    options={Object.keys(statusCounts).map(s => ({ value: s, label: s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }))}
                    placeholder="All Statuses"
                  />
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters({ clusterId: '', pathwayId: '', leadId: '', status: '' });
                    setSearchTerm('');
                  }}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <X size={14} className="mr-1" /> Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </header>

        {filteredInterventions.length === 0 && !loading && (
          <div className="text-center py-8 md:py-12">
            <div className="text-gray-400 mb-3">
              <List size={40} className="mx-auto" />
            </div>
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No interventions found</h3>
            <p className="text-sm text-gray-500 mb-4 md:mb-6">Get started by creating your first intervention.</p>
            <Button 
              onClick={() => navigate('/interventions/new')}
              size="sm"
              className="transition-all duration-200 hover:shadow-sm"
            >
              <Plus size={16} className="mr-2" /> Create Intervention
            </Button>
          </div>
        )}

        {filteredInterventions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredInterventions.map(intervention => renderInterventionCard(intervention))}
          </div>
        )}
      </div>

      <ConfirmationDialog
      isOpen={confirmation.isOpen}
      onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
      onConfirm={handleConfirmation}
      title={confirmation.type === 'delete' ? 'Confirm Deletion' : 'Confirm Status Change'}
      message={
        confirmation.type === 'delete'
          ? 'Are you sure you want to delete this intervention? This action cannot be undone.'
          : `Are you sure you want to change the status to ${confirmation.newStatus?.replace('_', ' ')}?`
      }
      confirmLabel={confirmation.type === 'delete' ? 'Delete' : 'Confirm'}
      type={confirmation.type === 'delete' ? 'danger' : 'warning'}
    />
    </>
  );
}