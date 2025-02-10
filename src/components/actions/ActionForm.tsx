import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Action, User } from '../../types/project';
import { AlertTriangle, Plus } from 'lucide-react';

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

export function ActionForm({ interventionId, action, onSuccess, onCancel }: ActionFormProps) {
  const [formData, setFormData] = useState({
    name: action?.name || '',
    description: action?.description || '',
    status: action?.status || 'not_started',
    start_date: action?.start_date || '',
    end_date: action?.end_date || '',
    lead_id: action?.lead_id || '',
    supporting_staff: action?.supporting_staff || [],
    budget: action?.budget?.toString() || '',
    implementing_partner_id: action?.implementing_partner_id || '',
    associated_project_id: action?.associated_project_id || ''
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

      const actionData = {
        intervention_id: interventionId,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        lead_id: formData.lead_id || null,
        supporting_staff: formData.supporting_staff,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        implementing_partner_id: formData.implementing_partner_id || null,
        associated_project_id: formData.associated_project_id || null,
        created_by: user.id
      };

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
      if (onSuccess && data) onSuccess(data as Action);
    } catch (err: any) {
      console.error('Error saving action:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('implementing_partners')
        .insert([{
          name: newPartner.name,
          description: newPartner.description,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setPartners([...partners, data]);
      setFormData({ ...formData, implementing_partner_id: data.id });
      setShowNewPartnerForm(false);
      setNewPartner({ name: '', description: '' });
    } catch (err: any) {
      console.error('Error adding partner:', err);
      setError(err.message);
    }
  };

  const handleAddProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('associated_projects')
        .insert([{
          name: newProject.name,
          description: newProject.description,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setProjects([...projects, data]);
      setFormData({ ...formData, associated_project_id: data.id });
      setShowNewProjectForm(false);
      setNewProject({ name: '', description: '' });
    } catch (err: any) {
      console.error('Error adding project:', err);
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3x">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 p-2 block w-full rounded-md border-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            id="end_date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="at_risk">At Risk</option>
          <option value="completed">Completed</option>
        </select>
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

      <div>
        <label htmlFor="implementing_partner" className="block text-sm font-medium text-gray-700">
          Implementing Partner
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <select
            id="implementing_partner"
            value={formData.implementing_partner_id}
            onChange={(e) => setFormData({ ...formData, implementing_partner_id: e.target.value })}
            className="block p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a partner</option>
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
            id="associated_project"
            value={formData.associated_project_id}
            onChange={(e) => setFormData({ ...formData, associated_project_id: e.target.value })}
            className="block p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a project</option>
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

      <div>
        <label htmlFor="lead" className="block text-sm font-medium text-gray-700">
          Lead
        </label>
        <select
          id="lead"
          value={formData.lead_id}
          onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a lead</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
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
          onChange={(e) => setFormData({
            ...formData,
            supporting_staff: Array.from(e.target.selectedOptions, option => option.value)
          })}
          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Hold Ctrl/Cmd to select multiple staff members
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : action ? 'Update Action' : 'Create Action'}
        </button>
      </div>

      {/* New Partner Form Modal */}
      {showNewPartnerForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Partner</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="partner_name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
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
                <label htmlFor="partner_description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="partner_description"
                  value={newPartner.description}
                  onChange={(e) => setNewPartner({ ...newPartner, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPartnerForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Project Form Modal */}
      {showNewProjectForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Project</h3>
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