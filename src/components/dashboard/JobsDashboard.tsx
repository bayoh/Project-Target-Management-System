import React, { useState, useEffect } from 'react';
import { Briefcase, Users, Target, Settings } from 'lucide-react';
import { jobsApi } from '../../lib/api'; // Use projectApi from api.ts

interface ClusterJobStats {
  id: string;
  name: string;
  total_jobs: { target: number; current: number };
  women_jobs: { target: number; current: number };
  youth_jobs: { target: number; current: number };
}

export function JobsDashboard() {
  const [clusterJobStats, setClusterJobStats] = useState<ClusterJobStats[]>([]);
  const [clusterActionStats, setClusterActionStats] = useState<ClusterActionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsData, actionsData] = await Promise.all([
        jobsApi.getJobsByCluster(), // Fetches job stats per cluster
        jobsApi.getActionStatusByCluster() // Fetches action stats per cluster
      ]);

      setClusterJobStats(jobsData);
      setClusterActionStats(actionsData);
      console.log('projectApi', actionsData)

    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600 bg-red-100 rounded-lg">{error}</div>;
  }

  const getTotalJobs = () => clusterJobStats.reduce((sum, stat) => sum + stat.total_jobs.current, 0);
  const getWomenJobs = () => clusterJobStats.reduce((sum, stat) => sum + stat.women_jobs.current, 0);
  const getYouthJobs = () => clusterJobStats.reduce((sum, stat) => sum + stat.youth_jobs.current, 0);
  const getTotalTargetJobs = () => clusterJobStats.reduce((sum, stat) => sum + stat.total_jobs.target, 0);

  const aggregateActionStats = () => {
    return clusterActionStats.reduce((acc, stat) => {
      acc.total += stat.total;
      acc.completed += stat.completed;
      acc.on_going_on += stat.in_progress;
      acc.on_going_off += stat.at_risk;
      acc.not_started += stat.not_started;
      return acc;
    }, { total: 0, completed: 0, on_going_on: 0, on_going_off: 0, not_started: 0 });
  };

  const overallActionStats = aggregateActionStats();

  const StatCard: React.FC<{ icon: React.ElementType; title: string; value: string | number; bgColor: string }> = 
    ({ icon: Icon, title, value, bgColor }) => (
    <div className={`flex flex-col items-center justify-center ${bgColor} text-white p-4 rounded-lg shadow-md min-h-[120px]`}>
      <Icon className="w-10 h-10 mb-2" />
      <div className="text-sm font-medium">{title}</div>
      <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );

  const ClusterCard: React.FC<{ stat: ClusterJobStats; totalCurrentJobs: number }> = ({ stat, totalCurrentJobs }) => {
    const currentJobs = stat.total_jobs.current;
    const calculatedPercentage = totalCurrentJobs > 0 ? Math.round((currentJobs / totalCurrentJobs) * 100) : 0;

    return (
      <div key={stat.id} className={`p-6 rounded-lg shadow-lg text-white ${
        stat.name.toLowerCase().includes('climate') ? 'bg-green-600 hover:bg-green-700' :
        stat.name.toLowerCase().includes('heritage') ? 'bg-orange-500 hover:bg-orange-600' :
        stat.name.toLowerCase().includes('digital') ? 'bg-purple-600 hover:bg-purple-700' :
        'bg-blue-700 hover:bg-blue-800'
      } transition-colors duration-300`}>
        <div className="text-3xl font-bold mb-1">{calculatedPercentage}%</div>
        <div className="text-5xl font-extrabold mb-2">{currentJobs.toLocaleString()}</div>
        <div className="text-xl font-semibold truncate" title={stat.name}>{stat.name}</div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard icon={Briefcase} title="Total Jobs" value={getTotalJobs()} bgColor="bg-blue-500" />
        <StatCard icon={Users} title="Women Jobs" value={getWomenJobs()} bgColor="bg-pink-500" />
        <StatCard icon={Users} title="Youth Jobs" value={getYouthJobs()} bgColor="bg-teal-500" />
        <StatCard icon={Settings} title="Total Actions" value={overallActionStats.total} bgColor="bg-gray-600" />
      </div>

      {/* Job Categories by Cluster */}
      {/* <h2 className="text-2xl font-semibold text-gray-700">Job Creation by Cluster</h2> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {clusterJobStats.map(stat => <ClusterCard key={stat.id} stat={stat} totalCurrentJobs={getTotalJobs()} />)}
      </div>

      {/* Target vs Actual */}
      {/* <h2 className="text-2xl font-semibold text-gray-700">Overall Job Targets</h2> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-sky-700 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center mb-2">
            <Target className="w-8 h-8 mr-3" />
            <span className="text-2xl font-bold">Target Jobs</span>
          </div>
          <div className="text-4xl font-extrabold">{getTotalTargetJobs().toLocaleString()}</div>
        </div>
        <div className="bg-emerald-600 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center mb-2">
            <Briefcase className="w-8 h-8 mr-3" />
            <span className="text-2xl font-bold">Actual Jobs Created</span>
          </div>
          <div className="text-4xl font-extrabold">{getTotalJobs().toLocaleString()}</div>
        </div>
      </div>

      {/* Action Status Summary */}
      {/* <h2 className="text-2xl font-semibold text-gray-700">Action Status Summary</h2> */}
      <div className="bg-slate-700 p-6 rounded-lg shadow-md text-white">
        <div className="flex items-center mb-4">
          <Settings className="w-8 h-8 mr-3" />
          <span className="text-2xl font-bold">Overall Action Progress</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{overallActionStats.total.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Total Actions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">{overallActionStats.completed.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Completed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">{overallActionStats.on_going_on.toLocaleString()}</div>
            <div className="text-sm text-slate-300">On Track</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-400">{overallActionStats.on_going_off.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Off Track</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-400">{overallActionStats.not_started.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Not Started</div>
          </div>
        </div>
      </div>
    </div>
  );
}