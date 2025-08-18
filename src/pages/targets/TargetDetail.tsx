import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock
} from 'lucide-react';

import { useTargetDetail, useTargetHistory, useDeleteTarget } from '../../hooks/useTargetQueries';

export default function TargetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use hooks instead of direct Supabase calls
  const { data: target, isLoading: targetLoading, error: targetError } = useTargetDetail(id || '');
  const { data: history = [], isLoading: historyLoading } = useTargetHistory(id || '');
  const deleteTargetMutation = useDeleteTarget();
  
  const loading = targetLoading || historyLoading;
  const error = targetError ? (targetError instanceof Error ? targetError.message : 'Unknown error') : null;
  
  const handleDelete = async () => {
    if (!target) return;
    
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    
    try {
      await deleteTargetMutation.mutateAsync(target.id);
      navigate('/targets/tracking');
    } catch (err: unknown) {
      console.error('Error deleting target:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error deleting target: ${message}`);
    }
  };
  
  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100); // Cap at 100%
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getProgressIcon = (progress: number) => {
    if (progress >= 100) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (progress >= 50) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const isJobTarget = (t: typeof target) => t?.category === 'jobs';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error || !target) {
    return (
      <div className="container mx-auto px-4 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Metric Details
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {error || 'The requested metric could not be found or you do not have permission to view it.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/targets/tracking')} 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Targets
          </button>
        </div>
    );
  }
  
  const progress = calculateProgress(target.current_value, target.target_value);
  const progressColor = getProgressColor(progress);
  const progressIcon = getProgressIcon(progress);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/targets')} 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Metrics
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Target Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 col-span-2">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">Metric Information</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                title="Delete Metric"
                disabled={deleteTargetMutation.isPending}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Metric</h4>
              <p className="text-base">{target.metric}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
              <p className="text-base">{target.category ? (target.category === 'jobs' ? 'Jobs' : target.category) : 'General'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Baseline Value</h4>
              <p className="text-base">{target.baseline_value.toLocaleString()}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Target Value</h4>
              <p className="text-base">{target.target_value.toLocaleString()}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Current Value</h4>
              <p className="text-base">{target.current_value.toLocaleString()}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
              <p className="text-base">{new Date(target.last_updated).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Summary</h3>
          <div className="flex items-center space-x-3">
            {progressIcon}
            <div>
              <div className="text-sm text-gray-500">Completion</div>
              <div className="text-lg font-semibold">{progress.toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${progress}%` }}></div>
          </div>
          
          {isJobTarget(target) && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-gray-500">Job Target Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Women</div>
                  <div className="text-lg font-semibold">{(target.women_current ?? 0).toLocaleString()} / {(target.women_target ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Youth</div>
                  <div className="text-lg font-semibold">{(target.youth_current ?? 0).toLocaleString()} / {(target.youth_target ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Update History</h3>
        {history.length === 0 ? (
          <div className="text-sm text-gray-500">No history available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Value
                  </th>
                  {isJobTarget(target) && (
                    <>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Women
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Youth
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.changed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.changed_by?.full_name || item.user?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(item.previous_current_value ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(item.new_current_value ?? 0).toLocaleString()}
                    </td>
                    {isJobTarget(target) && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.women_previous_value?.toLocaleString() || 0} → {item.women_new_value?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.youth_previous_value?.toLocaleString() || 0} → {item.youth_new_value?.toLocaleString() || 0}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

  