import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useActivities } from '../hooks/useActivityQueries';
import { useOptimizedActivityTracking } from '../hooks/useOptimizedActivityTracking';
import {
  Users,
  Activity,
  Calendar,
  Eye,
  Search,
  Filter,
  Download,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserActivityDetail } from '../components/OptimizedUserActivity';

// Types
interface UserActivitySummary {
  user_id: string;
  name: string;
  email: string;
  role: string;
  last_login: string | null;
  last_logout: string | null;
  last_activity: string | null;
  total_activities_30d: number;
  active_sessions: number;
  most_common_action: string | null;
}

interface Filters {
  search: string;
  role: string;
  activityStatus: string;
  dateRange: string;
  entityType: string;
  customDateStart: string;
  customDateEnd: string;
}

interface SortConfig {
  field: keyof UserActivitySummary;
  direction: 'asc' | 'desc';
}

// Memoized components for better performance
const StatsCard = memo(({ icon: Icon, title, value, color }: {
  icon: React.ComponentType<any>;
  title: string;
  value: number;
  color: string;
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <Icon className={`h-8 w-8 ${color}`} />
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
));

const UserRow = memo(({ 
  user, 
  onViewDetail, 
  getActivityStatus, 
  formatDate 
}: {
  user: UserActivitySummary;
  onViewDetail: (user: UserActivitySummary) => void;
  getActivityStatus: (lastActivity: string | null) => { status: string; text: string; color: string };
  formatDate: (date: string | null) => string;
}) => {
  const activityStatus = getActivityStatus(user.last_activity);
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {user.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {user.role || 'user'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(user.last_login)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(user.last_activity)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {user.total_activities_30d || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${activityStatus.color}`}>
          {activityStatus.text}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => onViewDetail(user)}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </button>
      </td>
    </tr>
  );
});

// Virtual scrolling hook for large datasets
function useVirtualScrolling({
  items,
  itemHeight = 73, // Approximate height of a table row
  containerHeight = 600,
  overscan = 5
}: {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
}

// Optimized filtering and sorting with better memoization
function useOptimizedFiltering(users: UserActivitySummary[], filters: Filters, sortConfig: SortConfig) {
  // Memoize filter predicates separately to avoid recreating them
  const searchPredicate = useMemo(() => {
    if (!filters.search.trim()) return () => true;
    const searchLower = filters.search.toLowerCase();
    return (user: UserActivitySummary) => 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower);
  }, [filters.search]);

  const rolePredicate = useMemo(() => {
    if (!filters.role) return () => true;
    return (user: UserActivitySummary) => user.role === filters.role;
  }, [filters.role]);

  const activityStatusPredicate = useMemo(() => {
    if (!filters.activityStatus) return () => true;
    return (user: UserActivitySummary) => {
      const lastActivity = user.last_activity;
      if (!lastActivity) return filters.activityStatus === 'inactive';
      
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      switch (filters.activityStatus) {
        case 'active': return daysSinceActivity <= 7;
        case 'moderate': return daysSinceActivity > 7 && daysSinceActivity <= 30;
        case 'inactive': return daysSinceActivity > 30;
        default: return true;
      }
    };
  }, [filters.activityStatus]);

  const dateRangePredicate = useMemo(() => {
    if (filters.customDateStart || filters.customDateEnd) {
      const startDate = filters.customDateStart ? new Date(filters.customDateStart) : null;
      const endDate = filters.customDateEnd ? new Date(filters.customDateEnd) : null;
      
      return (user: UserActivitySummary) => {
        if (!user.last_activity) return false;
        const activityDate = new Date(user.last_activity);
        
        if (startDate && activityDate < startDate) return false;
        if (endDate && activityDate > endDate) return false;
        return true;
      };
    }
    return () => true;
  }, [filters.customDateStart, filters.customDateEnd]);

  // Combine all predicates efficiently
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      searchPredicate(user) &&
      rolePredicate(user) &&
      activityStatusPredicate(user) &&
      dateRangePredicate(user)
    );
  }, [users, searchPredicate, rolePredicate, activityStatusPredicate, dateRangePredicate]);

  // Memoize sorting function
  const sortedUsers = useMemo(() => {
    if (!sortConfig.field) return filteredUsers;
    
    return [...filteredUsers].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle different data types
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Fallback to string comparison
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredUsers, sortConfig]);

  return sortedUsers;
}

// Debounced input component
const DebouncedInput = memo(({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  delay = 300 
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(localValue);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [localValue, onChange, delay]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
});

export const OptimizedUserActivity: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { trackPageView, trackSearch, trackExport, getPerformanceMetrics } = useOptimizedActivityTracking();
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    search: '',
    role: '',
    activityStatus: '',
    dateRange: '30',
    entityType: '',
    customDateStart: '',
    customDateEnd: ''
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'last_activity',
    direction: 'desc'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedUser, setSelectedUser] = useState<UserActivitySummary | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [useVirtualization, setUseVirtualization] = useState(false);

  // Data fetching
  const { data: users = [], loading, error } = useActivities();

  // Track page view on mount
  useEffect(() => {
    trackPageView('user-activity-dashboard');
  }, [trackPageView]);

  // Optimized filtering and sorting
  const filteredAndSortedUsers = useOptimizedFiltering(users, filters, sortConfig);

  // Virtual scrolling for large datasets
  const shouldUseVirtualization = filteredAndSortedUsers.length > 100 || useVirtualization;
  const virtualScrolling = useVirtualScrolling({
    items: filteredAndSortedUsers,
    containerHeight: 600,
    itemHeight: 73
  });

  // Pagination (only when not using virtual scrolling)
  const paginatedUsers = useMemo(() => {
    if (shouldUseVirtualization) return filteredAndSortedUsers;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize, shouldUseVirtualization]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);

  // Memoized utility functions
  const getActivityStatus = useCallback((lastActivity: string | null) => {
    if (!lastActivity) {
      return { status: 'inactive', text: 'Never Active', color: 'bg-gray-500' };
    }
    
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity <= 7) {
      return { status: 'active', text: 'Active', color: 'bg-green-500' };
    } else if (daysSinceActivity <= 30) {
      return { status: 'moderate', text: 'Moderate', color: 'bg-yellow-500' };
    } else {
      return { status: 'inactive', text: 'Inactive', color: 'bg-red-500' };
    }
  }, []);

  const formatDate = useCallback((date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Event handlers
  const handleSort = useCallback((field: keyof UserActivitySummary) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSearch = useCallback((searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
    setCurrentPage(1);
    trackSearch(searchValue, 'user');
  }, [trackSearch]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleExport = useCallback(() => {
    trackExport('csv', 'user_activity');
    
    const csvContent = [
      ['Name', 'Email', 'Role', 'Last Login', 'Last Logout', 'Last Activity', '30-Day Activities', 'Active Sessions', 'Most Common Action', 'Status'].join(','),
      ...filteredAndSortedUsers.map(user => [
        user.name || '',
        user.email,
        user.role || '',
        formatDate(user.last_login),
        formatDate(user.last_logout),
        formatDate(user.last_activity),
        user.total_activities_30d || 0,
        user.active_sessions || 0,
        user.most_common_action || '',
        getActivityStatus(user.last_activity).text
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredAndSortedUsers, formatDate, getActivityStatus, trackExport]);

  const handleViewUserDetail = useCallback((user: UserActivitySummary) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  }, []);

  const handleCloseUserDetail = useCallback(() => {
    setShowUserDetail(false);
    setSelectedUser(null);
  }, []);

  // Memoized stats calculations
  const stats = useMemo(() => {
    const activeUsers = users.filter(u => getActivityStatus(u.last_activity).status === 'active').length;
    const recentUsers = users.filter(u => ['active', 'moderate'].includes(getActivityStatus(u.last_activity).status)).length;
    const inactiveUsers = users.filter(u => getActivityStatus(u.last_activity).status === 'inactive').length;
    
    return {
      total: users.length,
      active: activeUsers,
      recent: recentUsers,
      inactive: inactiveUsers
    };
  }, [users, getActivityStatus]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Activity Dashboard</h1>
          <p className="text-gray-600">Monitor user engagement and system usage</p>
          
          {/* Performance metrics (dev mode) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Performance Metrics</h3>
              <div className="text-xs text-blue-700">
                {JSON.stringify(getPerformanceMetrics(), null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard icon={Users} title="Total Users" value={stats.total} color="text-blue-500" />
          <StatsCard icon={Activity} title="Active Users" value={stats.active} color="text-green-500" />
          <StatsCard icon={Calendar} title="Recent Users" value={stats.recent} color="text-yellow-500" />
          <StatsCard icon={Eye} title="Inactive Users" value={stats.inactive} color="text-red-500" />
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              {filteredAndSortedUsers.length > 100 && (
                <label className="ml-auto flex items-center">
                  <input
                    type="checkbox"
                    checked={useVirtualization}
                    onChange={(e) => setUseVirtualization(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Enable Virtual Scrolling</span>
                </label>
              )}
            </div>
            
            {/* First row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <DebouncedInput
                  value={filters.search}
                  onChange={handleSearch}
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  delay={300}
                />
              </div>

              {/* Role Filter */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="leadership">Leadership</option>
                <option value="lead">Lead</option>
                <option value="supporting_staff">Supporting Staff</option>
              </select>

              {/* Activity Status Filter */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.activityStatus}
                onChange={(e) => handleFilterChange('activityStatus', e.target.value)}
              >
                <option value="">All Activity Levels</option>
                <option value="active">Active (Last 7 days)</option>
                <option value="moderate">Moderate (7-30 days)</option>
                <option value="inactive">Inactive (30+ days)</option>
              </select>

              {/* Page Size */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                disabled={shouldUseVirtualization}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Custom Date Range Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity From
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.customDateStart}
                    onChange={(e) => handleFilterChange('customDateStart', e.target.value)}
                  />
                </div>
              </div>

              {/* Custom Date Range End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity To
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.customDateEnd}
                    onChange={(e) => handleFilterChange('customDateEnd', e.target.value)}
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({
                      search: '',
                      role: '',
                      activityStatus: '',
                      dateRange: '30',
                      entityType: '',
                      customDateStart: '',
                      customDateEnd: ''
                    });
                    setCurrentPage(1);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Clear Filters
                </button>
              </div>

              {/* Export Button */}
              <div className="flex items-end">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading user activity data...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{(error as Error).message}</p>
            </div>
          ) : (
            <>
              {shouldUseVirtualization ? (
                // Virtual scrolling implementation
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}
                        >
                          User
                          {sortConfig.field === 'name' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('role')}
                        >
                          Role
                          {sortConfig.field === 'role' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('last_login')}
                        >
                          Last Login
                          {sortConfig.field === 'last_login' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('last_activity')}
                        >
                          Last Activity
                          {sortConfig.field === 'last_activity' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('total_activities_30d')}
                        >
                          30-Day Activities
                          {sortConfig.field === 'total_activities_30d' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                  </table>
                  
                  <div 
                    ref={virtualScrolling.scrollElementRef}
                    className="overflow-auto"
                    style={{ height: '600px' }}
                    onScroll={virtualScrolling.handleScroll}
                  >
                    <div style={{ height: virtualScrolling.totalHeight, position: 'relative' }}>
                      <div style={{ transform: `translateY(${virtualScrolling.offsetY}px)` }}>
                        <table className="min-w-full">
                          <tbody className="bg-white divide-y divide-gray-200">
                            {virtualScrolling.visibleItems.map((user: UserActivitySummary, index) => (
                              <UserRow
                                key={`${user.user_id}-${virtualScrolling.startIndex + index}`}
                                user={user}
                                onViewDetail={handleViewUserDetail}
                                getActivityStatus={getActivityStatus}
                                formatDate={formatDate}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular table with pagination
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}
                        >
                          User
                          {sortConfig.field === 'name' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('role')}
                        >
                          Role
                          {sortConfig.field === 'role' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('last_login')}
                        >
                          Last Login
                          {sortConfig.field === 'last_login' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('last_activity')}
                        >
                          Last Activity
                          {sortConfig.field === 'last_activity' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('total_activities_30d')}
                        >
                          30-Day Activities
                          {sortConfig.field === 'total_activities_30d' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedUsers.map((user: UserActivitySummary) => (
                        <UserRow
                          key={user.user_id}
                          user={user}
                          onViewDetail={handleViewUserDetail}
                          getActivityStatus={getActivityStatus}
                          formatDate={formatDate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination (only when not using virtual scrolling) */}
              {!shouldUseVirtualization && totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, filteredAndSortedUsers.length)}
                        </span>{' '}
                        of <span className="font-medium">{filteredAndSortedUsers.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Activity Detail Modal */}
        {selectedUser && (
          <UserActivityDetail
            userId={selectedUser.user_id}
            userName={selectedUser.name || 'Unknown'}
            userEmail={selectedUser.email}
            isOpen={showUserDetail}
            onClose={handleCloseUserDetail}
          />
        )}
      </div>
    </div>
  );
};

export default OptimizedUserActivity;