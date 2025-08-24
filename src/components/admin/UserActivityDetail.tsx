import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Clock, User, FileText, Activity, Download, ArrowRight } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/button';
import { Select } from '../ui/Select';

interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  activity_timestamp: string;
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
        .gte('activity_timestamp', startDate.toISOString())
        .lte('activity_timestamp', endDate.toISOString())
        .order('activity_timestamp', { ascending: false })
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

  // Format any value (primitive or object) for display
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  // Extract change entries from diverse metadata shapes
  const extractChanges = (metadata: any): Array<{ field: string; before: any; after: any }> => {
    const changes: Array<{ field: string; before: any; after: any }> = [];
    if (!metadata || typeof metadata !== 'object') return changes;

    // 1) Prefer explicit metadata.changes
    const metaChanges = metadata.changes;
    if (metaChanges && typeof metaChanges === 'object') {
      Object.entries(metaChanges).forEach(([field, changeVal]) => {
        if (Array.isArray(changeVal) && changeVal.length === 2) {
          changes.push({ field, before: changeVal[0], after: changeVal[1] });
        } else if (changeVal && typeof changeVal === 'object') {
          const beforeKey = ['previous', 'before', 'old', 'old_value', 'from', 'prev', 'previous_value'].find(k => k in (changeVal as any));
          const afterKey = ['new', 'after', 'current', 'new_value', 'to', 'next'].find(k => k in (changeVal as any));
          if (beforeKey || afterKey) {
            changes.push({ field, before: (changeVal as any)[beforeKey as string], after: (changeVal as any)[afterKey as string] });
          }
        }
      });
    }

    // 2) Fallback: match key pairs like women_previous_value / women_new_value, youth_previous_value / youth_new_value, etc.
    const prevPattern = /^(.*)_(previous|old|before)(?:_value)?$/;
    const nextPattern = /^(.*)_(new|after|current)(?:_value)?$/;
    const seenFields = new Set(changes.map(c => c.field));

    const prevMap: Record<string, any> = {};
    const nextMap: Record<string, any> = {};

    Object.entries(metadata).forEach(([k, v]) => {
      const pm = k.match(prevPattern);
      const nm = k.match(nextPattern);
      if (pm) prevMap[pm[1]] = v;
      if (nm) nextMap[nm[1]] = v;
    });

    Object.keys({ ...prevMap, ...nextMap }).forEach(base => {
      if (seenFields.has(base)) return;
      if (prevMap[base] !== undefined || nextMap[base] !== undefined) {
        changes.push({ field: base, before: prevMap[base], after: nextMap[base] });
      }
    });

    return changes;
  };

  const exportUserActivities = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].join(','),
      ...activities.map(activity => [
        activity.activity_timestamp,
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

  // Options for Select components
  const dateRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '365', label: 'Last year' },
  ];

  const entityOptions = [
    { value: '', label: 'All Entities' },
    { value: 'navigation', label: 'Navigation' },
    { value: 'cluster', label: 'Cluster' },
    { value: 'pathway', label: 'Pathway' },
    { value: 'intervention', label: 'Intervention' },
    { value: 'action', label: 'Action' },
    { value: 'task', label: 'Task' },
    { value: 'indicator', label: 'Indicator' },
    { value: 'indicator_report', label: 'Indicator Report' },
    { value: 'user', label: 'User' },
  ];

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'view', label: 'View' },
  ];

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      overlayClassName="p-4"
    >
      <ModalContent className="flex min-h-0 flex-col -m-6">
        {/* Header */}
        <ModalHeader className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <ModalTitle className="text-2xl">User Activity Details</ModalTitle>
            <ModalDescription className="mt-1">
              {userName} ({userEmail})
            </ModalDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </ModalHeader>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <Select
                options={dateRangeOptions}
                value={dateRange}
                onChange={(v) => { setDateRange(String(v)); setCurrentPage(1); }}
                className="w-full"
                sortable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <Select
                options={entityOptions}
                value={entityFilter}
                onChange={(v) => { setEntityFilter(String(v)); setCurrentPage(1); }}
                className="w-full"
                allowClear
                searchable
                sortable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <Select
                options={actionOptions}
                value={actionFilter}
                onChange={(v) => { setActionFilter(String(v)); setCurrentPage(1); }}
                className="w-full"
                allowClear
                searchable
                sortable
              />
            </div>

            <div className="flex items-end">
              <Button onClick={exportUserActivities} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
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
              <Button onClick={fetchUserActivities}>Retry</Button>
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
                  const { date, time } = formatTimestamp(activity.activity_timestamp);
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

                            {/* Detailed change history for updates */}
                            {activity.action_type === 'update' && (
                              (() => {
                                const changeEntries = extractChanges(activity.metadata);
                                if (changeEntries.length === 0) return null;
                                return (
                                  <div className="mt-3">
                                    <p className="text-sm font-semibold text-gray-800">Changes</p>
                                    <div className="mt-2 space-y-2">
                                      {changeEntries.map((ch, idx) => (
                                        <div key={idx} className="rounded-md border border-gray-200 p-2 bg-gray-50">
                                          <div className="text-xs font-medium text-gray-600 mb-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{ch.field}</span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-start gap-2">
                                            <pre className="whitespace-pre-wrap break-words text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 overflow-auto max-h-32">
                                              {formatValue(ch.before)}
                                            </pre>
                                            <div className="hidden sm:flex items-center justify-center text-gray-500">
                                              <ArrowRight className="w-4 h-4" />
                                            </div>
                                            <pre className="whitespace-pre-wrap break-words text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 overflow-auto max-h-32">
                                              {formatValue(ch.after)}
                                            </pre>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                            
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View raw metadata
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
          <ModalFooter className="border-t border-gray-200 px-6 py-4 bg-gray-50 sticky bottom-0">
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} activities
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UserActivityDetail;