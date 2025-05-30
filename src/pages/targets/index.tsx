import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  TrendingDown,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/layout/PageHeader'; // Added PageHeader

interface TargetSummary {
  total: number;
  completed: number;
  at_risk: number;
  in_progress: number;
  categories: { [key: string]: number };
  averageProgress: number;
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
    in_progress: 0,
    categories: {},
    averageProgress: 0,
  });
  const [recentTargets, setRecentTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [filterStatus, filterCategory]); // Reload data when filters change

  const loadDashboardData = async () => {
    setLoading(true);
    await loadSummary();
    await loadRecentTargets();
    setLoading(false);
  };

  const applyFilters = () => {
    loadDashboardData(); // Reload all data when filters are applied
  };

  const loadSummary = async () => {
    try {
      let query = supabase.from('action_targets').select('*');

      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }
      // Status filter will be applied during calculation, not in DB query for summary across all statuses

      const { data, error } = await query;

      if (error) throw error;
      
      const targets = data || [];
      const total = targets.length;
      const completed = targets.filter(t => t.target_value > 0 && (t.current_value / t.target_value) >= 1).length;
      const at_risk = targets.filter(t => t.target_value > 0 && (t.current_value / t.target_value) < 0.5 && (t.current_value / t.target_value) < 1).length;
      const in_progress = targets.filter(t => t.target_value > 0 && (t.current_value / t.target_value) >= 0.5 && (t.current_value / t.target_value) < 1).length;
      
      const categories: { [key: string]: number } = {};
      targets.forEach(t => {
        const category = t.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
      });

      const totalProgress = targets.reduce((acc, t) => {
        if (t.target_value > 0) {
          return acc + Math.min((t.current_value / t.target_value) * 100, 100);
        }
        return acc;
      }, 0);
      const averageProgress = total > 0 ? totalProgress / targets.filter(t => t.target_value > 0).length : 0;

      setSummary({
        total,
        completed,
        at_risk,
        in_progress,
        categories,
        averageProgress
      });
    } catch (err) {
      console.error('Error loading target summary:', err);
    } 
    // Removed finally setLoading(false) as it's handled in loadDashboardData
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
        `)
        .limit(10); // Limit recent targets for dashboard view

      if (filterStatus) {
        if (filterStatus === 'completed') {
          query = query.gte('current_value', supabase.sql('target_value')); // Ensure target_value is treated as column
        } else if (filterStatus === 'at_risk') {
          // current_value < 0.5 * target_value AND current_value < target_value
          query = query.lt('current_value', supabase.sql('0.5 * target_value'))
                       .lt('current_value', supabase.sql('target_value'));
        } else if (filterStatus === 'in_progress') {
          // current_value >= 0.5 * target_value AND current_value < target_value
          query = query.gte('current_value', supabase.sql('0.5 * target_value'))
                       .lt('current_value', supabase.sql('target_value'));
        }
      }

      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query
        .order('last_updated', { ascending: false });

      if (error) throw error;
      setRecentTargets(data || []);
    } catch (err) {
      console.error('Error loading recent targets:', err);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0; // Avoid division by zero or negative target
    return Math.min(Math.max((current / target) * 100, 0), 100); // Ensure progress is between 0 and 100
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
    if (progress < 50 && progress > 0) return <TrendingDown className="h-5 w-5 text-orange-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const summaryCards = useMemo(() => [
    { title: 'Total Targets', value: summary.total, icon: Target, color: 'blue' },
    { title: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'green', percentage: summary.total > 0 ? (summary.completed / summary.total) * 100 : 0 },
    { title: 'In Progress', value: summary.in_progress, icon: Clock, color: 'yellow', percentage: summary.total > 0 ? (summary.in_progress / summary.total) * 100 : 0 },
    { title: 'At Risk', value: summary.at_risk, icon: AlertCircle, color: 'red', percentage: summary.total > 0 ? (summary.at_risk / summary.total) * 100 : 0 },
    { title: 'Avg. Progress', value: `${summary.averageProgress.toFixed(1)}%`, icon: TrendingUp, color: 'indigo' },
  ], [summary]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Targets Dashboard"
          description="High-level overview of target performance and status."
          icon={<BarChart3 className="h-8 w-8" />}
          actions={[
            {
              label: 'Track All Targets',
              icon: ListChecks,
              onClick: () => navigate('/targets/tracking'),
              variant: 'outline',
            },
            {
              label: 'Add New Target',
              icon: Plus,
              onClick: () => navigate('/targets/new'),
            },
          ]}
        />

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
            <Filter className="h-6 w-6 text-gray-500" />
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
              className="inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {summaryCards.map((card, index) => (
            <div key={index} className={`bg-white rounded-xl shadow-lg p-6 ring-1 ring-gray-200 hover:shadow-xl transition-shadow duration-200 flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-full bg-${card.color}-100 text-${card.color}-600`}>
                  <card.icon className="h-7 w-7" />
                </div>
                {card.percentage !== undefined && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-${card.color}-100 text-${card.color}-700`}>
                    {card.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{card.value}</h3>
                <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Targets & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 ring-1 ring-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Recent Target Updates</h2>
                <button 
                    onClick={() => navigate('/targets/tracking')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                    View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </button>
            </div>
            {recentTargets.length > 0 ? (
              <div className="space-y-4">
                {recentTargets.map((target) => {
                  const progress = calculateProgress(target.current_value, target.target_value);
                  return (
                    <div 
                        key={target.id} 
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-150 cursor-pointer"
                        onClick={() => navigate(`/targets/${target.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-md font-semibold text-gray-800 truncate" title={target.description}>{target.description}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {target.action?.intervention?.name} - {target.action?.name}
                        </p>
                        <div className="mt-2 flex items-center">
                          <div className="flex-1 h-2.5 bg-gray-200 rounded-full">
                            <div
                              className={`h-2.5 rounded-full ${getProgressColor(progress)} transition-all duration-500 ease-out`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2 text-gray-500">
                        {getProgressIcon(progress)}
                        <ArrowUpRight className="h-5 w-5 text-blue-500 group-hover:text-blue-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-md text-gray-500">
                  No targets match the current filters.
                </p>
                { (filterStatus || filterCategory) && 
                    <button 
                        onClick={() => { setFilterStatus(''); setFilterCategory(''); /* applyFilters will be called by useEffect */}}
                        className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    >
                        Clear Filters
                    </button>
                }
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 ring-1 ring-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Target Categories</h2>
                <PieChart className="h-6 w-6 text-gray-500" />
            </div>
            {Object.keys(summary.categories).length > 0 ? (
                <ul className="space-y-3">
                {Object.entries(summary.categories).map(([category, count]) => (
                    <li key={category} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 font-medium capitalize">{category}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">{count}</span>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">No category data available.</p>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}