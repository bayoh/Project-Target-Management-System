import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Briefcase, Users, Target, Settings, LucideProps, User  } from 'lucide-react';
import { jobsApi } from '../../lib/api'; 

interface JobData { target: number; current: number };

interface ClusterJobStats {
  id: string;
  name: string;
  total_jobs: JobData;
  women_jobs: JobData;
  youth_jobs: JobData;
}

interface ClusterActionStats {
  id: string;
  name: string;
  total: number;
  completed: number;
  in_progress: number;
  at_risk: number;
  not_started: number;
}

// Define StatCard outside JobsDashboard
interface StatCardProps {
  icon: React.ElementType<LucideProps>;
  title: string;
  value: string | number;
  bgColor: string;
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, bgColor, onClick, isActive }) => (
  <div 
    className={`flex flex-col items-center justify-center ${bgColor} text-white p-4 rounded-lg shadow-md min-h-[120px] ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${isActive ? 'ring-2 ring-offset-2 ring-white' : ''}`}
    onClick={onClick}
  >
    <Icon className="w-10 h-10 mb-2" />
    <div className="text-sm font-medium">{title}</div>
    <div className="text-xl sm:text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
  </div>
);

// Define ClusterCard outside JobsDashboard
interface ClusterCardProps {
  stat: ClusterJobStats & { displayData: JobData, dataType: 'total' | 'women' | 'youth' }; 
  totalCurrentJobsForDataType: number; 
}

const ClusterCard: React.FC<ClusterCardProps> = ({ stat, totalCurrentJobsForDataType }) => {
  const current = stat.displayData.current || 0;
  const target = stat.displayData.target || 0;
  const calculatedPercentage = totalCurrentJobsForDataType > 0 ? Math.round((current / totalCurrentJobsForDataType) * 100) : 0;
  
  let titlePrefix = '';
  if (stat.dataType === 'women') titlePrefix = 'Women ';
  if (stat.dataType === 'youth') titlePrefix = 'Youth ';

  return (
    <div key={stat.id} className={`p-6 rounded-lg shadow-lg text-white ${
      stat.name.toLowerCase().includes('climate') ? 'bg-[#4eab5b] hover:bg-green-700' :
      stat.name.toLowerCase().includes('heritage') ? 'bg-[#bb5f29] hover:bg-orange-600' :
      stat.name.toLowerCase().includes('digital') ? 'bg-[#68389a] hover:bg-purple-700' :
      'bg-[#07225c] hover:bg-blue-800'
    } transition-colors duration-300 min-h-[180px]`}>
      <div className="text-2xl sm:text-3xl font-bold mb-1">{calculatedPercentage}%</div>
      <div className="text-4xl sm:text-5xl font-extrabold mb-2">{current.toLocaleString()}</div>
      <div className="text-sm font-semibold">Target: {target.toLocaleString()}</div>
      <div className="text-xl font-semibold truncate mt-1" title={`${titlePrefix}Jobs in ${stat.name}`}>{`${stat.name}`}</div>
    </div>
  );
};

