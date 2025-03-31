import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Filter, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Search,
  FileEdit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
// import { PageHeader } from '../../components/layout/PageHeader';

interface TargetItem {
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
  action?: {
    id: string;
    name: string;
    intervention?: {
      id: string;
      name: string;
      pathway?: {
        id: string;
        name: string;
        cluster?: {
          id: string;
          name: string;
        }
      }
    }
  };
}

interface FilterOptions {
  clusterId: string;
  pathwayId: string;
  interventionId: string;
  actionId: string;
  category: string;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export default function TargetTracking() {
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [filteredTargets, setFilteredTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<{id: string, name: string}[]>([]);
  const [pathways, setPathways] = useState<{id: string, name: string, cluster_id: string}[]>([]);
  const [interventions, setInterventions] = useState<{id: string, name: string, pathway_id: string}[]>([]);
  const [actions, setActions] = useState<{id: string, name: string, intervention_id: string}[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickUpdateModal, setShowQuickUpdateModal] = useState(false);
  const [updatingTarget, setUpdatingTarget] = useState<TargetItem | null>(null);
  const [updateValue, setUpdateValue] = useState('');
  const [updateWomenValue, setUpdateWomenValue] = useState('');
  const [updateYouthValue, setUpdateYouthValue] = useState('');
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    clusterId: '',
    pathwayId: '',
    interventionId: '',
    actionId: '',
    category: '',
    searchTerm: '',
    sortBy: 'last_updated',
    sortDirection: 'desc'
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadTargets();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [targets, filters]);

  const loadTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('action_targets')
        .select(`
          *,
          action:actions(
            id,
            name,
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
          )
        `);

      if (error) throw error;
      
      setTargets(data || []);
    } catch (err: any) {
      console.error('Error loading targets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleQuickUpdate = (id: string) => {
    const target = targets.find(t => t.id === id);
    if (!target) return;
    
    setUpdatingTarget(target);
    setUpdateValue(target.current_value.toString());
    if (isJobTarget(target)) {
      setUpdateWomenValue(target.women_current?.toString() || '0');
      setUpdateYouthValue(target.youth_current?.toString() || '0');
    }
    setShowQuickUpdateModal(true);
  };

  const loadFilterOptions = async () => {
    try {
      const [clustersData, pathwaysData, interventionsData, actionsData] = await Promise.all([
        supabase.from('clusters').select('id, name').order('name'),
        supabase.from('pathways').select('id, name, cluster_id').order('name'),
        supabase.from('interventions').select('id, name, pathway_id').order('name'),
        supabase.from('actions').select('id, name, intervention_id').order('name')
      ]);

      if (clustersData.error) throw clustersData.error;
      if (pathwaysData.error) throw pathwaysData.error;
      if (interventionsData.error) throw interventionsData.error;
      if (actionsData.error) throw actionsData.error;

      setClusters(clustersData.data || []);
      setPathways(pathwaysData.data || []);
      setInterventions(interventionsData.data || []);
      setActions(actionsData.data || []);
    } catch (err: any) {
      console.error('Error loading filter options:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...targets];

    // Apply cluster filter
    if (filters.clusterId) {
      filtered = filtered.filter(target => 
        target.action?.intervention?.pathway?.cluster?.id === filters.clusterId
      );
    }

    // Apply pathway filter
    if (filters.pathwayId) {
      filtered = filtered.filter(target => 
        target.action?.intervention?.pathway?.id === filters.pathwayId
      );
    }

    // Apply intervention filter
    if (filters.interventionId) {
      filtered = filtered.filter(target => 
        target.action?.intervention?.id === filters.interventionId
      );
    }

    // Apply action filter
    if (filters.actionId) {
      filtered = filtered.filter(target => 
        target.action?.id === filters.actionId
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(target => 
        target.category === filters.category
      );
    }

    // Apply search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(target => 
        target.description.toLowerCase().includes(searchLower) ||
        target.metric.toLowerCase().includes(searchLower) ||
        target.action?.name.toLowerCase().includes(searchLower) ||
        target.action?.intervention?.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (filters.sortBy) {
        case 'description':
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
          break;
        case 'progress':
          valueA = (a.current_value / a.target_value) * 100;
          valueB = (b.current_value / b.target_value) * 100;
          break;
        case 'target_value':
          valueA = a.target_value;
          valueB = b.target_value;
          break;
        case 'current_value':
          valueA = a.current_value;
          valueB = b.current_value;
          break;
        case 'last_updated':
        default:
          valueA = new Date(a.last_updated).getTime();
          valueB = new Date(b.last_updated).getTime();
      }

      if (filters.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredTargets(filtered);
  };

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortDirection: prev.sortBy === field && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100); // Cap at 100%
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressIcon = (progress: number) => {
    if (progress >= 100) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (progress >= 50) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const handleCreateTarget = () => {
    navigate('/targets/new');
  };

  const handleEditTarget = (id: string) => {
    navigate(`/targets/edit/${id}`);
  };

  const handleDeleteTarget = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    
    try {
      const { error } = await supabase
        .from('action_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh the targets list
      loadTargets();
    } catch (err: any) {
      console.error('Error deleting target:', err);
      alert(`Error deleting target: ${err.message}`);
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/targets/${id}`);
  };

  const renderSortIcon = (field: string) => {
    if (filters.sortBy !== field) return null;
    
    return filters.sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 inline ml-1" />
      : <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const isJobTarget = (target: TargetItem) => {
    return target.category === 'jobs';
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingTarget) return;
    
    setUpdatingLoading(true);
    
    try {
      const updateData: any = {
        current_value: parseFloat(updateValue),
        last_updated: new Date().toISOString()
      };
      
      if (isJobTarget(updatingTarget)) {
        updateData.women_current = updateWomenValue ? parseFloat(updateWomenValue) : 0;
        updateData.youth_current = updateYouthValue ? parseFloat(updateYouthValue) : 0;
      }
      
      const { error } = await supabase
        .from('action_targets')
        .update(updateData)
        .eq('id', updatingTarget.id);

      if (error) throw error;
      
      // Refresh the targets list
      await loadTargets();
      setShowQuickUpdateModal(false);
    } catch (err: any) {
      console.error('Error updating target:', err);
      setError(err.message);
    } finally {
      setUpdatingLoading(false);
    }
  };

//   {/* Quick Update Modal */}
  {showQuickUpdateModal && updatingTarget && (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Update Target Progress</h3>
        <form onSubmit={handleUpdateSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="current-value" className="block text-sm font-medium text-gray-700 mb-1">
                Current Value ({updatingTarget.metric})
              </label>
              <input
                type="number"
                id="current-value"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                min="0"
                step="0.01"
              />
              <div className="mt-1 text-sm text-gray-500">
                Target: {updatingTarget.target_value.toLocaleString()} | Baseline: {updatingTarget.baseline_value.toLocaleString()}
              </div>
            </div>

            {isJobTarget(updatingTarget) && (
              <>
                <div>
                  <label htmlFor="women-value" className="block text-sm font-medium text-gray-700 mb-1">
                    Women Current Value
                  </label>
                  <input
                    type="number"
                    id="women-value"
                    value={updateWomenValue}
                    onChange={(e) => setUpdateWomenValue(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="0"
                    step="1"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    Target: {updatingTarget.women_target?.toLocaleString() || 0}
                  </div>
                </div>

                <div>
                  <label htmlFor="youth-value" className="block text-sm font-medium text-gray-700 mb-1">
                    Youth Current Value
                  </label>
                  <input
                    type="number"
                    id="youth-value"
                    value={updateYouthValue}
                    onChange={(e) => setUpdateYouthValue(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="0"
                    step="1"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    Target: {updatingTarget.youth_target?.toLocaleString() || 0}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowQuickUpdateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  //   const handleQuickUpdate = (id: string) => {
  //   const target = targets.find(t => t.id === id);
  //   if (!target) return;
    
  //   setUpdatingTarget(target);
  //   setUpdateValue(target.current_value.toString());
  //   if (isJobTarget(target)) {
  //     setUpdateWomenValue(target.women_current?.toString() || '0');
  //     setUpdateYouthValue(target.youth_current?.toString() || '0');
  //   }
  //   setShowQuickUpdateModal(true);
  // };



  return (
    <DashboardLayout>
    <div className="container mx-auto px-4 py-8">
      {/* <PageHeader
        title="Target Tracking"
        description="Track and manage targets across all actions and interventions"
        icon={<Target className="h-8 w-8" />}
      /> */}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </button>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search targets..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={handleCreateTarget}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Target
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div>
              <label htmlFor="cluster-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Cluster
              </label>
              <select
                id="cluster-filter"
                value={filters.clusterId}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  clusterId: e.target.value,
                  pathwayId: '',
                  interventionId: '',
                  actionId: ''
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Clusters</option>
                {clusters.map(cluster => (
                  <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="pathway-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Pathway
              </label>
              <select
                id="pathway-filter"
                value={filters.pathwayId}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  pathwayId: e.target.value,
                  interventionId: '',
                  actionId: ''
                }))}
                disabled={!filters.clusterId}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Pathways</option>
                {pathways
                  .filter(pathway => !filters.clusterId || pathway.cluster_id === filters.clusterId)
                  .map(pathway => (
                    <option key={pathway.id} value={pathway.id}>{pathway.name}</option>
                  ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="intervention-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Intervention
              </label>
              <select
                id="intervention-filter"
                value={filters.interventionId}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  interventionId: e.target.value,
                  actionId: ''
                }))}
                disabled={!filters.pathwayId}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Interventions</option>
                {interventions
                  .filter(intervention => !filters.pathwayId || intervention.pathway_id === filters.pathwayId)
                  .map(intervention => (
                    <option key={intervention.id} value={intervention.id}>{intervention.name}</option>
                  ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                id="action-filter"
                value={filters.actionId}
                onChange={(e) => setFilters(prev => ({ ...prev, actionId: e.target.value }))}
                disabled={!filters.interventionId}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                {actions
                  .filter(action => !filters.interventionId || action.intervention_id === filters.interventionId)
                  .map(action => (
                    <option key={action.id} value={action.id}>{action.name}</option>
                  ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category-filter"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Categories</option>
                <option value="jobs">Jobs</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Target List */}
        <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              <AlertTriangle className="h-6 w-6 mr-2" />
              {error}
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Target className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium">No targets found</p>
              <p className="text-sm">Try adjusting your filters or create a new target</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      Description {renderSortIcon('description')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('target_value')}
                    >
                      Target {renderSortIcon('target_value')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('current_value')}
                    >
                      Current {renderSortIcon('current_value')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('progress')}
                    >
                      Progress {renderSortIcon('progress')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('last_updated')}
                    >
                      Last Updated {renderSortIcon('last_updated')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTargets.map(target => {
                    const progress = calculateProgress(target.current_value, target.target_value);
                    const progressColor = getProgressColor(progress);
                    const progressIcon = getProgressIcon(progress);
                    
                    return (
                      <tr key={target.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(target.id)}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-pretty sm:text-wrap md:text-balance">
                          {target.description}
                          {target.category && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {target.category === 'jobs' ? 'Jobs' : target.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-pretty sm:text-wrap md:text-balance text-ellipsis">
                          {target.action?.name || 'N/A'}
                          {target.action?.intervention?.name && (
                            <div className="text-xs text-gray-400 mt-1">
                              {target.action.intervention.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {target.metric}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {target.target_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-2">{target.current_value.toLocaleString()}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickUpdate(target.id);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                              title="Quick Update"
                            >
                              <FileEdit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <div className="relative flex items-center w-full">
                              {/* <div 
                                className={`h-2.5 rounded-full ${progressColor}`} 
                                style={{ width: `${progress}%` }}
                              ></div> */}
                              <svg width="100" height="100" viewBox='0 0 100 100' className="transform -rotate-[-90deg]">
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="46"
                                  stroke="#e5e7eb"
                                  stroke-width="8"
                                  fill="none"
                                />

                                <circle
                                  cx="50"
                                  cy="50"
                                  r="46"
                                  stroke="currentColor"
                                  stroke-width="8"
                                  fill="none"
                                  stroke-dasharray={`${ (2 * 22 / 7 * 120)}`}
                                  stroke-dashoffset={`${ (2 * 22 / 7 * 120) - Math.round(progress)/ 100 * (2 * 22 / 7 * 120)}`}
                                  stroke-linecap="round"
                                  className="text-red-500 transition-all duration-500"
                                />
                              </svg>
                            </div>
                            <span className="absolute text-sm text-gray-500">{Math.round(progress)}%</span>
                            <div className="ml-2">{progressIcon}</div>
                          </div>
                          {isJobTarget(target) && (
                            <div className="mt-4 grid grid-row-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500">Women: </span>
                                <span className="font-medium">
                                  {target.women_current?.toLocaleString() || 0} / {target.women_target?.toLocaleString() || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Youth: </span>
                                <span className="font-medium">
                                  {target.youth_current?.toLocaleString() || 0} / {target.youth_target?.toLocaleString() || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(target.last_updated).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTarget(target.id);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Target"
                            >
                              <FileEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTarget(target.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Target"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}

//   const [showQuickUpdateModal, setShowQuickUpdateModal] = useState(false);
//   const [updatingTarget, setUpdatingTarget] = useState<TargetItem | null>(null);
//   const [updateValue, setUpdateValue] = useState('');
//   const [updateWomenValue, setUpdateWomenValue] = useState('');
//   const [updateYouthValue, setUpdateYouthValue] = useState('');
//   const [updatingLoading, setUpdatingLoading] = useState(false);

  
// }