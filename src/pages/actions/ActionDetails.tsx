import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useActionDetail, useUsers } from '../../hooks/useActionQueries';
import { queryKeys } from '../../lib/queryKeys';
import { ActionDetails as ActionDetailsComponent } from '../../components/actions/ActionDetails';
import { ChevronLeft } from 'lucide-react';

export function ActionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { trackPageView } = useActivityTracking();
  
  // Use TanStack Query hooks for data fetching
  const { data: action, isLoading: actionLoading, error: actionError } = useActionDetail(id);
  const { data: users = [], isLoading: usersLoading } = useUsers();
  
  const loading = actionLoading || usersLoading;
  const error = actionError ? 'Failed to load action details' : null;

  // Track page view when action data is loaded
  React.useEffect(() => {
    if (action && id) {
      trackPageView('Action Details');
    }
  }, [action, id, trackPageView]);
  
  // Handle data refresh
  const handleUpdate = () => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !action) {
    return (
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pt-8">
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
          onUpdate={handleUpdate}
        />
    </div>
  );
}