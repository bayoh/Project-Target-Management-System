import React, { useState, useMemo, useCallback, memo } from 'react';
import { AlertTriangle, Trophy, MessageSquare, ChevronRight, Search, Filter, SortAsc, SortDesc, RefreshCw, Grid, List, ChevronDown, Calendar, Target } from 'lucide-react';
// Removed unused type imports
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
// Removed unused import
import { executeQuery } from '../../lib/queries';

interface DashboardItem {
  id: string;
  type: 'intervention' | 'action';
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  intervention_id: string | null;
  role: 'lead' | 'supporting';
  relatedActions?: DashboardItem[];
}

interface FilterState {
  status: string;
  type: string;
  role: string;
  search: string;
}

interface SortState {
  field: 'name' | 'status' | 'start_date' | 'end_date' | 'type';
  direction: 'asc' | 'desc';
}

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
    </div>
    <div className="flex space-x-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
));

// Enhanced error component with retry
const ErrorState = memo(({ error, onRetry }: { error: Error | null; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center max-w-md">
      <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Unable to load dashboard</h3>
      <p className="text-gray-600 mb-6">
        {error?.message || 'An unexpected error occurred while loading your tasks.'}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </button>
    </div>
  </div>
));

// Empty state component
const EmptyState = memo(({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) => (
  <div className="text-center py-16">
    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <Target className="h-12 w-12 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {hasFilters ? 'No items match your filters' : 'No tasks assigned'}
    </h3>
    <p className="text-gray-600 mb-6">
      {hasFilters 
        ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
        : 'You don\'t have any interventions or actions assigned to you yet.'
      }
    </p>
    {hasFilters && (
      <button
        onClick={onClearFilters}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Clear Filters
      </button>
    )}
  </div>
));

// Query function for user dashboard items
const fetchUserDashboardItems = async (userId: string): Promise<DashboardItem[]> => {
  // Fetch interventions where user is lead
  const interventionsResult = await executeQuery(
    supabase
      .from('interventions')
      .select('id, name, description, status, start_date, code, end_date')
      .eq('lead_id', userId)
  );

  // Fetch actions with intervention details where user is lead or supporting staff
  const actionsResult = await executeQuery(
    supabase
      .from('actions')
      .select('id, name, description, code, status, start_date, end_date, lead_id, supporting_staff, intervention_id, intervention:interventions(id, name)')
      .or(`lead_id.eq.${userId},supporting_staff.cs.{${userId}}`)
  );

  const interventions = interventionsResult.data || [];
  console.log(interventions, 'interventions');
  const actions = actionsResult.data || [];
  console.log(actions, 'actions')
  // Transform data into unified format with relationships
  const dashboardItems: DashboardItem[] = [
    ...interventions.map(item => ({
      ...item,
      type: 'intervention' as const,
      code: item.code,
      role: 'lead' as const,
      relatedActions: actions
        .filter(action => action.intervention_id === item.id)
        .map(action => ({
          ...action,
          type: 'action' as const,
          role: action.lead_id === userId ? 'lead' as const : 'supporting' as const
        }))
    })),
    ...actions
      .filter(action => !interventions.some(int => int.id === action.intervention_id))
      .map(item => ({
        ...item,
        type: 'action' as const,
        code: item.code,
        intervention_id: item.intervention_id,
        role: item.lead_id === userId ? 'lead' as const : 'supporting' as const
      }))
  ];

  return dashboardItems;
};

export const UserDashboard = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Enhanced state management
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    role: 'all',
    search: ''
  });
  
  const [sort, setSort] = useState<SortState>({
    field: 'start_date',
    direction: 'desc'
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  
  // Debounced search effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Use TanStack Query for data fetching with retry logic
  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ['userDashboardItems', user?.id],
    queryFn: () => fetchUserDashboardItems(user!.id),
    enabled: !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Memoized callback functions
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleSortChange = useCallback((field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      type: 'all', 
      role: 'all',
      search: ''
    });
  }, []);
  
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);
  
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItem(prev => prev === itemId ? null : itemId);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  // Enhanced filtering and sorting logic
  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter(item => {
      const statusMatch = filters.status === 'all' || item.status === filters.status;
      const typeMatch = filters.type === 'all' || item.type === filters.type;
      const roleMatch = filters.role === 'all' || item.role === filters.role;
      
      // Search functionality
      const searchMatch = !searchDebounced || 
        item.name.toLowerCase().includes(searchDebounced.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchDebounced.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchDebounced.toLowerCase());
      
      return statusMatch && typeMatch && roleMatch && searchMatch;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date | number = a[sort.field] as string | Date | number;
      let bValue: string | Date | number = b[sort.field] as string | Date | number;
      
      // Handle date sorting
      if (sort.field === 'start_date' || sort.field === 'end_date') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [items, filters, searchDebounced, sort]);
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.status !== 'all' || 
           filters.type !== 'all' || 
           filters.role !== 'all' || 
           searchDebounced.length > 0;
  }, [filters, searchDebounced]);

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  // Handle loading and error states
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error as Error} onRetry={handleRetry} />;
  }

  if (filteredAndSortedItems.length === 0) {
    return <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600 mt-2">
                {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'task' : 'tasks'} assigned to you
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1" role="group" aria-label="View mode selection">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={viewMode === 'grid'}
                aria-label="Switch to grid view"
              >
                <Grid className="h-4 w-4" aria-hidden="true" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={viewMode === 'list'}
                aria-label="Switch to list view"
              >
                <List className="h-4 w-4" aria-hidden="true" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-6" role="search" aria-label="Filter and search dashboard items">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Bar */}
            <div className="flex-1">
              <label htmlFor="dashboard-search" className="sr-only">
                Search interventions and actions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  id="dashboard-search"
                  type="text"
                  placeholder="Search interventions and actions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  aria-describedby="search-help"
                />
                <div id="search-help" className="sr-only">
                  Search by intervention or action name, description, or code
                </div>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4" role="group" aria-label="Filter controls">
              <div className="min-w-[140px]">
                <label htmlFor="status-filter" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div className="min-w-[140px]">
                <label htmlFor="type-filter" className="sr-only">
                  Filter by type
                </label>
                <select
                  id="type-filter"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  aria-label="Filter by type"
                >
                  <option value="all">All Types</option>
                  <option value="intervention">Interventions</option>
                  <option value="action">Actions</option>
                </select>
              </div>
              
              <div className="min-w-[140px]">
                <label htmlFor="role-filter" className="sr-only">
                  Filter by role
                </label>
                <select
                  id="role-filter"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  aria-label="Filter by role"
                >
                  <option value="all">All Roles</option>
                  <option value="lead">Lead</option>
                  <option value="supporting">Supporting</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-gray-100" role="group" aria-label="Sort controls">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            {(['name', 'status', 'start_date', 'end_date', 'type'] as const).map((field) => (
              <button
                key={field}
                onClick={() => handleSortChange(field)}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  sort.field === field
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={`Sort by ${field.replace('_', ' ')}`}
              >
                {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {sort.field === field && (
                  sort.direction === 'asc' ? 
                    <SortAsc className="ml-1 h-4 w-4" aria-hidden="true" /> : 
                    <SortDesc className="ml-1 h-4 w-4" aria-hidden="true" />
                )}
              </button>
            ))}
            
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="ml-auto inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
                aria-label="Clear all filters"
                title="Clear all active filters"
              >
                <Filter className="mr-1 h-4 w-4" aria-hidden="true" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Items Display */}
        <div 
          className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' 
              : 'space-y-4'
          }`}
          role="main"
          aria-label={`Dashboard items in ${viewMode} view`}
          aria-live="polite"
          aria-atomic="false"
        >
          {filteredAndSortedItems.map((item) => (
             <article 
               key={item.id} 
               className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:shadow-lg ${
                 viewMode === 'list' ? 'p-6' : 'p-5'
               }`}
               role="article"
               aria-labelledby={`item-title-${item.id}`}
               aria-describedby={`item-description-${item.id}`}
               tabIndex={0}
             >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    item.type === 'intervention' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                  aria-label={`Type: ${item.type}`}
                  >
                    {item.type}
                  </span>
                  {item.code && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    aria-label={`Code: ${item.code}`}
                    >
                      {item.code}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    item.role === 'lead' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}
                  aria-label={`Role: ${item.role}`}
                  >
                    {item.role}
                  </span>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                  item.status === 'completed' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : item.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : item.status === 'at_risk'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 
                  id={`item-title-${item.id}`}
                  className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors"
                >
                  {item.name}
                </h3>
                {item.description && (
                  <p 
                    id={`item-description-${item.id}`}
                    className="text-gray-600 text-sm leading-relaxed line-clamp-3"
                  >
                    {item.description}
                  </p>
                )}
              </div>

              {/* Dates */}
              {(item.start_date || item.end_date) && (
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  {item.start_date && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Start: {formatDate(item.start_date)}</span>
                    </div>
                  )}
                  {item.end_date && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>End: {formatDate(item.end_date)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Item actions">
                {item.type === 'intervention' ? (
                  <>
                    <button
                      onClick={() => navigate(`/interventions/${item.id}/issues`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View issues for ${item.name}`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
                      Issues
                    </button>
                    <button
                      onClick={() => navigate(`/interventions/${item.id}/achievements`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View achievements for ${item.name}`}
                    >
                      <Trophy className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
                      Achievements
                    </button>
                    <button
                      onClick={() => navigate(`/interventions/${item.id}/targets`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View targets for ${item.name}`}
                    >
                      <Target className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
                      Targets
                    </button>
                    <button
                      onClick={() => navigate(`/interventions/${item.id}/comments`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View comments for ${item.name}`}
                    >
                      <MessageSquare className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
                      Comments
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/actions/${item.id}/issues`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View issues for ${item.name}`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                      Issues
                    </button>
                    <button
                      onClick={() => navigate(`/actions/${item.id}/achievements`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View achievements for ${item.name}`}
                    >
                      <Trophy className="h-3 w-3 mr-1" aria-hidden="true" />
                      Achievements
                    </button>
                    <button
                      onClick={() => navigate(`/actions/${item.id}/targets`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View targets for ${item.name}`}
                    >
                      <Target className="h-3 w-3 mr-1" aria-hidden="true" />
                      Targets
                    </button>
                    <button
                      onClick={() => navigate(`/actions/${item.id}/comments`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`View comments for ${item.name}`}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" aria-hidden="true" />
                      Comments
                    </button>
                  </>
                )}
              </div>
              
              {/* View Details Button */}
              <button
                onClick={() => navigate(item.type === 'intervention' ? `/interventions/${item.id}` : `/actions/${item.intervention_id}`)}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 hover:shadow-sm"
                aria-label={`View details for ${item.name}`}
              >
                View Details
                <ChevronRight className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </button>

              {/* Related Actions for Interventions */}
              {item.type === 'intervention' && item.relatedActions && item.relatedActions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, () => toggleExpanded(item.id))}
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded"
                    aria-expanded={expandedItem === item.id}
                    aria-controls={`related-actions-${item.id}`}
                    aria-label={`${expandedItem === item.id ? 'Collapse' : 'Expand'} related actions for ${item.name}`}
                  >
                    <ChevronDown className={`h-4 w-4 mr-1 transform transition-transform duration-200 ${
                      expandedItem === item.id ? 'rotate-180' : ''
                    }`} aria-hidden="true" />
                    Related Actions ({item.relatedActions.length})
                  </button>
                  
                  {expandedItem === item.id && (
                    <div 
                      id={`related-actions-${item.id}`}
                      className="space-y-3 animate-in slide-in-from-top-2 duration-300"
                      role="region"
                      aria-label={`Related actions for ${item.name}`}
                    >
                      {item.relatedActions.map((action: DashboardItem) => (
                        <article key={action.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors focus-within:ring-2 focus-within:ring-blue-500">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700" aria-label="Type: Action">
                                Action
                              </span>
                              {action.code && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700" aria-label={`Code: ${action.code}`}>
                                  {action.code}
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                action.role === 'lead' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`} aria-label={`Role: ${action.role}`}>
                                {action.role}
                              </span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              action.status === 'completed' 
                                ? 'bg-green-100 text-green-700'
                                : action.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700'
                                : action.status === 'at_risk'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {action.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1">{action.name}</h4>
                          {action.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{action.description}</p>
                          )}
                          
                          {(action.start_date || action.end_date) && (
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              {action.start_date && (
                                <span>Start: {formatDate(action.start_date)}</span>
                              )}
                              {action.end_date && (
                                <span>End: {formatDate(action.end_date)}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1" role="group" aria-label={`Actions for ${action.name}`}>
                            <button
                              onClick={() => navigate(`/actions/${action.id}/issues`)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              aria-label={`View issues for ${action.name}`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                              Issues
                            </button>
                            <button
                              onClick={() => navigate(`/actions/${action.id}/achievements`)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none"
                              aria-label={`View achievements for ${action.name}`}
                            >
                              <Trophy className="h-3 w-3 mr-1" aria-hidden="true" />
                              Achievements
                            </button>
                            <button
                              onClick={() => navigate(`/actions/${action.id}/targets`)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              aria-label={`View targets for ${action.name}`}
                            >
                              <Target className="h-3 w-3 mr-1" aria-hidden="true" />
                              Targets
                            </button>
                            <button
                              onClick={() => navigate(`/actions/${action.id}/comments`)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
                              aria-label={`View comments for ${action.name}`}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" aria-hidden="true" />
                              Comments
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
         </div>
       </div>
     </div>
   );
});

export default UserDashboard;