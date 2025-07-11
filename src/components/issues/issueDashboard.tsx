import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown, Calendar, Users, Target, Eye, Edit, AlertTriangle, Trophy, MessageSquare, ChevronRight, Check, CalendarCheck2,CalendarPlusIcon } from 'lucide-react';
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
  date_identified: string | null;
  date_resolved: string | null;
  resource_requirements: string | null;
  budget_impact: number | null;
  action_id: string;
  action: {
    name: string;
    intervention: {
      name: string;
      id: string;
      pathway: {
        name: string;
        id: string;
        cluster: {
          name: string;
        };
      };
    };
  };
}

// Helper function to format dates, can be moved to a utils file if used elsewhere
const formatDate = (date: string | null) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

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

  // Card component for metrics
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    colorClass?: string;
    bgColor?: string;
    onClick?: () => void;
    isActive?: boolean;
  }> = ({ title, value, icon, colorClass = 'text-gray-800', bgColor = 'bg-white', onClick, isActive }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${bgColor} p-5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col items-center justify-center min-h-[150px] w-full text-left ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50' : 'cursor-default'} ${isActive ? 'ring-2 ring-blue-600 ring-offset-2 shadow-blue-200' : ''}`}
    >
      {isActive && (
        <div className="absolute top-2 right-2 p-1 bg-blue-600 rounded-full">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="p-3 rounded-full bg-opacity-20 mb-3">{icon}</div>
      <div className={`text-3xl font-extrabold ${colorClass}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1 font-medium tracking-wide">{title}</div>
    </button>
  );

  // Enhanced Issue Card
  const IssueCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
    const getSeverityPillClasses = (severity: string) => {
      switch (severity) {
        case 'high': return 'bg-red-100 text-red-700 border-red-300';
        case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'low': return 'bg-green-100 text-green-700 border-green-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    };

    const getStatusPillClasses = (status: string) => {
      switch (status) {
        case 'open': return 'bg-orange-100 text-orange-700 border-orange-300';
        case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'resolved': return 'bg-teal-100 text-teal-700 border-teal-300';
        case 'closed': return 'bg-gray-200 text-gray-600 border-gray-400';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out p-6 space-y-4 transform hover:-translate-y-1">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityPillClasses(item.severity)}`}>
              <AlertTriangle className={`w-3 h-3 mr-1.5 ${item.severity === 'high' ? 'text-red-500' : item.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
            </span>
            {item.action && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                {item.action.intervention?.pathway.cluster.name || 'N/A Intervention'}
              </span>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusPillClasses(item.status)}`}>
            {item.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
        </div>

        {/* <h3 
          className="text-xl font-semibold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer group"
          onClick={() => navigate(`/issues/${item.id}`)}
        >
          {item.name}
          <ChevronRight className="w-5 h-5 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </h3> */}
        
        {item.description && (
          <p className="text-md text-gray-600 line-clamp-3 leading-relaxed">{item.description}</p>
        )}
        <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <div className="flex items-center text-gray-500">
            <CalendarPlusIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{formatDate(item.date_identified)}</span>
          </div>
          {item.date_resolved && <div className="flex items-center text-gray-500">
            <CalendarCheck2 className="h-4 w-4 mr-2 text-gray-400" />
            <span>{formatDate(item.date_resolved)}</span>
          </div>}
          <div className="flex items-center space-x-3">

            <button
              onClick={() => navigate(`/interventions/${item.action.intervention.id}/actions/${item.action_id}#issues`)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors font-medium px-3 py-1.5 rounded-md hover:bg-gray-100"
              title="Edit"
            >
              <Eye className="h-4 w-4 mr-1.5" /> View
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          action:actions(name, intervention:interventions(name, id, pathway:pathways(name, id, cluster:clusters(name))))
        `)
        .order('created_at', { ascending: false });
  
      if (issuesError) throw issuesError;

      const dashboardItems = issues.map(issue => ({
        id: issue.id,
        name: issue.name,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        date_identified: issue.date_identified,
        date_resolved: issue.date_resolved,
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
      console.log('Dashboard items loaded:', dashboardItems);
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg font-medium text-gray-700">Loading issues dashboard...</p>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] bg-red-50 p-6 rounded-lg shadow-md">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-2xl font-semibold text-red-700 mb-2">Oops! Something Went Wrong</h3>
        <p className="text-red-600 text-center mb-6 max-w-md">We encountered an error while trying to load the issue data: <br /><strong>{error}</strong></p>
        <button 
          onClick={loadUserItems} 
          className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">Issue Registry</h1>
        <p className="text-gray-600 mt-1">Track, manage, and resolve project issues effectively.</p>
      </header>

      {/* Metrics Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard
            title="Total Issues"
            value={metrics.total}
            icon={<MessageSquare className="w-8 h-8 text-blue-500 bg-blue-100 p-1.5 rounded-full" />}
            colorClass="text-blue-600"
            bgColor="bg-white"
            onClick={() => {
              setSeverityFilter('all');
              setStatusFilter('all');
            }}
            isActive={severityFilter === 'all' && statusFilter === 'all'}
          />
          <MetricCard
            title="High Severity"
            value={metrics.bySeverity.high}
            icon={<AlertTriangle className="w-8 h-8 text-red-500 bg-red-100 p-1.5 rounded-full" />}
            colorClass="text-red-600"
            bgColor="bg-white"
            onClick={() => setSeverityFilter('high')}
            isActive={severityFilter === 'high'}
          />
          <MetricCard
            title="Open Issues"
            value={metrics.byStatus.open}
            icon={<AlertTriangle className="w-8 h-8 text-orange-500 bg-orange-100 p-1.5 rounded-full" />}
            colorClass="text-orange-600"
            bgColor="bg-white"
            onClick={() => setStatusFilter('open')}
            isActive={statusFilter === 'open'}
          />
          <MetricCard
            title="Resolved/Closed"
            value={metrics.byStatus.resolved + metrics.byStatus.closed}
            icon={<Trophy className="w-8 h-8 text-teal-500 bg-teal-100 p-1.5 rounded-full" />}
            colorClass="text-teal-600"
            bgColor="bg-white"
            onClick={() => {
              setStatusFilter('resolved'); 
            }}
            isActive={statusFilter === 'resolved' || statusFilter === 'closed'}
          />
        </div>
      </section>

      {/* Filters and Search Section */}
      <section className="mb-8 p-6 bg-white rounded-xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-1">
            <label htmlFor="search-issues" className="block text-sm font-medium text-gray-700 mb-1.5">Search Issues</label>
            <Input
              id="search-issues"
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm shadow-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 mb-1.5">Filter by Severity</label>
            <Select
              id="severity-filter"
              value={severityFilter}
              onChange={(value) => setSeverityFilter(value)}
              placeholder="All Severities"
              options={[
                { value: 'all', label: 'All Severities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1.5">Filter by Status</label>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              placeholder="All Statuses"
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              className="w-full text-sm"
            />
          </div>
        </div>
      </section>

      {/* Issues Grid Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
                Issue List <span className="text-base font-normal text-gray-500">({filteredItems.length} found)</span>
            </h2>
        </div>
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <IssueCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg mt-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-800">No Issues Found</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              There are no issues matching your current filters. Try adjusting your search or filter criteria, or check back later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}