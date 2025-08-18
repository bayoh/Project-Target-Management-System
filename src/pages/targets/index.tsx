import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Plus, 
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

import { PageHeader } from '../../components/layout/PageHeader';
import { useTargetSummary, useRecentTargets, useTargetFilterOptions } from '../../hooks/useProjectQueries';
import type { TargetFilters } from '../../types/queries';

export default function TargetsIndex() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const navigate = useNavigate();

  // Create filters object for queries
  const filters: TargetFilters = useMemo(() => {
    const f: TargetFilters = {};
    if (filterStatus) f.status = filterStatus;
    if (filterCategory) f.category = filterCategory;
    return f;
  }, [filterStatus, filterCategory]);

  // Use hooks for data fetching
  const { data: summary = {
    total: 0,
    completed: 0,
    at_risk: 0,
    in_progress: 0,
    categories: {},
    averageProgress: 0,
  }, isLoading: summaryLoading } = useTargetSummary(filters);

  const { data: recentTargets = [], isLoading: targetsLoading } = useRecentTargets(filters);
  const { data: filterOptions } = useTargetFilterOptions();

  const loading = summaryLoading || targetsLoading;

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0; // Avoid division by zero or negative target
    return Math.min(Math.max((current / target) * 100, 0), 100); // Ensure progress is between 0 and 100
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (progress >= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  const summaryCards = useMemo(() => [
    { title: 'Total Targets', value: summary.total, icon: Target, color: 'blue' },
    { title: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'green', percentage: summary.total > 0 ? (summary.completed / summary.total) * 100 : 0 },
    { title: 'In Progress', value: summary.in_progress, icon: Clock, color: 'yellow', percentage: summary.total > 0 ? (summary.in_progress / summary.total) * 100 : 0 },
    { title: 'At Risk', value: summary.at_risk, icon: AlertCircle, color: 'red', percentage: summary.total > 0 ? (summary.at_risk / summary.total) * 100 : 0 },
    { title: 'Avg. Progress', value: `${summary.averageProgress.toFixed(1)}%`, icon: TrendingUp, color: 'indigo' },
  ], [summary]);

  // Compute category data (must not be conditional to satisfy Rules of Hooks)
  const categoryData = useMemo(() => {
    const data = Object.entries(summary.categories || {}).map(([name, count]) => ({ name, count }));
    const topCategories = data.slice(0, 5);
    const remainingCount = data.slice(5).reduce((sum, item) => sum + item.count, 0);
    return remainingCount > 0 ? [...topCategories, { name: 'Other', count: remainingCount }] : topCategories;
  }, [summary.categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading targets data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader title="Targets Dashboard" description="Track progress towards key metrics across interventions and actions." />

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-3 lg:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">Filters & Actions</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => navigate('/targets/new')}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Target
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors duration-200 min-w-0 flex-1 sm:flex-none sm:w-auto"
              >
                <option value="">All Statuses</option>
                {filterOptions?.statuses?.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category-filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors duration-200 min-w-0 flex-1 sm:flex-none sm:w-auto"
              >
                <option value="">All Categories</option>
                {filterOptions?.categories?.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterCategory('');
                }}
                className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 rounded-md transition-all duration-200"
              >
                <span className="hidden xs:inline">Clear Filters</span>
                <span className="xs:hidden">Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-md ${
                  card.color === 'blue' ? 'bg-blue-100' :
                  card.color === 'green' ? 'bg-green-100' :
                  card.color === 'yellow' ? 'bg-yellow-100' :
                  card.color === 'red' ? 'bg-red-100' :
                  'bg-indigo-100'
                }`}>
                  <card.icon className={`h-5 w-5 ${
                    card.color === 'blue' ? 'text-blue-600' :
                    card.color === 'green' ? 'text-green-600' :
                    card.color === 'yellow' ? 'text-yellow-600' :
                    card.color === 'red' ? 'text-red-600' :
                    'text-indigo-600'
                  }`} />
                </div>
              </div>
              {card.percentage !== undefined && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ease-out shadow-sm ${
                        card.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        card.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        card.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        card.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        'bg-gradient-to-r from-indigo-500 to-indigo-600'
                      }`}
                      style={{ width: `${Math.min(card.percentage.toFixed(1), 100)}%` }}
                    >
                      <div className="h-full w-full rounded-full bg-gradient-to-t from-transparent to-white opacity-30"></div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-600">{card.percentage.toFixed(1)}%</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Targets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Targets</h3>
              <p className="mt-1 text-sm text-gray-500">Latest target metrics and progress updates</p>
            </div>
            <button
              onClick={() => navigate('/targets/tracking')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
            >
              View All Metrics
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTargets.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent targets</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first target.</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/targets/new')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Target
                  </button>
                </div>
              </div>
            ) : (
              recentTargets.map((target) => (
                <div key={target.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${
                            calculateProgress(target.current_value, target.target_value) >= 100 ? 'bg-green-500' :
                            calculateProgress(target.current_value, target.target_value) >= 75 ? 'bg-blue-500' :
                            calculateProgress(target.current_value, target.target_value) >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {target.metric}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {target.action?.intervention?.name || 'Unknown Intervention'} • {target.action?.name || 'Unknown Action'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {target.current_value.toLocaleString()} / {target.target_value.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {calculateProgress(target.current_value, target.target_value).toFixed(1)}% complete
                        </p>
                      </div>
                      <div className="w-24">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm ${getProgressColor(calculateProgress(target.current_value, target.target_value))}`}
                            style={{ width: `${calculateProgress(target.current_value, target.target_value)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Category Distribution</h3>
                <p className="mt-1 text-sm text-gray-500">Target distribution across different categories</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Live Data</span>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {categoryData.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No category data</h3>
                <p className="mt-1 text-sm text-gray-500">Category distribution will appear here once targets are created.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                  <div className="space-y-3">
                    {categoryData.map((item, index) => {
                      const total = categoryData.reduce((sum, i) => sum + i.count, 0);
                      const percentage = ((item.count / total) * 100).toFixed(1);
                      const colors = [
                        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
                        'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
                      ];
                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]} shadow-sm`} />
                            <div>
                              <span className="text-sm font-medium text-gray-900">{item.name}</span>
                              <p className="text-xs text-gray-500">{percentage}% of total</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            <p className="text-xs text-gray-500">targets</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Visual Distribution</h4>
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner" />
                    <div className="absolute inset-2 rounded-full bg-white shadow-sm" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{categoryData.reduce((sum, i) => sum + i.count, 0)}</p>
                        <p className="text-xs text-gray-500 font-medium">Total Targets</p>
                      </div>
                    </div>
                    {/* Decorative elements */}
                    {categoryData.slice(0, 4).map((item, index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                      const positions = [
                        'top-4 right-4', 'bottom-4 right-4', 'bottom-4 left-4', 'top-4 left-4'
                      ];
                      return (
                        <div key={index} className={`absolute ${positions[index]} w-3 h-3 ${colors[index]} rounded-full shadow-sm opacity-80`} />
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-gray-500 text-center max-w-xs">
                    Interactive chart visualization will be available with chart library integration
                  </p>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}