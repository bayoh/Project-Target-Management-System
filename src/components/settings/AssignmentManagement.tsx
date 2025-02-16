import React, { useState, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import { projectApi, userApi } from '../../lib/api'
import {supabase} from '../../lib/supabase'


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
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<{ id: string; name: string }[]>([]);
  const [pathways, setPathways] = useState<{ id: string; name: string }[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('');

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const { data, error } = await supabase
          .from('clusters')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setClusters(data || []);
      } catch (error) {
        console.error('Error fetching clusters:', error);
      }
    };

    fetchClusters();
  }, []);

  useEffect(() => {
    const fetchPathways = async () => {
      if (!selectedCluster) {
        setPathways([]);
        setSelectedPathway('');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pathways')
          .select('id, name')
          .eq('cluster_id', selectedCluster)
          .order('name');

        if (error) throw error;
        setPathways(data || []);
      } catch (error) {
        console.error('Error fetching pathways:', error);
      }
    };

    fetchPathways();
  }, [selectedCluster]);

  useEffect(() => {
    // TODO: Fetch interventions and users from API
    const fetchData = async () => {
      try {
        // Implement API calls here
        // Example:
        const data = await projectApi.getInterventions();
        const users = await userApi.getUsers()

        setInterventions(data)
        setUsers(users)
        console.log(data)

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInterventions(interventions.map(i => i.id));
    } else {
      setSelectedInterventions([]);
    }
  };

  const handleSelectIntervention = (id: string) => {
    setSelectedInterventions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAssignLead = async () => {
    // if (!selectedLead || selectedInterventions.length === 0) return;

    try {
      // TODO: Implement API call for bulk lead assignment

      // Example:
      const ass = projectApi.updateInterventionAssignment(selectedInterventions, selectedLead, selectedStaff)
      console.log(ass)

      console.log('Assigning lead:', selectedLead, 'to interventions:', selectedInterventions);
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

      console.log('Assigning staff:', selectedStaff, 'to interventions:', selectedInterventions);
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
              placeholder="Search interventions..."
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
                  checked={selectedInterventions.length === interventions.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                Intervention
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
            {interventions
              .filter(intervention => {
                const matchesSearch = intervention.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCluster = !selectedCluster || intervention?.pathway.cluster.id === selectedCluster;
                const matchesPathway = !selectedPathway || intervention?.pathway_id === selectedPathway;
                return matchesSearch && matchesCluster && matchesPathway;
              })
              .map((intervention) => (
                <tr key={intervention.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInterventions.includes(intervention.id)}
                      onChange={() => handleSelectIntervention(intervention.id)}
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
                    {Array.isArray(intervention?.supporting_staffs) 
                      ? intervention.supporting_staffs
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