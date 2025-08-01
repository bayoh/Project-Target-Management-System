import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  Clock, 
  AlertTriangle,
  Download,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalActivities: number;
  activitiesThisWeek: number;
  activitiesLastWeek: number;
  mostActiveUsers: Array<{
    user_id: string;
    full_name: string;
    email: string;
    activity_count: number;
  }>;
  leastActiveUsers: Array<{
    user_id: string;
    full_name: string;
    email: string;
    last_activity: string | null;
    days_since_activity: number;
  }>;
  activityTrends: Array<{
    date: string;
    count: number;
  }>;
  featureUsage: Array<{
    entity_type: string;
    action_type: string;
    count: number;
  }>;
  inactiveAlerts: Array<{
    user_id: string;
    full_name: string;
    email: string;
    last_activity: string | null;
    days_inactive: number;
  }>;
}

interface ActivityAnalyticsProps {
  dateRange?: number; // days
}

const ActivityAnalytics: React.FC<ActivityAnalyticsProps> = ({ dateRange = 30 }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'trends' | 'features' | 'users'>('trends');
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    const now = Date.now();
    // Only fetch if cache is expired or dateRange changed
    if (now - lastFetch > CACHE_DURATION || !analytics) {
      fetchAnalytics();
    }
  }, [dateRange, lastFetch, analytics]);

  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(analytics !== null);
      if (!analytics) setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);

      // Use Promise.allSettled to prevent one failed query from breaking everything
      const [userStatsResult, activityTrendsResult, featureUsageResult, mostActiveUsersResult] = await Promise.allSettled([
        supabase
          .from('user_activity_summary')
          .select('*')
          .limit(1000), // Limit to prevent excessive data
        
        supabase
          .from('user_activity_logs')
          .select('timestamp')
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: true })
          .limit(10000), // Limit to prevent excessive data
        
        supabase
          .from('user_activity_logs')
          .select('entity_type, action_type')
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .limit(5000), // Limit to prevent excessive data
        
        supabase
          .rpc('get_most_active_users', { days: dateRange, limit_count: 10 })
      ]);

      // Extract data from settled promises
      const userStats = userStatsResult.status === 'fulfilled' ? userStatsResult.value.data : [];
      const activityTrends = activityTrendsResult.status === 'fulfilled' ? activityTrendsResult.value.data : [];
      const featureUsage = featureUsageResult.status === 'fulfilled' ? featureUsageResult.value.data : [];
      const mostActiveUsers = mostActiveUsersResult.status === 'fulfilled' ? mostActiveUsersResult.value.data : [];

      // Process data
      const totalUsers = userStats?.length || 0;
      const activeUsers = userStats?.filter(u => {
        if (!u.last_activity) return false;
        const daysSince = Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      }).length || 0;

      const inactiveUsers = userStats?.filter(u => {
        if (!u.last_activity) return true;
        const daysSince = Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 30;
      }).length || 0;

      // Process activity trends by day
      const trendsByDay: { [key: string]: number } = {};
      activityTrends?.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        trendsByDay[date] = (trendsByDay[date] || 0) + 1;
      });

      const trends = Object.entries(trendsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process feature usage
      const usageMap: { [key: string]: number } = {};
      featureUsage?.forEach(usage => {
        const key = `${usage.entity_type || 'unknown'}_${usage.action_type}`;
        usageMap[key] = (usageMap[key] || 0) + 1;
      });

      const processedFeatureUsage = Object.entries(usageMap)
        .map(([key, count]) => {
          const [entity_type, action_type] = key.split('_');
          return { entity_type, action_type, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get inactive users for alerts
      const inactiveAlerts = userStats?.filter(u => {
        if (!u.last_activity) return true;
        const daysSince = Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 14; // Alert for users inactive for more than 2 weeks
      }).map(u => ({
        user_id: u.user_id,
        full_name: u.full_name || 'Unknown',
        email: u.email,
        last_activity: u.last_activity,
        days_inactive: u.last_activity 
          ? Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity
      })).sort((a, b) => b.days_inactive - a.days_inactive).slice(0, 20) || [];

      // Calculate week-over-week change
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);

      const activitiesThisWeek = activityTrends?.filter(a => 
        new Date(a.timestamp) >= thisWeekStart
      ).length || 0;

      const activitiesLastWeek = activityTrends?.filter(a => {
        const date = new Date(a.timestamp);
        return date >= lastWeekStart && date < thisWeekStart;
      }).length || 0;

      setAnalytics({
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalActivities: activityTrends?.length || 0,
        activitiesThisWeek,
        activitiesLastWeek,
        mostActiveUsers: mostActiveUsers || [],
        leastActiveUsers: [], // Will be populated from inactive alerts
        activityTrends: trends,
        featureUsage: processedFeatureUsage,
        inactiveAlerts
      });
      
      setLastFetch(Date.now());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const refreshAnalytics = () => {
    setLastFetch(0); // Force refresh
    fetchAnalytics();
  };

  const generateReport = () => {
    if (!analytics) return;

    const reportData = [
      ['Metric', 'Value'],
      ['Total Users', analytics.totalUsers.toString()],
      ['Active Users (Last 7 days)', analytics.activeUsers.toString()],
      ['Inactive Users (30+ days)', analytics.inactiveUsers.toString()],
      ['Total Activities', analytics.totalActivities.toString()],
      ['Activities This Week', analytics.activitiesThisWeek.toString()],
      ['Activities Last Week', analytics.activitiesLastWeek.toString()],
      [''],
      ['Most Active Users', ''],
      ...analytics.mostActiveUsers.map(user => [user.full_name, user.activity_count.toString()]),
      [''],
      ['Feature Usage', ''],
      ...analytics.featureUsage.map(feature => [
        `${feature.entity_type} ${feature.action_type}`, 
        feature.count.toString()
      ]),
      [''],
      ['Inactive Users Alert', ''],
      ...analytics.inactiveAlerts.map(user => [
        user.full_name, 
        `${user.days_inactive} days inactive`
      ])
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getWeekOverWeekChange = () => {
    if (!analytics || analytics.activitiesLastWeek === 0) return 0;
    return ((analytics.activitiesThisWeek - analytics.activitiesLastWeek) / analytics.activitiesLastWeek) * 100;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const weekOverWeekChange = getWeekOverWeekChange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Analytics</h2>
          <p className="text-gray-600">Insights and trends for the last {dateRange} days</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalUsers)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.activeUsers)}</p>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalActivities)}</p>
              <p className="text-xs text-gray-500">Last {dateRange} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            {weekOverWeekChange >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Week over Week</p>
              <p className={`text-2xl font-bold ${
                weekOverWeekChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weekOverWeekChange >= 0 ? '+' : ''}{weekOverWeekChange.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(analytics.activitiesThisWeek)} vs {formatNumber(analytics.activitiesLastWeek)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inactive Users Alert */}
      {analytics.inactiveAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-yellow-800">
              Inactive Users Alert ({analytics.inactiveAlerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.inactiveAlerts.slice(0, 6).map(user => (
              <div key={user.user_id} className="bg-white rounded-md p-3 border border-yellow-200">
                <p className="font-medium text-gray-900">{user.full_name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-yellow-700">
                  {user.days_inactive === Infinity ? 'Never active' : `${user.days_inactive} days inactive`}
                </p>
              </div>
            ))}
          </div>
          {analytics.inactiveAlerts.length > 6 && (
            <p className="mt-4 text-sm text-yellow-700">
              And {analytics.inactiveAlerts.length - 6} more inactive users...
            </p>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Detailed Analytics</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedMetric('trends')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedMetric === 'trends'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LineChart className="h-4 w-4 inline mr-1" />
                Trends
              </button>
              <button
                onClick={() => setSelectedMetric('features')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedMetric === 'features'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-1" />
                Features
              </button>
              <button
                onClick={() => setSelectedMetric('users')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedMetric === 'users'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PieChart className="h-4 w-4 inline mr-1" />
                Users
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {selectedMetric === 'trends' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Activity Trends</h4>
              <div className="space-y-2">
                {analytics.activityTrends.slice(-14).map((trend, index) => (
                  <div key={trend.date} className="flex items-center">
                    <div key={index} className="w-20 text-sm text-gray-600">
                      {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.max(5, (trend.count / Math.max(...analytics.activityTrends.map(t => t.count))) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-900 text-right">
                      {formatNumber(trend.count)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMetric === 'features' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Feature Usage</h4>
              <div className="space-y-2">
                {analytics.featureUsage.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-sm text-gray-600 capitalize">
                      {feature.entity_type}
                    </div>
                    <div className="w-20 text-sm text-gray-600 capitalize">
                      {feature.action_type}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.max(5, (feature.count / Math.max(...analytics.featureUsage.map(f => f.count))) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-900 text-right">
                      {formatNumber(feature.count)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMetric === 'users' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Most Active Users</h4>
              <div className="space-y-2">
                {analytics.mostActiveUsers.map((user, index) => (
                  <div key={user.user_id} className="flex items-center">
                    <div className="w-8 text-sm text-gray-600">
                      #{index + 1}
                    </div>
                    <div className="flex-1 mx-4">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="w-20 text-sm text-gray-900 text-right">
                      {formatNumber(user.activity_count)} activities
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityAnalytics;