import React, { useState, useEffect } from 'react';
import { Edit2, Plus, Filter, ArrowUpDown, Users, Calendar, Eye, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Action, User } from '../../types/project';
import { ActionForm } from './ActionForm';
import { supabase } from '../../lib/supabase';
import { canCreateAction, canEditAction, canDeleteAction } from '../../lib/permissions';

interface ActionListProps {
  actions: Action[];
  interventionId: string;
  onActionUpdate: () => void;
  users: User[];
}

export function ActionList({ actions, interventionId, onActionUpdate, users }: ActionListProps) {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCanCreate(canCreateAction(user));
      setCanEdit(canEditAction(user));
      setCanDelete(canDeleteAction(user));
    };
    checkPermissions();
  }, []);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [deletingAction, setDeletingAction] = useState<Action | null>(null);
  const [sortField, setSortField] = useState<'name' | 'end_date' | 'status'>('end_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  // Filter actions based on current filters
  const filteredActions = actions.filter(action => {
    if (filters.status && action.status !== filters.status) return false;
    if (filters.assignedTo && action.lead_id !== filters.assignedTo) return false;
    if (filters.dateRange.start && action.start_date && new Date(action.start_date) < new Date(filters.dateRange.start)) return false;
    if (filters.dateRange.end && action.end_date && new Date(action.end_date) > new Date(filters.dateRange.end)) return false;
    return true;
  });

  // Sort filtered actions
  const sortedActions = [...filteredActions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'end_date':
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        comparison = new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const deleteAction = async (action: Action) => {
    if (window.confirm('Are you sure you want to delete this action?')) {
      try {
        await supabase.from('actions').delete().eq('id', action.id);
        setDeletingAction(null);
        onActionUpdate();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Actions</h2>
        {canCreate && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="at_risk">At Risk</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
              Assigned To
            </label>
            <select
              id="assignedTo"
              value={filters.assignedTo}
              onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="dateStart" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="dateStart"
              value={filters.dateRange.start}
              onChange={(e) => setFilters({
                ...filters,
                dateRange: { ...filters.dateRange, start: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="dateEnd" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="dateEnd"
              value={filters.dateRange.end}
              onChange={(e) => setFilters({
                ...filters,
                dateRange: { ...filters.dateRange, end: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('end_date')}
              >
                <div className="flex items-center">
                  Due Date
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedActions.map((action) => (
              <tr key={action.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium truncate max-w-xs text-gray-900">{action.name}</div>
                  {action.description && (
                    <div className="text-sm truncate max-w-xs text-gray-500">{action.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    action.status === 'completed' ? 'bg-green-100 text-green-800' :
                    action.status === 'at_risk' ? 'bg-red-100 text-red-800' :
                    action.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {action.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {action.lead_id ? users.find(u => u.id === action.lead_id)?.full_name : 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {action.end_date ? new Date(action.end_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/interventions/${interventionId}/actions/${action.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => setEditingAction(action)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit action"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                     {canDelete && (
                      <button
                        onClick={() => deleteAction(action)}
                        className="text-red-600 hover:text-blue-900"
                        title="Delete action"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedActions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No actions found matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Action Modal */}
      {(showAddForm || editingAction) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingAction ? 'Edit Action' : 'Add New Action'}
            </h3>
            <ActionForm
              interventionId={interventionId}
              action={editingAction || undefined}
              onSuccess={() => {
                setShowAddForm(false);
                setEditingAction(null);
                onActionUpdate();
              }}
              onCancel={() => {
                setShowAddForm(false);
                setEditingAction(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}