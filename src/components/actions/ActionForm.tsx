import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Action, User, ProjectStatus } from '../../types/project';
import { AlertTriangle, Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useActivityTracking } from '../../hooks/useActivityTracking';

interface Partner {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface ActionFormProps {
  interventionId: string;
  action?: Action;
  onSuccess?: (action: Action) => void;
  onCancel?: () => void;
}

// Define local form state to ensure proper typing for status as ProjectStatus
interface ActionFormState {
  name: string;
  code: string | number;
  description: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  actual_startDate: string;
  actual_endDate: string;
  lead_id: string;
  supporting_staff: string[];
  budget: string;
  implementing_partner_id?: string;
  implementing_partners: string[];
  associated_project_id?: string;
  associated_projects: string[];
}

// Type guard for ProjectStatus
function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === 'not_started' ||
    value === 'in_progress' ||
    value === 'at_risk' ||
    value === 'completed'
  );
}

export function ActionForm({ interventionId, action, onSuccess, onCancel }: ActionFormProps) {
  const { trackCreate, trackUpdate } = useActivityTracking();
  const [formData, setFormData] = useState<ActionFormState>({
    name: action?.name || '',
    code: action?.code || '',
    description: action?.description || '',
    status: (action?.status as ProjectStatus) || 'not_started',
    start_date: action?.start_date || '',
    end_date: action?.end_date || '',
    actual_startDate: action?.actual_startDate || '',
    actual_endDate: action?.actual_endDate || '',
    lead_id: action?.lead_id || '',
    supporting_staff: action?.supporting_staff || [],
    budget: action?.budget?.toString() || '',
    implementing_partner_id: (action as any)?.implementing_partner_id || '',
    implementing_partners: action?.implementing_partners || [],
    associated_project_id: (action as any)?.associated_project_id || '',
    associated_projects: action?.associated_projects || []
  });

  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPartnerForm, setShowNewPartnerForm] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', description: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  React.useEffect(() => {
    loadUsers();
    loadPartners();
    loadProjects();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('implementing_partners')
        .select('*')
        .order('name');

      if (error) throw error;
      setPartners(data);
    } catch (err) {
      console.error('Error loading partners:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('associated_projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const actionData: any = {
        intervention_id: interventionId,
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        actual_startDate: formData.actual_startDate || null,
        actual_endDate: formData.actual_endDate || null,
        lead_id: formData.lead_id || null,
        supporting_staff: formData.supporting_staff,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        created_by: user.id
      };

      // Optional fields kept for backward compatibility if present in DB
      if ((formData as any).implementing_partner_id !== undefined) {
        actionData.implementing_partner_id = (formData as any).implementing_partner_id || null;
      }
      if ((formData as any).associated_project_id !== undefined) {
        actionData.associated_project_id = (formData as any).associated_project_id || null;
      }
      if (Array.isArray(formData.implementing_partners)) {
        actionData.implementing_partners = formData.implementing_partners;
      }
      if (Array.isArray(formData.associated_projects)) {
        actionData.associated_projects = formData.associated_projects;
      }

      const { data, error } = action
        ? await supabase
            .from('actions')
            .update(actionData)
            .eq('id', action.id)
            .select()
            .single()
        : await supabase
            .from('actions')
            .insert([actionData])
            .select()
            .single();

      if (error) throw error;
      
      // Track activity
      if (data) {
        if (action) {
          await trackUpdate('action', (data as any).id, {
            intervention_id: interventionId,
            name: (data as any).name,
            status: (data as any).status
          });
        } else {
          await trackCreate('action', (data as any).id, {
            intervention_id: interventionId,
            name: (data as any).name,
            status: (data as any).status
          });
        }
      }
      
      if (onSuccess && data) onSuccess(data as Action);
    } catch (err: any) {
      console.error('Error saving action:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('implementing_partners')
        .insert([{ name: newPartner.name.trim(), description: newPartner.description.trim() }])
        .select()
        .single();

      if (error) throw error;

      setPartners(prev => [...prev, data]);
      setShowNewPartnerForm(false);
      setNewPartner({ name: '', description: '' });
    } catch (err) {
      console.error('Error adding partner:', err);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('associated_projects')
        .insert([{ name: newProject.name.trim(), description: newProject.description.trim() }])
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [...prev, data]);
      setShowNewProjectForm(false);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">There was an error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <Input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Code
          </label>
          <Input
            type="text"
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            Planned Start Date
          </label>
          <input
            type="date"
            id="start_date"
            value={formData.start_date || ''}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            Planned End Date
          </label>
          <input
            type="date"
            id="end_date"
            value={formData.end_date || ''}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 mt-2 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="actual_start_date" className="block text-sm font-medium text-gray-700">
            Actual Start Date
          </label>
          <input
            type="date"
            id="actual_start_date"
            value={formData.actual_startDate || ''}
            onChange={(e) => setFormData({ ...formData, actual_startDate: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700">
            Actual End Date
          </label>
          <input
            type="date"
            id="actual_end_date"
            value={formData.actual_endDate || ''}
            onChange={(e) => setFormData({ ...formData, actual_endDate: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">

      
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <Select
          value={formData.status}
          onChange={(value) => {
            const v = Array.isArray(value) ? value[0] : value;
            if (isProjectStatus(v)) {
              setFormData({ ...formData, status: v });
            }
          }}
          placeholder='Status'
          options={[
            { label: 'Not Started', value: 'not_started' },
            { label: 'On Going/On Track', value: 'in_progress' },
            { label: 'On Going/Off Track', value: 'at_risk' },
            { label: 'Completed', value: 'completed' },     
          ]}
          allowClear={false}
        />
      </div>

      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
          Budget
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            id="budget"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            className="p-2 pl-6 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
      <div>
        <label htmlFor="implementing_partner" className="block text-sm font-medium text-gray-700">
          Implementing Partner
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <select
            id="implementing_partners"
            multiple
            value={formData.implementing_partners}
            onChange={(e) => setFormData({ ...formData, implementing_partners: Array.from(e.target.selectedOptions).map((option) => option.value) })}
            className="block p-2 w-full h-36 sm:h-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm overflow-auto"
          >
            <option value="">Select partners</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewPartnerForm(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="associated_project" className="block text-sm font-medium text-gray-700">
          Associated Project
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <select
            id="associated_projects"
            multiple
            value={formData.associated_projects}
            onChange={(e) => setFormData({ ...formData, associated_projects: Array.from(e.target.selectedOptions, option => option.value) })}
            className="block p-2 w-full h-36 sm:h-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm overflow-auto"
          >
            <option value="">Select projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewProjectForm(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </button>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="lead_id" className="block text-sm font-medium text-gray-700">
            Lead
          </label>
          <select
            id="lead_id"
            value={formData.lead_id}
            onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select Lead</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="supporting_staff" className="block text-sm font-medium text-gray-700">
            Supporting Staff
          </label>
          <select
            id="supporting_staff"
            multiple
            value={formData.supporting_staff}
            onChange={(e) => setFormData({ ...formData, supporting_staff: Array.from(e.target.selectedOptions).map((option) => option.value) })}
            className="mt-1 p-2 block w-full h-36 sm:h-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple staff members</p>
        </div>
      </div>

      <div className="flex sticky bottom-0 bg-white pb-4 pt-1 space-x-4 justify-end border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (action ? 'Updating...' : 'Creating...') : (action ? 'Update Action' : 'Create Action')}
        </button>
      </div>

      {/* New Partner Modal */}
      {showNewPartnerForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Implementing Partner</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="partner_name" className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      id="partner_name"
                      required
                      value={newPartner.name}
                      onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="partner_description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="partner_description"
                      value={newPartner.description}
                      onChange={(e) => setNewPartner({ ...newPartner, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Partner
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPartnerForm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="relative w-full max-w-md transform rounded-lg bg-white p-4 sm:p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {action ? 'Edit Action' : 'Add New Action'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="project_name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="project_name"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="project_description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="project_description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}