export function JobsDashboard() {
  const [clusterJobStats, setClusterJobStats] = useState<ClusterJobStats[]>([]);
  const [clusterActionStats, setClusterActionStats] = useState<ClusterActionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
  
        const [jobsData, actionsData] = await Promise.all([
          jobsApi.getJobsByCluster(), 
          jobsApi.getActionStatusByCluster() 
        ]);
  
        setClusterJobStats(jobsData);
        setClusterActionStats(actionsData);
      
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const getTotalJobs = useCallback(() => clusterJobStats.reduce((sum, stat) => sum + stat.total_jobs.current, 0), [clusterJobStats]);
  const getWomenJobs = useCallback(() => clusterJobStats.reduce((sum, stat) => sum + stat.women_jobs.current, 0), [clusterJobStats]);
  const getYouthJobs = useCallback(() => clusterJobStats.reduce((sum, stat) => sum + stat.youth_jobs.current, 0), [clusterJobStats]);
  const getTotalTargetJobs = useCallback(() => clusterJobStats.reduce((sum, stat) => sum + stat.total_jobs.target, 0), [clusterJobStats]);

  const handleStatCardClick = useCallback((filterType: string) => {
    setActiveFilter(prevFilter => (prevFilter === filterType ? null : filterType));
  }, []);

  const filteredClusterJobStats = useMemo(() => {
    if (!activeFilter) {
      return clusterJobStats.map(stat => ({ ...stat, displayData: stat.total_jobs, dataType: 'total' as const }));
    }
    return clusterJobStats.map(stat => {
      let displayData: JobData;
      switch (activeFilter) {
        case 'women':
          displayData = stat.women_jobs;
          break;
        case 'youth':
          displayData = stat.youth_jobs;
          break;
        case 'total':
        default:
          displayData = stat.total_jobs;
          break;
      }
      return { ...stat, displayData, dataType: activeFilter as 'total' | 'women' | 'youth' };
    }); 
  }, [clusterJobStats, activeFilter]);

  const aggregateActionStats = useCallback(() => {
    return clusterActionStats.reduce((acc, stat) => {
      acc.total += stat.total;
      acc.completed += stat.completed;
      acc.on_going_on += stat.in_progress;
      acc.on_going_off += stat.at_risk;
      acc.not_started += stat.not_started;
      return acc;
    }, { total: 0, completed: 0, on_going_on: 0, on_going_off: 0, not_started: 0 });
  }, [clusterActionStats]);

  const overallActionStats = useMemo(() => aggregateActionStats(), [aggregateActionStats]);
  
  const getTotalForDataType = useCallback((dataType: string | null) => {
    if (!dataType || dataType === 'total') return getTotalJobs();
    if (dataType === 'women') return getWomenJobs();
    if (dataType === 'youth') return getYouthJobs();
    return 0;
  }, [getTotalJobs, getWomenJobs, getYouthJobs]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600 bg-red-100 rounded-lg">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={Briefcase} 
          title="Total Jobs" 
          value={getTotalJobs()} 
          bgColor="bg-[#2d71ba]" 
          onClick={() => handleStatCardClick('total')}
          isActive={activeFilter === 'total'}
        />
        <StatCard 
          icon={User} 
          title="Women Jobs" 
          value={getWomenJobs()} 
          bgColor="bg-[#b19acc]" 
          onClick={() => handleStatCardClick('women')}
          isActive={activeFilter === 'women'}
        />
        <StatCard 
          icon={Users} 
          title="Youth Jobs" 
          value={getYouthJobs()} 
          bgColor="bg-[#bed4a8]" 
          onClick={() => handleStatCardClick('youth')}
          isActive={activeFilter === 'youth'}
        />
        <StatCard icon={Settings} title="Total Actions" value={overallActionStats.total} bgColor="bg-[#a8a8a8]" />
      </div>

      {/* Job Categories by Cluster */} 
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredClusterJobStats.length > 0 ? (
          filteredClusterJobStats.map(stat => 
            <ClusterCard 
              key={stat.id} 
              stat={stat} 
              totalCurrentJobsForDataType={getTotalForDataType(activeFilter)} 
            />
          )
        ) : (
          <div className="col-span-full text-center text-gray-500 py-8">
            No jobs to display for the selected filter.
          </div>
        )}
      </div>

      {/* Target vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#07225c] p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center mb-2">
            <Target className="w-8 h-8 mr-3" />
            <span className="text-xl sm:text-2xl font-bold">Target Jobs</span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold">120,000</div>
        </div>
        <div className="bg-[#4cafea] p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center mb-2">
            <Briefcase className="w-8 h-8 mr-3" />
            <span className="text-xl sm:text-2xl font-bold">Actual Jobs Created</span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold">{getTotalJobs().toLocaleString()}</div>
        </div>
      </div>

      {/* Action Status Summary */}
      <div className="bg-slate-700 p-6 rounded-lg shadow-md text-white">
        <div className="flex items-center mb-4">
          <Settings className="w-8 h-8 mr-3" />
          <span className="text-xl sm:text-2xl font-bold">Overall Action Progress</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold">{overallActionStats.total.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Total Actions</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{overallActionStats.completed.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Completed</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{overallActionStats.on_going_on.toLocaleString()}</div>
            <div className="text-sm text-slate-300">On Track</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">{overallActionStats.on_going_off.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Off Track</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{overallActionStats.not_started.toLocaleString()}</div>
            <div className="text-sm text-slate-300">Not Started</div>
          </div>
        </div>
      </div>
    </div>
  );
}