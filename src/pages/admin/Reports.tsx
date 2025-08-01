import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import ActivityAnalytics from '../../components/admin/ActivityAnalytics';
import DashboardWidget from '../../components/admin/DashboardWidget';
import { useAuth } from '../../lib/auth';
import { 
  Download, 
  FileText, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface ReportConfig {
  type: 'user_activity' | 'engagement' | 'inactivity' | 'feature_usage';
  dateRange: number;
  format: 'csv' | 'json';
  includeDetails: boolean;
}

interface EngagementMetrics {
  averageSessionDuration: number;
  averageActivitiesPerUser: number;
  retentionRate: number;
  mostEngagedUsers: Array<{
    user_id: string;
    name: string;
    email: string;
    engagement_score: number;
  }>;
  leastEngagedUsers: Array<{
    user_id: string;
    name: string;
    email: string;
    engagement_score: number;
  }>;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportConfig['type']>('user_activity');
  const [dateRange, setDateRange] = useState(30);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  // Debounce refresh to prevent excessive API calls
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefresh > 30000) { // 30 second minimum between refreshes
      setLastRefresh(now);
    }
  }, [lastRefresh]);
  
  // Memoize dashboard widgets to prevent unnecessary re-renders
  const dashboardWidgets = useMemo(() => [{
    title: 'Total Users',
    icon: '👥',
    key: 'total-users'
  }, {
    title: 'Active Users', 
    icon: '🟢',
    key: 'active-users'
  }, {
    title: 'Daily Activities',
    icon: '📊', 
    key: 'daily-activities'
  }, {
    title: 'Weekly Growth',
    icon: '📈',
    key: 'weekly-growth'
  }], []);

  useEffect(() => {
    if (selectedReport === 'engagement') {
      fetchEngagementMetrics();
    }
  }, [selectedReport, dateRange]);

  const fetchEngagementMetrics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);

      // Fetch user activity data for engagement calculation
      const { data: activities } = await supabase
        .from('user_activity_logs')
        .select('user_id, timestamp, session_id')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const { data: users } = await supabase
        .from('user_activity_summary')
        .select('*');

      if (!activities || !users) return;

      // Calculate engagement metrics
      const userEngagement: { [key: string]: { activities: number; sessions: Set<string>; name: string; email: string } } = {};
      
      activities.forEach(activity => {
        if (!userEngagement[activity.user_id]) {
          const user = users.find(u => u.user_id === activity.user_id);
          userEngagement[activity.user_id] = {
            activities: 0,
            sessions: new Set(),
            name: user?.name || 'Unknown',
            email: user?.email || 'unknown@example.com'
          };
        }
        userEngagement[activity.user_id].activities++;
        if (activity.session_id) {
          userEngagement[activity.user_id].sessions.add(activity.session_id);
        }
      });

      // Calculate engagement scores (activities per session)
      const engagementScores = Object.entries(userEngagement).map(([userId, data]) => ({
        user_id: userId,
        name: data.name,
        email: data.email,
        engagement_score: data.sessions.size > 0 ? data.activities / data.sessions.size : 0
      })).sort((a, b) => b.engagement_score - a.engagement_score);

      const averageActivitiesPerUser = Object.values(userEngagement).reduce((sum, data) => sum + data.activities, 0) / Object.keys(userEngagement).length;
      const averageSessionDuration = 15; // Placeholder - would need session duration tracking
      const retentionRate = (Object.keys(userEngagement).length / users.length) * 100;

      setEngagementMetrics({
        averageSessionDuration,
        averageActivitiesPerUser,
        retentionRate,
        mostEngagedUsers: engagementScores.slice(0, 10),
        leastEngagedUsers: engagementScores.slice(-10).reverse()
      });
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);

      let reportData: any[] = [];
      let filename = '';

      switch (selectedReport) {
        case 'user_activity':
          const { data: userActivities } = await supabase
            .from('user_activity_logs')
            .select(`
              *,
              user_activity_summary!inner(name, email, role)
            `)
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: false });

          reportData = userActivities?.map(activity => ({
            timestamp: activity.timestamp,
            user_name: activity.user_activity_summary?.name || 'Unknown',
            user_email: activity.user_activity_summary?.email || 'unknown@example.com',
            user_role: activity.user_activity_summary?.role || 'user',
            action_type: activity.action_type,
            entity_type: activity.entity_type,
            entity_id: activity.entity_id,
            ip_address: includeDetails ? activity.ip_address : '[REDACTED]',
            user_agent: includeDetails ? activity.user_agent : '[REDACTED]',
            session_id: activity.session_id
          })) || [];
          filename = `user-activity-report-${dateRange}days`;
          break;

        case 'engagement':
          if (!engagementMetrics) {
            await fetchEngagementMetrics();
          }
          reportData = [
            { metric: 'Average Session Duration (minutes)', value: engagementMetrics?.averageSessionDuration || 0 },
            { metric: 'Average Activities Per User', value: engagementMetrics?.averageActivitiesPerUser || 0 },
            { metric: 'Retention Rate (%)', value: engagementMetrics?.retentionRate || 0 },
            { metric: '', value: '' },
            { metric: 'Most Engaged Users', value: '' },
            ...(engagementMetrics?.mostEngagedUsers.map(user => ({
              metric: user.name,
              value: `${user.engagement_score.toFixed(2)} activities/session`
            })) || []),
            { metric: '', value: '' },
            { metric: 'Least Engaged Users', value: '' },
            ...(engagementMetrics?.leastEngagedUsers.map(user => ({
              metric: user.name,
              value: `${user.engagement_score.toFixed(2)} activities/session`
            })) || [])
          ];
          filename = `engagement-report-${dateRange}days`;
          break;

        case 'inactivity':
          const { data: inactiveUsers } = await supabase
            .from('user_activity_summary')
            .select('*');

          const inactiveData = inactiveUsers?.filter(user => {
            if (!user.last_activity) return true;
            const daysSince = Math.floor((Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24));
            return daysSince > 14;
          }).map(user => ({
            name: user.name || 'Unknown',
            email: user.email,
            role: user.role || 'user',
            last_activity: user.last_activity || 'Never',
            days_inactive: user.last_activity 
              ? Math.floor((Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24))
              : 'Never active',
            total_activities: user.total_activities || 0
          })).sort((a, b) => {
            const aDays = typeof a.days_inactive === 'number' ? a.days_inactive : Infinity;
            const bDays = typeof b.days_inactive === 'number' ? b.days_inactive : Infinity;
            return bDays - aDays;
          }) || [];

          reportData = inactiveData;
          filename = `inactive-users-report-${dateRange}days`;
          break;

        case 'feature_usage':
          const { data: featureData } = await supabase
            .from('user_activity_logs')
            .select('entity_type, action_type')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString());

          const usageMap: { [key: string]: number } = {};
          featureData?.forEach(item => {
            const key = `${item.entity_type || 'unknown'}_${item.action_type}`;
            usageMap[key] = (usageMap[key] || 0) + 1;
          });

          reportData = Object.entries(usageMap)
            .map(([key, count]) => {
              const [entity_type, action_type] = key.split('_');
              return { entity_type, action_type, usage_count: count };
            })
            .sort((a, b) => b.usage_count - a.usage_count);
          filename = `feature-usage-report-${dateRange}days`;
          break;
      }

      // Generate and download file
      if (format === 'csv') {
        const headers = Object.keys(reportData[0] || {});
        const csvContent = [
          headers.join(','),
          ...reportData.map(row => 
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
            }).join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify({
          report_type: selectedReport,
          date_range_days: dateRange,
          generated_at: new Date().toISOString(),
          data: reportData
        }, null, 2);
        
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      setLastGenerated(new Date());
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-gray-600">
            Generate comprehensive reports and view analytics for user activity and engagement.
          </p>
        </div>

        {/* Dashboard Widget */}
        <div className="mb-8">
          <DashboardWidget title="Quick Overview" showAlerts={true} />
        </div>

        {/* Report Generation Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2" />
              Generate Reports
            </h2>
            <p className="mt-1 text-gray-600">Create custom reports based on your requirements.</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value as ReportConfig['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user_activity">User Activity Log</option>
                  <option value="engagement">User Engagement</option>
                  <option value="inactivity">Inactive Users</option>
                  <option value="feature_usage">Feature Usage</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              {/* Include Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeDetails"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeDetails" className="ml-2 text-sm text-gray-700">
                    Include sensitive data
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  IP addresses, user agents
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {lastGenerated && (
                  <span>Last generated: {lastGenerated.toLocaleString()}</span>
                )}
              </div>
              <button
                onClick={generateReport}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Engagement Metrics Preview */}
        {selectedReport === 'engagement' && engagementMetrics && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Engagement Metrics Preview</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {engagementMetrics.averageSessionDuration.toFixed(1)}m
                  </div>
                  <p className="text-sm text-gray-600">Avg Session Duration</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {engagementMetrics.averageActivitiesPerUser.toFixed(1)}
                  </div>
                  <p className="text-sm text-gray-600">Avg Activities/User</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {engagementMetrics.retentionRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Retention Rate</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Most Engaged Users</h4>
                  <div className="space-y-2">
                    {engagementMetrics.mostEngagedUsers.slice(0, 5).map(user => (
                      <div key={user.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-sm text-gray-600">
                          {user.engagement_score.toFixed(1)} act/session
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Least Engaged Users</h4>
                  <div className="space-y-2">
                    {engagementMetrics.leastEngagedUsers.slice(0, 5).map(user => (
                      <div key={user.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-sm text-gray-600">
                          {user.engagement_score.toFixed(1)} act/session
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        <ActivityAnalytics dateRange={dateRange} />
      </div>
    </div>
  );
};

export default Reports;