import React, { useState, useEffect, useMemo } from 'react';
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
  // AlertTriangle, // Removed as TrendingDown/Up is more specific for progress status
  Clock,
  Edit3, // For Quick Update
  Eye, // For View Details
  TrendingDown, // For at-risk/low progress
  TrendingUp, // For good progress (not yet completed)
  ListFilter // Alternative for Filters button icon
}
 from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { PageHeader } from '../../components/layout/PageHeader';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

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
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadTargets(), loadFilterOptions()]);
    setLoading(false);
  };

  useEffect(() => {
    applyAndSortFilters();
  }, [targets, filters]);

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

  const loadTargets = async () => {
    try {
      // setLoading(true); // setLoading is handled by loadInitialData
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
    } 
    // finally { // setLoading is handled by loadInitialData
    //   setLoading(false);
    // }
  };

  const applyAndSortFilters = () => { // Renamed from applyFilters for clarity
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
      sortDirection: prev.sortBy === field && prev.sortDirection === 'desc' ? 'desc' : 'asc' // Corrected logic: if current is desc, next is asc, else desc
    }));
  };

  const calculateProgress = (current: number, target: number): number => {
    if (target <= 0) return 0; // Avoid division by zero or negative target
    return Math.min(Math.max((current / target) * 100, 0), 100); // Ensure progress is between 0 and 100
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-sky-500'; // Changed from blue for better distinction
    if (progress >= 50) return 'bg-yellow-500';
    if (progress > 0) return 'bg-orange-500'; // For low progress
    return 'bg-red-500'; // For zero or very low progress
  };

  const getProgressStatus = (target: TargetItem): { icon: React.ReactNode; text: string; color: string } => {
    const progress = calculateProgress(target.current_value, target.target_value);
    if (progress >= 100) return { icon: <CheckCircle2 className="h-5 w-5" />, text: 'Completed', color: 'text-green-600' };
    if (progress >= 75) return { icon: <TrendingUp className="h-5 w-5" />, text: 'On Track', color: 'text-sky-600' };
    if (progress >= 50) return { icon: <Clock className="h-5 w-5" />, text: 'In Progress', color: 'text-yellow-600' };
    if (progress > 0) return { icon: <TrendingDown className="h-5 w-5" />, text: 'At Risk', color: 'text-orange-600' };
    return { icon: <AlertCircle className="h-5 w-5" />, text: 'Needs Attention', color: 'text-red-600' };
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


  const uniqueCategories = useMemo(() => {
    const categories = new Set(targets.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(categories).sort();
  }, [targets]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Targets</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadInitialData} variant="outline">Try Again</Button>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
    <TooltipProvider>
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Target Tracking"
        description="Monitor, filter, and update targets across all actions and interventions."
        icon={<Target className="h-8 w-8 text-blue-600" />}
        actions={[
          {
            label: 'Add New Target',
            icon: Plus,
            onClick: handleCreateTarget,
          }
        ]}
      />

      {/* Filters and Actions */} 
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 ring-1 ring-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="flex items-center space-x-3 flex-grow">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center whitespace-nowrap"
            >
              <ListFilter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
            
            <div className="relative flex-grow max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search targets..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 w-full"
              />
            </div>
          </div>
          
          {/* Add Target button moved to PageHeader actions */}
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-4 border-t border-gray-200 mt-4">
            <div>
              <label htmlFor="cluster-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Cluster
              </label>
              <Select 
                value={filters.clusterId}
                options={clusters.map(cluster => (
                  {
                    value: cluster.id,
                    label: cluster.name
                  }
                ))}
                onChange={(value) => typeof value === 'string' && setFilters(prev => ({ 
                  ...prev, 
                  clusterId: value,
                  pathwayId: '',
                  interventionId: '',
                  actionId: ''
                }))}
              >
                
              </Select>
            </div>
            
            <div>
              <label htmlFor="pathway-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Pathway
              </label>
              <Select 
                value={filters.pathwayId}
                options={pathways
                  .filter(pathway => !filters.clusterId || pathway.cluster_id === filters.clusterId)
                  .map(pathway => (
                    {
                      value: pathway.id,
                      label: pathway.name
                    }
                  ))}
                onChange={(value) => typeof value === 'string' && setFilters(prev => ({ 
                  ...prev, 
                  pathwayId: value,
                  interventionId: '',
                  actionId: ''
                }))}
                disabled={!filters.clusterId}
              >
              </Select>
            </div>
            
            <div>
              <label htmlFor="intervention-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Intervention
              </label>
              <Select 
                value={filters.interventionId}
                onChange={(value) => typeof value === 'string' && setFilters(prev => ({ 
                  ...prev, 
                  interventionId: value,
                  actionId: ''
                }))}
                options={interventions
                  .filter(intervention => !filters.pathwayId || intervention.pathway_id === filters.pathwayId)
                  .map(intervention => (
                    {
                      value: intervention.id,
                      label: intervention.name,
                    }
                  ))}
                disabled={!filters.pathwayId}
              >
              
              </Select>
            </div>
            
            <div>
              <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <Select 
                value={filters.actionId}
                onChange={(value) => typeof value === 'string' && setFilters(prev => ({ ...prev, actionId: value }))}
                disabled={!filters.interventionId}
                options={actions
                  .filter(action => !filters.interventionId || action.intervention_id === filters.interventionId)
                  .map(action => (
                    {
                      value: action.id,
                      label: action.name,
                     
                    }
                  ))}
              >
                
              </Select>
            </div>

            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select 
                value={filters.category}
                onChange={(value) => typeof value === 'string' && setFilters(prev => ({ ...prev, category: value }))}
                options={uniqueCategories.map(category => (
                  {
                    value: category,
                    label: category
                  }
                ))}
              >
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Targets Table */} 
      <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('description')}>Description {renderSortIcon('description')}</TableHead>
              {/* <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hierarchy</TableHead> */}
              <TableHead className="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('metric')}>Metric {renderSortIcon('metric')}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>Category {renderSortIcon('category')}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('target_value')}>Target {renderSortIcon('target_value')}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('current_value')}>Current {renderSortIcon('current_value')}</TableHead>
              <TableHead className="w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('progress')}>Progress {renderSortIcon('progress')}</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('last_updated')}>Last Updated {renderSortIcon('last_updated')}</TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTargets.length > 0 ? (
              filteredTargets.map((target, index) => {
                const progress = calculateProgress(target.current_value, target.target_value);
                const status = getProgressStatus(target);
                return (
                  <TableRow key={target.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-150`}>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate" title={target.description}>{target.description}</TableCell>
                    {/* <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate">
                        <div className="font-medium text-gray-700">{target.action?.name || 'N/A'}</div>
                        <div className="text-gray-500">{target.action?.intervention?.name || 'N/A'}</div>
                        <div className="text-gray-400 text-[11px]">{target.action?.intervention?.pathway?.name || 'N/A'} &gt; {target.action?.intervention?.pathway?.cluster?.name || 'N/A'}</div>
                    </TableCell> */}
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{target.metric}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {target.category ? <Badge variant={target.category === 'jobs' ? 'default' : 'secondary'}>{target.category}</Badge> : 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{target.target_value.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{target.current_value.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${getProgressColor(progress)} transition-all duration-500 ease-out`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${status.color}`}>
                      <div className="flex items-center">
                        {status.icon}
                        <span className="ml-2">{status.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(target.last_updated).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 text-blue-600" onClick={() => handleViewDetails(target.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Details</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-yellow-100 text-yellow-600" onClick={() => handleQuickUpdate(target.id)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Quick Update</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100 text-green-600" onClick={() => handleEditTarget(target.id)}>
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit Target</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 text-red-600" onClick={() => handleDeleteTarget(target.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete Target</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="px-6 py-12 text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No targets found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filters.searchTerm || filters.clusterId || filters.pathwayId || filters.interventionId || filters.actionId || filters.category 
                      ? 'Try adjusting your search or filter criteria.' 
                      : 'Get started by creating a new target.'}
                  </p>
                  {(filters.searchTerm || filters.clusterId || filters.pathwayId || filters.interventionId || filters.actionId || filters.category) && (
                     <Button 
                        variant="outline"
                        className="mt-4"
                        onClick={() => setFilters({
                            clusterId: '', pathwayId: '', interventionId: '', actionId: '', category: '', 
                            searchTerm: '', sortBy: 'last_updated', sortDirection: 'desc'
                        })}
                    >
                        Clear Filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Quick Update Modal */} 
      {showQuickUpdateModal && updatingTarget && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" onClick={() => setShowQuickUpdateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all duration-300 ease-in-out scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Quick Update: <span className="font-normal text-blue-600">{updatingTarget.description}</span></h3>
                <Button variant="ghost" size="icon" onClick={() => setShowQuickUpdateModal(false)} className="text-gray-400 hover:text-gray-600">
                    <ChevronDown className="h-5 w-5 rotate-45" /> {/* Using ChevronDown rotated as a close icon */} 
                </Button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="current-value" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current Value <span className="text-gray-500">({updatingTarget.metric})</span>
                  </label>
                  <Input
                    type="number"
                    id="current-value"
                    value={updateValue}
                    onChange={(e) => setUpdateValue(e.target.value)}
                    required
                    min="0"
                    step="any" // Allow decimals
                  />
                  <div className="mt-1.5 text-xs text-gray-500 flex justify-between">
                    <span>Target: {updatingTarget.target_value.toLocaleString()}</span> 
                    <span>Baseline: {updatingTarget.baseline_value.toLocaleString()}</span>
                  </div>
                </div>

                {isJobTarget(updatingTarget) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label htmlFor="women-value" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Women Current
                        </label>
                        <Input
                            type="number"
                            id="women-value"
                            value={updateWomenValue}
                            onChange={(e) => setUpdateWomenValue(e.target.value)}
                            min="0"
                            step="1"
                        />
                        <div className="mt-1.5 text-xs text-gray-500">
                            Target: {updatingTarget.women_target?.toLocaleString() || 'N/A'}
                        </div>
                        </div>
                        <div>
                        <label htmlFor="youth-value" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Youth Current
                        </label>
                        <Input
                            type="number"
                            id="youth-value"
                            value={updateYouthValue}
                            onChange={(e) => setUpdateYouthValue(e.target.value)}
                            min="0"
                            step="1"
                        />
                        <div className="mt-1.5 text-xs text-gray-500">
                            Target: {updatingTarget.youth_target?.toLocaleString() || 'N/A'}
                        </div>
                        </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex items-center justify-end space-x-3 border-t pt-6 border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickUpdateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingLoading}
                >
                  {updatingLoading ? (
                    <><Clock className="animate-spin h-4 w-4 mr-2" /> Updating...</>
                  ) : 'Save Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
    </DashboardLayout>
  );
}