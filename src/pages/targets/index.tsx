import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Plus, 
  BarChart3, 
  ListChecks,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
// import { PageHeader } from '../../components/layout/PageHeader';

interface TargetSummary {
  total: number;
  completed: number;
  at_risk: number;
  in_progress: number;
}

interface TargetItem {
  id: string;
  description: string;
  metric: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  last_updated: string;
  category?: string;
  action?: {
    id: string;
    name: string;
    intervention?: {
      id: string;
      name: string;
    }
  };
}

export default function TargetsIndex() {
  const [summary, setSummary] = useState<TargetSummary>({
    total: 0,
    completed: 0,
    at_risk: 0,
    in_progress: 0
  });
  const [recentTargets, setRecentTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSummary();
    loadRecentTargets();
  }, []);

  const applyFilters = () => {
    loadRecentTargets();
  };

  const loadSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('action_targets')
        .select('*');

      if (error) throw error;
      
      const targets = data || [];
      const completed = targets.filter(t => (t.current_value / t.target_value) >= 1).length;
      const at_risk = targets.filter(t => (t.current_value / t.target_value) < 0.5).length;
      const in_progress = targets.length - completed - at_risk;
      
      setSummary({
        total: targets.length,
        completed,
        at_risk,
        in_progress
      });
    } catch (err) {
      console.error('Error loading target summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTargets = async () => {
    try {
      let query = supabase
        .from('action_targets')
        .select(`
          *,
          action:actions(
            id,
            name,
            intervention:interventions(
              id,
              name
            )
          )
        `);

    //   if (filterStatus) {
    //     if (filterStatus === 'completed') {
    //       query = query.gte('current_value', 'target_value');
    //     } else if (filterStatus === 'at_risk') {
    //       query = query.lt('current_value', .5 * supabase.raw('target_value'));
    //     } else if (filterStatus === 'in_progress') {
    //       query = query
    //         .gte('current_value', .5 * supabase.raw('target_value'))
    //         .lt('current_value', supabase.raw('target_value'));
    //     }
    //   }

    //   if (filterCategory) {
    //     query = query.eq('category', filterCategory);
    //   }

      const { data, error } = await query
        .order('last_updated', { ascending: false })

      if (error) throw error;
      setRecentTargets(data || []);
    } catch (err) {
      console.error('Error loading recent targets:', err);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
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

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* <PageHeader
          title="Targets Dashboard"
          description="Overview of all targets across your projects"
          icon={<Target className="h-8 w-8" />}
        /> */}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => navigate('/targets/tracking')}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ListChecks className="h-4 w-4 mr-2" />
            Track Targets
          </button>
          <button
            onClick={() => navigate('/targets/new')}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Target
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Filter Targets</h2>
            <Filter className="h-5 w-5 text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="at_risk">At Risk</option>
            </select>
            
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="jobs">Jobs</option>
              <option value="revenue">Revenue</option>
              <option value="other">Other</option>
            </select>
            
            <button
              onClick={applyFilters}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Target className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{summary.total}</h3>
                <p className="text-sm text-gray-500">Total Targets</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{summary.completed}</h3>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{summary.in_progress}</h3>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{summary.at_risk}</h3>
                <p className="text-sm text-gray-500">At Risk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Targets */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Targets</h2>
          <div className="space-y-4">
            {recentTargets.map((target) => {
              const progress = calculateProgress(target.current_value, target.target_value);
              return (
                <div key={target.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{target.description}</h3>
                    <p className="text-xs text-gray-500">
                      {target.action?.intervention?.name} - {target.action?.name}
                    </p>
                    <div className="mt-2 flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-600">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {getProgressIcon(progress)}
                    <a
                      href={`/targets/${target.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
            {recentTargets.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No targets found. Create your first target to get started.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}