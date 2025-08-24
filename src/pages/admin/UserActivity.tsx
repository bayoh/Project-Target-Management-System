import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Search, Filter, Download, Eye, Calendar, Users, Activity, CalendarDays } from 'lucide-react';
import UserActivityDetail from '../../components/admin/UserActivityDetail';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
// Add shared UI imports
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/Input';
import { Select as UiSelect } from '../../components/ui/Select';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

interface UserActivitySummary {
  user_id: string;
  email: string;
  name: string;
  role: string;
  user_created_at: string;
  last_login: string | null;
  last_logout: string | null;
  active_sessions: number;
  last_activity: string | null;
  total_activities_30d: number;
  most_common_action: string | null;
}

interface ActivityFilters {
  search: string;
  role: string;
  activityStatus: string;
  dateRange: string;
  entityType: string;
  customDateStart: string;
  customDateEnd: string;
}

const UserActivity: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [filters, setFilters] = useState<ActivityFilters>({
    search: '',
    role: '',
    activityStatus: '',
    dateRange: '30',
    entityType: '',
    customDateStart: '',
    customDateEnd: ''
  });
  const [selectedUser, setSelectedUser] = useState<UserActivitySummary | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [sortField, setSortField] = useState<keyof UserActivitySummary>('last_activity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch user activity data using TanStack Query
  const { data: users = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.admin.userActivity(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_summary')
        .select('*')
        .order('last_activity', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && isAdmin,
  });

  // Track page view
  useEffect(() => {
    // trackPageView('User Activity Dashboard');
  }, []);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        console.log(user)
        if (!user.name?.toLowerCase().includes(searchLower) && 
            !user.email?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Role filter
      if (filters.role && user.role !== filters.role) {
        return false;
      }

      // Activity status filter
      if (filters.activityStatus) {
        const daysSinceActivity = user.last_activity 
          ? Math.floor((Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        switch (filters.activityStatus) {
          case 'active':
            if (daysSinceActivity > 7) return false;
            break;
          case 'inactive':
            if (daysSinceActivity <= 30) return false;
            break;
          case 'moderate':
            if (daysSinceActivity <= 7 || daysSinceActivity > 30) return false;
            break;
        }
      }

      // Custom date range filter
      if (filters.customDateStart && filters.customDateEnd && user.last_activity) {
        const userLastActivity = new Date(user.last_activity);
        const startDate = new Date(filters.customDateStart);
        const endDate = new Date(filters.customDateEnd);
        if (userLastActivity < startDate || userLastActivity > endDate) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

      // Handle dates
      if (sortField.includes('_at') || sortField.includes('_login') || sortField.includes('_activity')) {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters, sortField, sortDirection]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);

  // Activity status helper
  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { status: 'never', color: 'bg-gray-500', text: 'Never Active' };
    
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 1) return { status: 'active', color: 'bg-green-500', text: 'Active' };
    if (daysSince <= 7) return { status: 'recent', color: 'bg-yellow-500', text: 'Recent' };
    if (daysSince <= 30) return { status: 'moderate', color: 'bg-orange-500', text: 'Moderate' };
    return { status: 'inactive', color: 'bg-red-500', text: 'Inactive' };
  };

  // Quick summary counts for segmented controls
  const statusCounts = useMemo(() => {
    const all = users.length;
    const active = users.filter(u => getActivityStatus(u.last_activity).status === 'active').length;
    const moderate = users.filter(u => getActivityStatus(u.last_activity).status === 'moderate').length;
    const inactive = users.filter(u => getActivityStatus(u.last_activity).status === 'inactive').length;
    return { all, active, moderate, inactive };
  }, [users]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle sort
  const handleSort = (field: keyof UserActivitySummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export data
  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Created', 'Last Login', 'Last Logout', 'Last Activity', '30-Day Activities', 'Active Sessions', 'Most Common Action', 'Status'].join(','),
      ...filteredAndSortedUsers.map(user => [
        user.name || '',
        user.email || '',
        user.role || '',
        formatDate(user.user_created_at),
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
  };

  // Handle user detail view
  const handleViewUserDetail = (user: UserActivitySummary) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const handleCloseUserDetail = () => {
    setShowUserDetail(false);
    setSelectedUser(null);
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">User Activity Dashboard</h1>
          <p className="text-gray-600">Monitor user engagement and system usage</p>
        </div>

        {/* Segmented controls for Active/Inactive */}
        {/* <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.activityStatus === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityStatus: '' })}
              >
                All <Badge className="ml-2" variant="secondary">{statusCounts.all}</Badge>
              </Button>
              <Button
                variant={filters.activityStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityStatus: 'active' })}
              >
                Active <Badge className="ml-2" variant="secondary">{statusCounts.active}</Badge>
              </Button>
              <Button
                variant={filters.activityStatus === 'moderate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityStatus: 'moderate' })}
              >
                Moderate <Badge className="ml-2" variant="secondary">{statusCounts.moderate}</Badge>
              </Button>
              <Button
                variant={filters.activityStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityStatus: 'inactive' })}
              >
                Inactive <Badge className="ml-2" variant="secondary">{statusCounts.inactive}</Badge>
              </Button>
            </div>
          </CardContent>
        </Card> */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Users</p>
                <p className="text-xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-green-500" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Active Users</p>
                <p className="text-xl font-bold text-gray-900">{statusCounts.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-yellow-500" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Recent Users</p>
                <p className="text-xl font-bold text-gray-900">{users.filter(u => ['active', 'recent'].includes(getActivityStatus(u.last_activity).status)).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Eye className="h-6 w-6 text-red-500" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Inactive Users</p>
                <p className="text-xl font-bold text-gray-900">{statusCounts.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
            </div>
            {/* First row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                  icon={<Search className="h-4 w-4 text-gray-400" />}
                />
              </div>

              {/* Role Filter */}
              <UiSelect
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'super_admin', label: 'Super Admin' },
                  { value: 'leadership', label: 'Leadership' },
                  { value: 'lead', label: 'Lead' },
                  { value: 'supporting_staff', label: 'Supporting Staff' },
                ]}
                value={filters.role}
                onChange={(val) => setFilters({ ...filters, role: Array.isArray(val) ? (val[0] || '') : (val || '') })}
              />

              {/* Activity Status Filter */}
              <UiSelect
                options={[
                  { value: '', label: 'All Activity Levels' },
                  { value: 'active', label: 'Active (Last 7 days)' },
                  { value: 'moderate', label: 'Moderate (7-30 days)' },
                  { value: 'inactive', label: 'Inactive (30+ days)' },
                ]}
                value={filters.activityStatus}
                onChange={(val) => setFilters({ ...filters, activityStatus: Array.isArray(val) ? (val[0] || '') : (val || '') })}
              />

              {/* Page Size */}
              <UiSelect
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '20', label: '20 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' },
                ]}
                value={String(pageSize)}
                onChange={(val) => {
                  const v = Array.isArray(val) ? (val[0] || '20') : (val || '20');
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Custom Date Range Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity From</label>
                <Input
                  type="date"
                  value={filters.customDateStart}
                  onChange={(e) => setFilters({ ...filters, customDateStart: e.target.value })}
                  className="pl-10"
                  icon={<CalendarDays className="h-4 w-4 text-gray-400" />}
                />
              </div>

              {/* Custom Date Range End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity To</label>
                <Input
                  type="date"
                  value={filters.customDateEnd}
                  onChange={(e) => setFilters({ ...filters, customDateEnd: e.target.value })}
                  className="pl-10"
                  icon={<CalendarDays className="h-4 w-4 text-gray-400" />}
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
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
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>

              {/* Export Button */}
              <div className="flex items-end">
                <Button onClick={handleExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
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
              <TooltipProvider>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        User
                        {sortField === 'name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                        onClick={() => handleSort('role')}
                      >
                        Role
                        {sortField === 'role' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden sm:table-cell"
                        onClick={() => handleSort('last_login')}
                      >
                        Last Login
                        {sortField === 'last_login' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('last_activity')}
                      >
                        Last Activity
                        {sortField === 'last_activity' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Top Action
                      </th>
                      <th 
                        className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                        onClick={() => handleSort('total_activities_30d')}
                      >
                        30-Day Activities
                        {sortField === 'total_activities_30d' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map((user: UserActivitySummary) => {
                      const activityStatus = getActivityStatus(user.last_activity);
                      return (
                        <tr key={user.user_id} className={`hover:bg-gray-50 ${activityStatus.status === 'inactive' ? 'bg-red-50' : activityStatus.status === 'active' ? 'bg-green-50/40' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-start">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`mt-1 mr-2 inline-block w-2 h-2 rounded-full ${activityStatus.color}`}></span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                  <p>{activityStatus.text}</p>
                                </TooltipContent>
                              </Tooltip>
                              <div>
                                <div className="text-sm font-medium text-gray-900 max-w-[10rem] sm:max-w-[12rem] md:max-w-[14rem] lg:max-w-[16rem] truncate">
                                  {user.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 max-w-[12rem] sm:max-w-[16rem] md:max-w-[20rem] lg:max-w-[24rem] truncate">{user.email}</div>
                                <div className="sm:hidden text-xs text-gray-500 mt-1">
                                  <span className="font-medium">{user.role || 'user'}</span>
                                  <span className="mx-1">•</span>
                                  <span>Last login: {formatDate(user.last_login)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                            {formatDate(user.last_login)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(user.last_activity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block max-w-[16rem] 2xl:max-w-[20rem] truncate align-top">
                                  {user.most_common_action || '—'}
                                </span>
                              </TooltipTrigger>
                              {user.most_common_action && (
                                <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                  <p>{user.most_common_action}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                            {user.total_activities_30d || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${activityStatus.color}`}>
                              {activityStatus.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewUserDetail(user)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * pageSize, filteredAndSortedUsers.length)}</span>{' '}
                        of <span className="font-medium">{filteredAndSortedUsers.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="rounded-l-md"
                        >
                          Previous
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded-r-md"
                        >
                          Next
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
              </TooltipProvider>
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

export default UserActivity;