import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import type { Action, User } from '../../types/project';
import { ActionDetails as ActionDetailsComponent } from '../../components/actions/ActionDetails';
import { ChevronLeft } from 'lucide-react';

export function ActionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          ),
          indicators (
            id,
            name,
            description,
            type,
            target_value,
            target_date,
            unit,
            indicator_reports(*)
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{action.name}</h1>
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