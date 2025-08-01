import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Clock, User, FileText, Activity, Download } from 'lucide-react';

interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
}

interface UserActivityDetailProps {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserActivityDetail: React.FC<UserActivityDetailProps> = ({
  userId,
  userName,
  userEmail,
  isOpen,
  onClose
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserActivities();
    }
  }, [isOpen, userId, dateRange, entityFilter, actionFilter, currentPage]);

  const fetchUserActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      let query = supabase
        .from('user_activity_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (entityFilter) {
        query = query.eq('entity_type', entityFilter);
      }

      if (actionFilter) {
        query = query.eq('action_type', actionFilter);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setActivities(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching user activities:', err);
      setError('Failed to load user activities');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string, entityType?: string) => {
    if (actionType === 'view' && entityType === 'navigation') {
      return <Activity className="h-4 w-4 text-purple-500" />;
    }
    
    switch (actionType) {
      case 'login':
        return <User className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <User className="h-4 w-4 text-red-500" />;
      case 'create':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'update':
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case 'delete':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'view':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (actionType: string, entityType?: string) => {
    if (actionType === 'view' && entityType === 'navigation') {
      return 'bg-purple-100 text-purple-800';
    }
    
    switch (actionType) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-red-100 text-red-800';
      case 'create':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  const exportUserActivities = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].join(','),
      ...activities.map(activity => [
        activity.timestamp,
        activity.action_type,
        activity.entity_type || '',
        activity.entity_id || '',
        activity.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-${userName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Activity Details</h2>
            <p className="text-gray-600 mt-1">
              {userName} ({userEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Entities</option>
                <option value="navigation">Navigation</option>
                <option value="cluster">Cluster</option>
                <option value="pathway">Pathway</option>
                <option value="intervention">Intervention</option>
                <option value="action">Action</option>
                <option value="task">Task</option>
                <option value="indicator">Indicator</option>
                <option value="indicator_report">Indicator Report</option>
                <option value="user">User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportUserActivities}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading activities...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchUserActivities}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activities found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Activity Timeline */}
              <div className="relative">
                {activities.map((activity, index) => {
                  const { date, time } = formatTimestamp(activity.timestamp);
                  const isLast = index === activities.length - 1;

                  return (
                    <div key={activity.id} className="relative flex items-start space-x-4 pb-6">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                      )}

                      {/* Activity icon */}
                      <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                        {getActionIcon(activity.action_type, activity.entity_type)}
                      </div>

                      {/* Activity content */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(activity.action_type, activity.entity_type)}`}>
                                {activity.action_type.toUpperCase()}
                              </span>
                              {activity.entity_type && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                  {activity.entity_type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {date}
                              <Clock className="h-4 w-4 ml-3 mr-1" />
                              {time}
                            </div>
                          </div>

                          <div className="text-sm text-gray-700">
                            <p className="font-medium">
                              {activity.action_type === 'login' && 'User logged in'}
                              {activity.action_type === 'logout' && 'User logged out'}
                              {activity.action_type === 'create' && `Created ${activity.entity_type || 'item'}`}
                              {activity.action_type === 'update' && `Updated ${activity.entity_type || 'item'}`}
                              {activity.action_type === 'delete' && `Deleted ${activity.entity_type || 'item'}`}
                              {activity.action_type === 'view' && activity.entity_type === 'navigation' && activity.metadata?.page_name && `Navigated to ${activity.metadata.page_name}`}
                              {activity.action_type === 'view' && activity.entity_type !== 'navigation' && `Viewed ${activity.entity_type || 'item'}`}
                              {activity.entity_id && ` (ID: ${activity.entity_id.substring(0, 8)}...)`}
                            </p>
                            
                            {activity.ip_address && (
                              <p className="text-gray-500 mt-1">
                                IP: {activity.ip_address}
                              </p>
                            )}
                            
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View metadata
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} activities
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityDetail;