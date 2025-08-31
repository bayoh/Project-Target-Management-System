import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown, Calendar, Users, Target, Eye, Edit, AlertTriangle, Trophy, MessageSquare, ChevronRight, Check, CalendarCheck2,CalendarPlusIcon } from 'lucide-react';
import type { Action, Intervention } from '../../types/project';
import { useNavigate } from 'react-router-dom';
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import { useAuth } from '../../lib/auth';

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
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch issues using TanStack Query
  const { data: issues = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.projects.issues(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_issues')
        .select(`
          *,
          action:actions(name, intervention:interventions(name, id, pathway:pathways(name, id, cluster:clusters(name))))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });

  // Transform issues data into dashboard items
  const items: DashboardItem[] = useMemo(() => {
    return issues.map((issue: any) => ({
      id: issue.id,
      name: issue.name,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      date_identified: issue.date_identified,
      date_resolved: issue.date_resolved,
      resource_requirements: issue.resource_requirements,
      budget_impact: issue.budget_impact,
      action_id: issue.action_id,
      action: issue.action
    }));
  }, [issues]);

  // Calculate metrics
  const metrics = useMemo(() => ({
    total: items.length,
    bySeverity: {
      high: items.filter(item => item.severity === 'high').length,
      medium: items.filter(item => item.severity === 'medium').length,
      low: items.filter(item => item.severity === 'low').length
    },
    byStatus: {
      open: items.filter(item => item.status === 'open').length,
      in_progress: items.filter(item => item.status === 'in_progress').length,
      resolved: items.filter(item => item.status === 'resolved').length,
      closed: items.filter(item => item.status === 'closed').length
    }
  }), [items]);

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
      className={`${bgColor} p-3 md:p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out flex flex-col items-center justify-center min-h-[100px] md:min-h-[120px] w-full text-left border border-gray-200 ${onClick ? 'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50' : 'cursor-default'} ${isActive ? 'ring-2 ring-blue-600 ring-offset-1 bg-blue-50 border-blue-300' : 'hover:border-gray-300'}`}
    >
      {isActive && (
        <div className="absolute top-1.5 right-1.5 p-0.5 bg-blue-600 rounded-full">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      <div className="mb-2">{icon}</div>
      <div className={`text-xl md:text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs md:text-sm text-gray-600 mt-1 font-medium text-center leading-tight">{title}</div>
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
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out p-4 md:p-5 space-y-3 border border-gray-200 hover:border-gray-300 transform hover:-translate-y-0.5">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getSeverityPillClasses(item.severity)}`}>
              <AlertTriangle className={`w-3 h-3 mr-1 ${item.severity === 'high' ? 'text-red-500' : item.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
            </span>
            {item.action && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                {item.action.intervention?.pathway.cluster.name || 'N/A Intervention'}
              </span>
            )}
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusPillClasses(item.status)} flex-shrink-0`}>
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
        
        <div className="space-y-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 leading-tight">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>
        
        <div className="border-t border-gray-100 pt-3 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-500 gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <CalendarPlusIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span className="font-medium">Identified:</span>
                <span className="ml-1">{formatDate(item.date_identified)}</span>
              </div>
              {item.date_resolved && (
                <div className="flex items-center">
                  <CalendarCheck2 className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                  <span className="font-medium">Resolved:</span>
                  <span className="ml-1">{formatDate(item.date_resolved)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/interventions/${item.action.intervention.id}/actions/${item.action_id}#issues`)}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium px-2.5 py-1.5 rounded-md hover:bg-blue-50 text-xs border border-blue-200 hover:border-blue-300"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
      
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [items, searchQuery, statusFilter, severityFilter]);



  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-lg shadow-md border border-gray-200 mx-4 md:mx-6">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-sm text-gray-600 font-medium">Loading issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200 mx-4 md:mx-6">
        <div className="p-3 bg-red-100 rounded-lg w-fit mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Error Loading Issues</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">{(error as Error).message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <header className="mb-4 lg:mb-6">
        <div className="flex items-center gap-2 lg:gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl lg:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Issue Registry</h1>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm md:text-base">Track, manage, and resolve project issues effectively.</p>
      </header>

      {/* Metrics Section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 lg:mb-6">
          <MetricCard
            title="Total Issues"
            value={metrics.total}
            icon={<div className="p-2 bg-blue-100 rounded-lg"><MessageSquare className="w-4 h-4 text-blue-600" /></div>}
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
            icon={<div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-600" /></div>}
            colorClass="text-red-600"
            bgColor="bg-white"
            onClick={() => setSeverityFilter('high')}
            isActive={severityFilter === 'high'}
          />
          <MetricCard
            title="Open Issues"
            value={metrics.byStatus.open}
            icon={<div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-4 h-4 text-orange-600" /></div>}
            colorClass="text-orange-600"
            bgColor="bg-white"
            onClick={() => setStatusFilter('open')}
            isActive={statusFilter === 'open'}
          />
          <MetricCard
            title="Resolved/Closed"
            value={metrics.byStatus.resolved + metrics.byStatus.closed}
            icon={<div className="p-2 bg-teal-100 rounded-lg"><Trophy className="w-4 h-4 text-teal-600" /></div>}
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
      <section className="mb-4 lg:mb-6 p-3 sm:p-4 md:p-5 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="w-1 h-4 bg-gray-600 rounded-full"></div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-end">
          <div className="sm:col-span-2 md:col-span-1">
            <label htmlFor="search-issues" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Search Issues</label>
            <Input
              id="search-issues"
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm shadow-sm rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 h-8 sm:h-9"
            />
          </div>
          <div>
            <label htmlFor="severity-filter" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Severity</label>
            <Select
              value={severityFilter}
              onValueChange={(value) => setSeverityFilter(value)}
              placeholder="All Severities"
              options={[
                { value: 'all', label: 'All Severities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              className="w-full text-xs sm:text-sm h-8 sm:h-9"
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
              placeholder="All Statuses"
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'on_track', label: 'On Track' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              className="w-full text-xs sm:text-sm h-8 sm:h-9"
            />
          </div>
        </div>
      </section>

      {/* Issues Grid Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-1 h-5 bg-gray-600 rounded-full"></div>
            Issue List 
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md">({filteredItems.length} found)</span>
          </h2>
        </div>
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            {filteredItems.map((item) => (
              <IssueCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200 mt-4">
            <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">No Issues Found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              There are no issues matching your current filters. Try adjusting your search or filter criteria, or check back later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}