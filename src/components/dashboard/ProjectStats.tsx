import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Target,
  Users,
  UserCheck,
  UserPlus,
  Briefcase,
  BarChart2
} from 'lucide-react';
import { projectApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ActionTarget {
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
}

interface JobStats {
  totalTarget: number;
  totalCurrent: number;
  womenTarget: number;
  womenCurrent: number;
  youthTarget: number;
  youthCurrent: number;
}

export function ProjectStats() {
  const [stats, setStats] = useState<{
    projects: Record<string, number>;
    tasks: Record<string, number>;
  }>({
    projects: {},
    tasks: {}
  });

  const [targets, setTargets] = useState<ActionTarget[]>([]);
  const [jobStats, setJobStats] = useState<JobStats>({
    totalTarget: 0,
    totalCurrent: 0,
    womenTarget: 0,
    womenCurrent: 0,
    youthTarget: 0,
    youthCurrent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, targetsData, jobsData] = await Promise.all([
          projectApi.getProjectStats(),
          loadTargets(),
          loadJobStats()
        ]);
        setStats(statsData);
        setTargets(targetsData || []);
        if (jobsData) {
          setJobStats(jobsData);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadTargets = async () => {
    const { data, error } = await supabase
      .from('action_targets')
      .select(`
        *,
        action:actions(
          name,
          intervention:interventions(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  };

  const loadJobStats = async () => {
    try {
      // First get all job targets
      const { data: jobTargets, error: jobError } = await supabase
        .from('action_targets')
        .select('*')
        .eq('category', 'jobs');

      if (jobError) throw jobError;

      // Initialize stats
      const stats: JobStats = {
        totalTarget: 0,
        totalCurrent: 0,
        womenTarget: 0,
        womenCurrent: 0,
        youthTarget: 0,
        youthCurrent: 0
      };

      // Aggregate the stats
      jobTargets.forEach(target => {
        // Total jobs
        if (target.target_value) {
          stats.totalTarget += Number(target.target_value);
        }
        if (target.current_value) {
          stats.totalCurrent += Number(target.current_value);
        }

        // Women jobs
        if (target.women_target) {
          stats.womenTarget += Number(target.women_target);
        }
        if (target.women_current) {
          stats.womenCurrent += Number(target.women_current);
        }

        // Youth jobs
        if (target.youth_target) {
          stats.youthTarget += Number(target.youth_target);
        }
        if (target.youth_current) {
          stats.youthCurrent += Number(target.youth_current);
        }
      });

      return stats;
    } catch (error) {
      console.error('Error loading job stats:', error);
      return null;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100); // Cap at 100%
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Creation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Jobs */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Total Jobs</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">{jobStats.totalCurrent}</span>
                <span className="text-lg opacity-75">/ {jobStats.totalTarget}</span>
              </div>
            </div>
            <Briefcase className="h-10 w-10 opacity-75" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgress(jobStats.totalCurrent, jobStats.totalTarget).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${calculateProgress(jobStats.totalCurrent, jobStats.totalTarget)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Women Jobs */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Women Jobs</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">{jobStats.womenCurrent}</span>
                <span className="text-lg opacity-75">/ {jobStats.womenTarget}</span>
              </div>
            </div>
            <UserCheck className="h-10 w-10 opacity-75" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgress(jobStats.womenCurrent, jobStats.womenTarget).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${calculateProgress(jobStats.womenCurrent, jobStats.womenTarget)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Youth Jobs */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Youth Jobs</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">{jobStats.youthCurrent}</span>
                <span className="text-lg opacity-75">/ {jobStats.youthTarget}</span>
              </div>
            </div>
            <UserPlus className="h-10 w-10 opacity-75" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgress(jobStats.youthCurrent, jobStats.youthTarget).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${calculateProgress(jobStats.youthCurrent, jobStats.youthTarget)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Actions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.values(stats.projects).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.projects.in_progress || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">At Risk</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.projects.at_risk || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.projects.completed || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tracked Targets */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Tracked Targets</h3>
          <div className="p-2 bg-blue-100 rounded-full">
            <BarChart2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="space-y-6">
          {targets.map((target) => (
            <div key={target.id} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {target.action?.intervention?.name} - {target.action?.name}
                  </h4>
                  <p className="text-sm text-gray-500">{target.description}</p>
                </div>
                {target.category && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {target.category}
                  </span>
                )}
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {calculateProgress(target.current_value, target.target_value).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {target.current_value} / {target.target_value} {target.metric}
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                  <div
                    style={{ width: `${calculateProgress(target.current_value, target.target_value)}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  />
                </div>
                {target.category === 'jobs' && (target.women_target || target.youth_target) && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {target.women_target && (
                      <div className="text-xs">
                        <span className="text-purple-600 font-medium">Women:</span>{' '}
                        {target.women_current || 0} / {target.women_target}
                      </div>
                    )}
                    {target.youth_target && (
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">Youth:</span>{' '}
                        {target.youth_current || 0} / {target.youth_target}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {targets.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No targets tracked yet</p>
          )}
        </div>
      </div>
    </div>
  );
}