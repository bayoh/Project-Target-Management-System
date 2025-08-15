import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import type { Action, User } from '../../types/project';
import { ActionDetails as ActionDetailsComponent } from '../../components/actions/ActionDetails';
import { ChevronLeft } from 'lucide-react';
import { useActivityTracking } from '../../hooks/useActivityTracking';

export function ActionDetails() {
  const { trackPageView } = useActivityTracking();
  const { id } = useParams();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackPageView('Action Details');
    loadAction();
    loadUsers();
  }, [id]);

  const loadAction = async () => {
    try {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          tasks (
            id,
            title,
            description,
            status,
            assigned_to,
            due_date
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setAction(data);
    } catch (err) {
      console.error('Error loading action:', err);
      setError('Failed to load action details');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users_view')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !action) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Action</h3>
            <p className="mt-1 text-sm text-gray-500">{error || 'Action not found'}</p>
            <div className="mt-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-3 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 w-fit"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{action.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Action Details</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ActionDetailsComponent
          action={action}
          users={users}
          onUpdate={loadAction}
        />
      </div>
    </DashboardLayout>
  );
}