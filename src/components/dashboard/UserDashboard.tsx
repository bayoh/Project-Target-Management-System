import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown, Calendar, Users, Target, Eye, Edit, AlertTriangle, Trophy, MessageSquare, ChevronRight } from 'lucide-react';
import type { Action, Intervention } from '../../types/project';
import { useNavigate } from 'react-router-dom';

interface DashboardItem {
  id: string;
  type: 'intervention' | 'action';
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  role: 'lead' | 'supporting';
}

export function UserDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    loadUserItems();
  }, []);

  const loadUserItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
  
      // Fetch interventions where user is lead
      const { data: interventions, error: interventionsError } = await supabase
        .from('interventions')
        .select('id, name, description, status, start_date, end_date')
        .eq('lead_id', user.id);
  
      if (interventionsError) throw interventionsError;
  
      // Fetch actions with intervention details where user is lead or supporting staff
      const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('id, name, description, status, start_date, end_date, lead_id, supporting_staff, intervention_id, intervention:interventions(id, name)')
        .or(`lead_id.eq.${user.id},supporting_staff.cs.{${user.id}}`);
  
      if (actionsError) throw actionsError;
  
      // Transform data into unified format with relationships
      const dashboardItems: DashboardItem[] = [
        ...(interventions || []).map(item => ({
          ...item,
          type: 'intervention' as const,
          role: 'lead' as const,
          relatedActions: (actions || [])
            .filter(action => action.intervention_id === item.id)
            .map(action => ({
              ...action,
              type: 'action' as const,
              role: action.lead_id === user.id ? 'lead' as const : 'supporting' as const
            }))
        })),
        ...(actions || [])
          .filter(action => !interventions?.some(int => int.id === action.intervention_id))
          .map(item => ({
            ...item,
            type: 'action' as const,
            role: item.lead_id === user.id ? 'lead' as const : 'supporting' as const
          }))
      ];
  
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
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    return matchesStatus && matchesType && matchesRole;
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
        <h2 className="text-2xl font-bold text-gray-900">My Dashboard</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md p-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="at_risk">At Risk</option>
        </select>

        <select
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
        </select>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredItems.map((item) => (
          <div key={`${item.type}-${item.id}`}>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.type === 'intervention' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {item.type === 'intervention' ? 'Intervention' : 'Action'}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.role === 'lead' ? 'Lead' : 'Supporting'}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'completed' ? 'bg-green-100 text-green-800' : item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : item.status === 'at_risk' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
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

            {/* Related Actions */}
            {'relatedActions' in item && item.relatedActions && item.relatedActions.length > 0 && (
              <div className="mt-2 ml-8 space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200">
                {item.relatedActions.map((action) => (
                  <div
                    key={`action-${action.id}`}
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
            )}
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filter criteria
          </p>
        </div>
      )}
    </div>
  );
}