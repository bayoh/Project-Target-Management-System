import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Calendar,
  BarChart3
} from 'lucide-react';

interface WidgetData {
  totalUsers: number;
  activeUsers: number;
  todayActivities: number;
  weekActivities: number;
  inactiveUsersCount: number;
  weekOverWeekChange: number;
}

interface DashboardWidgetProps {
  title?: string;
  compact?: boolean;
  showAlerts?: boolean;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ 
  title = "User Activity Overview", 
  compact = false,
  showAlerts = true 
}) => {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  // Cache duration: 2 minutes for dashboard widgets
  const CACHE_DURATION = 2 * 60 * 1000;

  useEffect(() => {
    const now = Date.now();
    // Only fetch if cache is expired
    if (now - lastFetch > CACHE_DURATION || !data) {
      fetchWidgetData();
    }
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchWidgetData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lastFetch, data]);

  const fetchWidgetData = async () => {
    try {
      setError(null);
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Use Promise.allSettled for better error handling
      const [userStatsResult, todayActivitiesResult, weekActivitiesResult, lastWeekActivitiesResult] = await Promise.allSettled([
        supabase
          .from('user_activity_summary')
          .select('*')
          .limit(1000),
        
        supabase
          .from('user_activity_logs')
          .select('id')
          .gte('timestamp', todayStart.toISOString())
          .limit(5000),
        
        supabase
          .from('user_activity_logs')
          .select('id')
          .gte('timestamp', weekStart.toISOString())
          .limit(10000),
        
        supabase
          .from('user_activity_logs')
          .select('id')
          .gte('timestamp', lastWeekStart.toISOString())
          .lt('timestamp', weekStart.toISOString())
          .limit(10000)
      ]);
      
      const userStats = userStatsResult.status === 'fulfilled' ? userStatsResult.value.data : [];
      const todayActivities = todayActivitiesResult.status === 'fulfilled' ? todayActivitiesResult.value.data : [];
      const weekActivities = weekActivitiesResult.status === 'fulfilled' ? weekActivitiesResult.value.data : [];
      const lastWeekActivities = lastWeekActivitiesResult.status === 'fulfilled' ? lastWeekActivitiesResult.value.data : [];

      const totalUsers = userStats?.length || 0;
      
      const activeUsers = userStats?.filter(u => {
        if (!u.last_activity) return false;
        const daysSince = Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      }).length || 0;

      const inactiveUsersCount = userStats?.filter(u => {
        if (!u.last_activity) return true;
        const daysSince = Math.floor((Date.now() - new Date(u.last_activity).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 14;
      }).length || 0;

      const thisWeekCount = weekActivities?.length || 0;
      const lastWeekCount = lastWeekActivities?.length || 0;
      const weekOverWeekChange = lastWeekCount > 0 
        ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 
        : 0;

      setData({
        totalUsers,
        activeUsers,
        todayActivities: todayActivities?.length || 0,
        weekActivities: thisWeekCount,
        inactiveUsersCount,
        weekOverWeekChange
      });
      
      setLastFetch(Date.now());
    } catch (err) {
      console.error('Error fetching widget data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Memoize the computed values to prevent unnecessary re-renders
  const computedMetrics = useMemo(() => {
    if (!data) return null;
    
    return {
      totalUsers: data.totalUsers,
      activeUsers: data.activeUsers,
      todayActivities: data.todayActivities,
      weekActivities: data.weekActivities,
      inactiveUsersCount: data.inactiveUsersCount,
      weekOverWeekChange: data.weekOverWeekChange
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchWidgetData}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-lg font-bold text-gray-900">{formatNumber(computedMetrics?.totalUsers || 0)}</span>
            </div>
            <p className="text-xs text-gray-600">Total Users</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-lg font-bold text-gray-900">{formatNumber(computedMetrics?.activeUsers || 0)}</span>
            </div>
            <p className="text-xs text-gray-600">Active Users</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-lg font-bold text-gray-900">{formatNumber(computedMetrics?.todayActivities || 0)}</span>
            </div>
            <p className="text-xs text-gray-600">Today</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {(computedMetrics?.weekOverWeekChange || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-lg font-bold ${
                (computedMetrics?.weekOverWeekChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(computedMetrics?.weekOverWeekChange || 0) >= 0 ? '+' : ''}{(computedMetrics?.weekOverWeekChange || 0).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-600">vs Last Week</p>
          </div>
        </div>
        {showAlerts && (computedMetrics?.inactiveUsersCount || 0) > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center">
              <AlertTriangle className="h-3 w-3 text-yellow-600 mr-1" />
              <span className="text-xs text-yellow-800">
                {computedMetrics?.inactiveUsersCount || 0} inactive users
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">Real-time activity metrics</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-blue-500 mr-2" />
              <span className="text-2xl font-bold text-gray-900">{formatNumber(computedMetrics?.totalUsers || 0)}</span>
            </div>
            <p className="text-sm text-gray-600">Total Users</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-6 w-6 text-green-500 mr-2" />
              <span className="text-2xl font-bold text-gray-900">{formatNumber(computedMetrics?.activeUsers || 0)}</span>
            </div>
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-xs text-gray-500">Last 7 days</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-green-500 h-1 rounded-full" 
                style={{ width: `${Math.max(10, ((computedMetrics?.activeUsers || 0) / Math.max(1, computedMetrics?.totalUsers || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-6 w-6 text-purple-500 mr-2" />
              <span className="text-2xl font-bold text-gray-900">{formatNumber(computedMetrics?.todayActivities || 0)}</span>
            </div>
            <p className="text-sm text-gray-600">Today's Activities</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-purple-500 h-1 rounded-full" 
                style={{ width: `${Math.max(10, Math.min(100, ((computedMetrics?.todayActivities || 0) / Math.max(1, (computedMetrics?.weekActivities || 0) / 7)) * 100))}%` }}
              ></div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {(computedMetrics?.weekOverWeekChange || 0) >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-500 mr-2" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500 mr-2" />
              )}
              <span className={`text-2xl font-bold ${
                (computedMetrics?.weekOverWeekChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(computedMetrics?.weekOverWeekChange || 0) >= 0 ? '+' : ''}{(computedMetrics?.weekOverWeekChange || 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Week over Week</p>
            <p className="text-xs text-gray-500">{formatNumber(computedMetrics?.weekActivities || 0)} this week</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full ${
                  (computedMetrics?.weekOverWeekChange || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.abs(computedMetrics?.weekOverWeekChange || 0) + 10)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {showAlerts && (computedMetrics?.inactiveUsersCount || 0) > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Attention Required</h4>
                <p className="text-sm text-yellow-700">
                  {computedMetrics?.inactiveUsersCount || 0} users have been inactive for more than 2 weeks
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button
            onClick={fetchWidgetData}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidget;