import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Plus, ChevronRight, Network, EarthIcon, LucideHeartHandshake, List, LucideComputer, LucideGraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Cluster } from '../types/project';

export function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select(`
          *,
          pathways (
            id,
            interventions (
              id,
              status
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClusters(data as Cluster[]);
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClusterStats = (cluster: Cluster) => {
    const pathwayCount = cluster.pathways?.length || 0;
    const interventionCount = cluster.pathways?.reduce((sum, pathway) => 
      sum + (pathway.interventions?.length || 0), 0) || 0;
    
    return { pathwayCount, interventionCount };
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...clusters].sort((a, b) => String(a.code).localeCompare(String(b.code))).map((cluster) => {
        const { pathwayCount, interventionCount } = getClusterStats(cluster);
        return (
          <div
            key={cluster.id}
            onClick={() => navigate(`/clusters/${cluster.id}`)}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                  {/* Generate a unique icon based on cluster code/id */}
                  {cluster.code == 1 ? (
                    <EarthIcon className="h-6 w-6 text-blue-600" />
                  ) : cluster.code == 4 ? (
                    <LucideGraduationCap className="h-6 w-6 text-blue-600" />
                  ) : cluster.code == 2 ? (
                    <LucideHeartHandshake className="h-6 w-6 text-blue-600" />
                  ) : (
                    <LucideComputer className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center">
                  <h4 className="text-lg font-medium text-gray-800">{cluster.code}. </h4>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {cluster.name}
                  </h3>
                </div>
              </div>
              {cluster.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {cluster.description}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="space-y-1">
                  <div>{pathwayCount} Pathways</div>
                  <div>{interventionCount} Interventions</div>
                </div>
                <div className="flex items-center text-blue-600">
                  <span>View details</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
           <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pathways
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Interventions
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...clusters].sort((a, b) => String(a.code).localeCompare(String(b.code))).map((cluster) => {
            const { pathwayCount, interventionCount } = getClusterStats(cluster);
            return (
              <tr
                key={cluster.id}
                onClick={() => navigate(`/clusters/${cluster.id}`)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{cluster.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-md font-medium semi-bold text-gray-900">{cluster.name}</div>
                  {cluster.description && (
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {cluster.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pathwayCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {interventionCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(cluster.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end text-blue-600">
                    <span>View</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Network className="h-4 w-4 mr-2" />
                Grid View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                Table View
              </button>
            </div>
            <button
              onClick={() => navigate('/clusters/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Cluster
            </button>
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No clusters</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new cluster.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/clusters/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Cluster
              </button>
            </div>
          </div>
        ) : (
          viewMode === 'table' ? renderTableView() : renderGridView()
        )}
      </div>
    </DashboardLayout>
  );
}