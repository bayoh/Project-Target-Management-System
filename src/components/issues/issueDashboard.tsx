import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown, Calendar, Users, Target, Eye, Edit, AlertTriangle, Trophy, MessageSquare, ChevronRight } from 'lucide-react';
import type { Action, Intervention } from '../../types/project';
import { useNavigate } from 'react-router-dom';
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'

interface DashboardItem {
  id: string;
  name: string;
  description: string | null;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  start_date: string | null;
  end_date: string | null;
  action_id: string;
  action: {
    name: string;
    intervention: {
      name: string;
    };
  };
}

export function IssueDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState({
    total: 0,
    bySeverity: { high: 0, medium: 0, low: 0 },
    byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 }
  });

  useEffect(() => {
    loadUserItems();
  }, []);

  const loadUserItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
  
      const { data: issues, error: issuesError } = await supabase
        .from('action_issues')
        .select(`
          *,
          action:actions(name, intervention:interventions(name))
        `)
        .order('created_at', { ascending: false });
  
      if (issuesError) throw issuesError;

      const dashboardItems = issues.map(issue => ({
        id: issue.id,
        name: issue.name,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        start_date: issue.start_date,
        end_date: issue.end_date,
        action_id: issue.action_id,
        action: issue.action
      }));

      // Calculate metrics
      const metrics = {
        total: dashboardItems.length,
        bySeverity: {
          high: dashboardItems.filter(item => item.severity === 'high').length,
          medium: dashboardItems.filter(item => item.severity === 'medium').length,
          low: dashboardItems.filter(item => item.severity === 'low').length
        },
        byStatus: {
          open: dashboardItems.filter(item => item.status === 'open').length,
          in_progress: dashboardItems.filter(item => item.status === 'in_progress').length,
          resolved: dashboardItems.filter(item => item.status === 'resolved').length,
          closed: dashboardItems.filter(item => item.status === 'closed').length
        }
      };

      setMetrics(metrics);
  
      // Transform data into unified format with relationships
      // const dashboardItems: DashboardItem[] = [
      //   ...(issues || []).map(item => ({
      //     ...item,
      //     type: 'issues' as const,
      //     role: 'lead' as const,
      //     relatedActions: (actions || [])
      //       .filter(action => action.intervention_id === item.id)
      //       .map(action => ({
      //         ...action,
      //         type: 'action' as const,
      //         role: action.lead_id === user.id ? 'lead' as const : 'supporting' as const
      //       }))
      //   })),
      //   ...(actions || [])
      //     .filter(action => !interventions?.some(int => int.id === action.intervention_id))
      //     .map(item => ({
      //       ...item,
      //       type: 'action' as const,
      //       role: item.lead_id === user.id ? 'lead' as const : 'supporting' as const
      //     }))
      // ];
  
      setItems(dashboardItems);
    } catch (err: any) {
      console.error('Error loading dashboard items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
    const matchesSearch = searchQuery === '' || 
      (item.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Issue Registry</h2>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <div className="text-md text-gray-700">Total Issues</div>
          <div className="text-2xl font-bold">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <div className="text-md text-gray-700">High Severity</div>
          <div className="text-2xl font-bold text-red-600">{metrics.bySeverity.high}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <div className="text-md text-gray-700">Open Issues</div>
          <div className="text-2xl font-bold text-yellow-600">{metrics.byStatus.open}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <div className="text-md text-gray-700">Resolved Issues</div>
          <div className="text-2xl font-bold text-green-600">{metrics.byStatus.resolved + metrics.byStatus.closed}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          {/* <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h- rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          /> */}
          <Input
          type="textarea"
          placeholder="Search issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          // className="w-full h- rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <Select
        value={severityFilter}
        onChange={(value) => setSeverityFilter(value)}
        placeholder="Select Severity"
        options={[
          { value: 'all', label: 'All Severities' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ]}  
        
        
        />
        
        {/* <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select> */}
        <Select
        value={statusFilter}
        onChange={(value) => setStatusFilter(value)}
        placeholder="Select Status"
        options={[
          { value: 'all', label: 'All Statuses' },
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' }, 
        ]} 

        />

        {/* <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md p-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="intervention">Interventions</option>
          <option value="action">Actions</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md p-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Roles</option>
          <option value="lead">Lead</option>
          <option value="supporting">Supporting</option>
        </select> */}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredItems.map((item) => (
          <div key={`${item.type}-${item.id}`}>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.severity === 'high' ? 'bg-red-100 text-red-800' : item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} Severity
                  </span>
                  {item.action && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {item.action.intervention?.name || 'No Intervention'}
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'closed' || item.status === 'resolved' ? 'bg-green-100 text-green-800' : item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {item.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>

              <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDate(item.start_date)} - {formatDate(item.end_date)}</span>
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/edit`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          
            {/* {item.relatedActions && item.relatedActions.length > 0 && (
              <div className="mt-2 ml-8 space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200">
                {item.relatedActions.map((action: any) => (
                  <div
                    key={`action-${action?.id}`}
                    className="bg-white rounded-lg shadow-sm p-4 space-y-3 relative before:absolute before:left-[-1rem] before:top-1/2 before:w-4 before:h-0.5 before:bg-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Action
                        </span>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {action.role === 'lead' ? 'Lead' : 'Supporting'}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.status === 'completed' ? 'bg-green-100 text-green-800' : action.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : action.status === 'at_risk' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {action.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </div>
  
                    <h4 className="text-md font-medium text-gray-900">{action.name}</h4>
                    {action.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{action.description}</p>
                    )}
  
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{formatDate(action.start_date)} - {formatDate(action.end_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2 ml-auto">
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}/edit`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}#issues`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Issues"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}#achievements`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Achievements"
                  >
                    <Trophy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}#targets`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Targets"
                  >
                    <Target className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/${item.type}s/${item.id}/actions/${action.id}#comments`)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Comments"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
                    </div>
                  </div>
                ))}
              </div>
            )} */}
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-sm font-medium text-gray-900">No issues found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filter criteria
          </p>
        </div>
      )}
    </div>
  );
}