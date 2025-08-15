import React, { useState, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import { projectApi, userApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import { useAuth } from '../../lib/auth';


interface Intervention {
  id: string;
  name: string;
  lead_id: string | null;
  supporting_staffs: string[];
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function AssignmentManagement() {
  const [selectedInterventions, setSelectedActions] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('');

  // Fetch clusters using TanStack Query
  const { data: clusters = [] } = useQuery({
    queryKey: queryKeys.clusters.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clusters')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return (data || []).map((cluster: any) => ({
        ...cluster,
        name: cluster.name || 'Unnamed Cluster',
        totalActivities: 0,
        activitySummary: {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0
        }
      }));
    },
  });

  // Fetch pathways using TanStack Query
  const { data: pathways = [] } = useQuery({
    queryKey: queryKeys.pathways.byCluster(selectedCluster),
    queryFn: async () => {
      if (!selectedCluster) return [];
      const { data, error } = await supabase
        .from('pathways')
        .select('id, name')
        .eq('cluster_id', selectedCluster)
        .order('name');
      
      if (error) throw error;
      return (data || []).map((pathway: any) => ({
        ...pathway,
        name: pathway.name || 'Unnamed Pathway',
        totalActivities: 0,
        activitySummary: {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0
        }
      }));
    },
    enabled: !!selectedCluster,
  });

  // Reset pathway selection when cluster changes
  useEffect(() => {
    if (!selectedCluster) {
      setSelectedPathway('');
    }
  }, [selectedCluster]);

  // Fetch actions using TanStack Query
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: queryKeys.interventions.lists(),
    queryFn: async () => {
      const data = await projectApi.getActions();
      return (data || []).map((action: any) => ({
        ...action,
        name: action.name || 'Unnamed Action',
        totalActivities: 0,
        activitySummary: {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0
        },
        intervention: action.intervention || {
          pathway: {
            cluster: { id: '', name: 'Unknown Cluster' },
            id: '',
            name: 'Unknown Pathway'
          }
        }
      }));
    },
  });

  // Fetch users using TanStack Query
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.auth.users(),
    queryFn: async () => {
      const data = await userApi.getUsers();
      return (data || []).map((user: any) => ({
        ...user,
        full_name: user.full_name || user.email || 'Unknown User',
        totalActivities: 0,
        activitySummary: {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0
        }
      }));
    },
  });

  const loading = actionsLoading || usersLoading;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      
      setSelectedActions(actions.map(i => i.id));
    } else {
      setSelectedActions([]);
    }
  };

  const handleSelectAction = (id: string) => {
   
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

  };

  const handleBulkAssignLead = async () => {
    if (!selectedLead || selectedInterventions.length === 0) return;

    try {
      // TODO: Implement API call for bulk lead assignment

      // Example:
      const ass = await projectApi.updateActionAssignment(selectedInterventions, selectedLead, selectedStaff)
      
      // console.log(ass)

      console.log('Assigning lead:', selectedLead, 'to actions:', selectedInterventions);
    } catch (error) {
      console.error('Error assigning lead:', error);
    }
  };

  const isleadOrsupportSeleted = ():boolean => {
    const hasLead = selectedLead !== '';
    const hasStaff = selectedStaff.length > 0;
    
    // Return true if either lead or staff is selected, but not both
    return (hasLead || hasStaff) && !(hasLead && hasStaff);
  }



  const handleBulkAssignStaff = async () => {
    if (selectedStaff.length === 0 || selectedInterventions.length === 0) return;

    try {
      // TODO: Implement API call for bulk staff assignment
      const ass = projectApi.updateInterventionAssignment(selectedInterventions, selectedStaff)

      console.log('Assigning staff:', selectedStaff, 'to actions:', selectedInterventions);
    } catch (error) {
      console.error('Error assigning staff:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Management</h1>
        <div className="flex space-x-4">
          <select
            className="border rounded-md p-2"
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
          >
            <option value="">All Clusters</option>
            {clusters.map(cluster => (
              <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
            ))}
          </select>
          <select
            className="border rounded-md p-2"
            value={selectedPathway}
            onChange={(e) => setSelectedPathway(e.target.value)}
            disabled={!selectedCluster}
          >
            <option value="">All Pathways</option>
            {pathways.map(pathway => (
              <option key={pathway.id} value={pathway.id}>{pathway.name}</option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              placeholder="Search actions..."
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <select
              className="border rounded-md p-2"
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
            >
              <option value="">Select Lead...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user?.full_name}</option>
              ))}
            </select>
            <select
              className="border rounded-md p-2 w-60"
              multiple
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(Array.from(e.target.selectedOptions, option => option.value))}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAssignLead}
              disabled={isleadOrsupportSeleted && selectedInterventions.length === 0 }
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              <Check className="h-4 w-4 mr-2" />
              Assign
            </button>
            {/* <button
              onClick={handleBulkAssignStaff}
              disabled={selectedStaff.length === 0 || selectedInterventions.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              <Check className="h-4 w-4 mr-2" />
              Assign Supporting Staff
            </button> */}
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedInterventions.length === actions.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supporting Staff
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {actions
              .filter(intervention => {
                const matchesSearch = intervention.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCluster = !selectedCluster || intervention?.intervention.pathway.cluster.id === selectedCluster;
                const matchesPathway = !selectedPathway || intervention?.intervention.pathway.id === selectedPathway;
                return matchesSearch && matchesCluster && matchesPathway;
              })
              .map((intervention) => (
                <tr key={intervention.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInterventions.includes(intervention.id)}
                      onChange={() => handleSelectAction(intervention.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">
                    {intervention.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {users.find(u => u.id === intervention.lead_id)?.full_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Array.isArray(intervention?.supporting_staff) 
                      ? intervention.supporting_staff
                          .map(id => users?.find(u => u.id === id)?.full_name)
                          .filter(Boolean)
                          .join(', ') 
                      : '-'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}