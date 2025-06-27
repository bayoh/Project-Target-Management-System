import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Target, 
  ArrowLeft, 
  FileEdit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
// import { PageHeader } from '../../components/layout/PageHeader';

interface TargetDetail {
  id: string;
  description: string;
  metric: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  last_updated: string;
  category?: string;
  women_target?: number;
  women_current?: number;
  youth_target?: number;
  youth_current?: number;
  created_at: string;
  action?: {
    id: string;
    name: string;
    intervention?: {
      id: string;
      name: string;
      pathway?: {
        id: string;
        name: string;
        cluster?: {
          id: string;
          name: string;
        }
      }
    }
  };
}

interface TargetHistory {
  id: string;
  target_id: string;
  previous_target_value: number;
  new_target_value: number;
  previous_baseline_value?: number;
  new_baseline_value?: number;
  previous_current_value?: number;
  new_current_value?: number;
  women_previous_value?: number;
  women_new_value?: number;
  youth_previous_value?: number;
  youth_new_value?: number;
  changed_at: string;
  changed_by: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export default function TargetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [target, setTarget] = useState<TargetDetail | null>(null);
  const [history, setHistory] = useState<TargetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateValue, setUpdateValue] = useState('');
  const [updateWomenValue, setUpdateWomenValue] = useState('');
  const [updateYouthValue, setUpdateYouthValue] = useState('');
  const [updatingLoading, setUpdatingLoading] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadTarget(id);
      loadTargetHistory(id);
    }
  }, [id]);
  
  const loadTarget = async (targetId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('action_targets')
        .select(`
          *,
          action:actions(
            id,
            name,
            intervention:interventions(
              id,
              name,
              pathway:pathways(
                id,
                name,
                cluster:clusters(
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('id', targetId)
        .single();

      if (error) throw error;
      
      setTarget(data);
    } catch (err: any) {
      console.error('Error loading target:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTargetHistory = async (targetId: string) => {
    try {
      const { data, error } = await supabase
        .from('target_history')
        .select(`*, changed_by:profiles(full_name)`)
        .eq('target_id', targetId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      
      setHistory(data || []);
      console.log(data)
    } catch (err: any) {
      console.error('Error loading target history:', err);
    }
  };
  
  const handleEdit = () => {
    if (target) {
      navigate(`/targets/edit/${target.id}`);
    }
  };
  
  const handleDelete = async () => {
    if (!target) return;
    
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    
    try {
      const { error } = await supabase
        .from('action_targets')
        .delete()
        .eq('id', target.id);

      if (error) throw error;
      
      navigate('/targets/tracking');
    } catch (err: any) {
      console.error('Error deleting target:', err);
      alert(`Error deleting target: ${err.message}`);
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
  
  const isJobTarget = (target: TargetDetail) => {
    return target.category === 'jobs';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (error || !target) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="block sm:inline">{error || 'Metric not found'}</span>
          </div>
          <button 
            onClick={() => navigate('/targets/tracking')} 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Targets
          </button>
        </div>
      </div>
    );
  }
  
  const progress = calculateProgress(target.current_value, target.target_value);
  const progressColor = getProgressColor(progress);
  const progressIcon = getProgressIcon(progress);
  
  return (
    <DashboardLayout>
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
      
      {/* <PageHeader
        title={target.description}
        description={`Target tracking for ${target.metric}`}
        icon={<Target className="h-8 w-8" />}
      /> */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Target Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 col-span-2">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">Metric Information</h3>
            <div className="flex space-x-2">
              {/* <button
                onClick={handleEdit}
                className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                title="Edit Target"
              >
                <FileEdit className="h-5 w-5" />
              </button> */}
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                title="Delete Metric"
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
              <p className="text-base">{formatDate(target.last_updated)}</p>
            </div>
            
            {isJobTarget(target) && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Women Target</h4>
                  <p className="text-base">{target.women_target?.toLocaleString() || 0}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Women Current</h4>
                  <p className="text-base">{target.women_current?.toLocaleString() || 0}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Youth Target</h4>
                  <p className="text-base">{target.youth_target?.toLocaleString() || 0}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Youth Current</h4>
                  <p className="text-base">{target.youth_current?.toLocaleString() || 0}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-8">
            <h4 className="text-sm font-medium text-gray-500 mb-3">Progress</h4>
            <div className="flex items-center mb-2">
              <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                <div 
                  className={`h-4 rounded-full ${progressColor}`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
              <div className="ml-2">{progressIcon}</div>
            </div>
            
            {isJobTarget(target) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">Women Progress</h5>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-3 mr-4">
                      <div 
                        className="h-3 rounded-full bg-purple-500" 
                        style={{ width: `${calculateProgress(target.women_current || 0, target.women_target || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round(calculateProgress(target.women_current || 0, target.women_target || 0))}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">Youth Progress</h5>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-3 mr-4">
                      <div 
                        className="h-3 rounded-full bg-blue-500" 
                        style={{ width: `${calculateProgress(target.youth_current || 0, target.youth_target || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round(calculateProgress(target.youth_current || 0, target.youth_target || 0))}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Related Information</h3>
          
          {target.action ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Action</h4>
                <p className="text-base font-medium">{target.action.name}</p>
              </div>
              
              {target.action.intervention && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Intervention</h4>
                  <p className="text-base">{target.action.intervention.name}</p>
                </div>
              )}
              
              {target.action.intervention?.pathway && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Pathway</h4>
                  <p className="text-base">{target.action.intervention.pathway.name}</p>
                </div>
              )}
              
              {target.action.intervention?.pathway?.cluster && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Cluster</h4>
                  <p className="text-base">{target.action.intervention.pathway.cluster.name}</p>
                </div>
              )}
              
              <div className="pt-4">
                <button
                  onClick={() => navigate(`/interventions/${target.action?.intervention?.id}/actions/${target.action?.id}#targets`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Action Details
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No related action information available</p>
          )}
        </div>
      </div>
      
      {/* Target History */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Update History</h3>
        
        {history.length === 0 ? (
          <p className="text-gray-500">No update history available</p>
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
                {history.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.changed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.changed_by?.full_name || item.user?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.previous_current_value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.new_current_value.toLocaleString()}
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
    </DashboardLayout>
  );
}

  