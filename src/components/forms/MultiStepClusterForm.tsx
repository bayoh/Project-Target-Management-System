import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { User } from '../../types/auth';
import { useActivityTracking } from '../../hooks/useActivityTracking';

interface FormData {
  cluster: {
    name: string;
    description: string | null;
  };
  pathways: Array<{
    name: string;
    description: string | null;
    interventions: Array<{
      name: string;
      description: string | null;
      status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
      start_date: string | null;
      end_date: string | null;
      budget: number | null;
      lead_id: string | null;
      actions: Array<{
        name: string;
        description: string | null;
        status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
        start_date: string | null;
        end_date: string | null;
        lead_id: string | null;
        supporting_staff: string[];
        tasks: Array<{
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'delayed';
          assigned_to: string | null;
          due_date: string | null;
        }>;
      }>;
    }>;
  }>;
}

const INITIAL_FORM_DATA: FormData = {
  cluster: {
    name: '',
    description: null,
  },
  pathways: [{
    name: '',
    description: null,
    interventions: [{
      name: '',
      description: null,
      status: 'not_started',
      start_date: null,
      end_date: null,
      budget: null,
      lead_id: null,
      actions: [{
        name: '',
        description: null,
        status: 'not_started',
        start_date: null,
        end_date: null,
        lead_id: null,
        supporting_staff: [],
        tasks: [{
          title: '',
          description: null,
          status: 'pending',
          assigned_to: null,
          due_date: null,
        }],
      }],
    }],
  }],
};

export function MultiStepClusterForm() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { trackCreate } = useActivityTracking();

  useEffect(() => {
    // Get the current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users_view')
        .select('id, email')
        .order('email');

      if (error) throw error;
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Start with cluster creation
      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .insert([{
          name: formData.cluster.name,
          description: formData.cluster.description,
          created_by: currentUser.id
        }])
        .select()
        .single();

      if (clusterError) throw clusterError;
      if (!cluster) throw new Error('Failed to create cluster');

      // Track cluster creation
      await trackCreate('cluster', cluster.id, {
        name: formData.cluster.name,
        description: formData.cluster.description
      });

      // Process each pathway
      for (const pathway of formData.pathways) {
        // Create pathway
        const { data: pathwayData, error: pathwayError } = await supabase
          .from('pathways')
          .insert([{
            name: pathway.name,
            description: pathway.description,
            cluster_id: cluster.id,
            created_by: currentUser.id
          }])
          .select()
          .single();

        if (pathwayError) throw pathwayError;
        if (!pathwayData) throw new Error('Failed to create pathway');

        // Process interventions for this pathway
        for (const intervention of pathway.interventions) {
          // Create intervention
          const { data: interventionData, error: interventionError } = await supabase
            .from('interventions')
            .insert([{
              name: intervention.name,
              description: intervention.description,
              status: intervention.status,
              start_date: intervention.start_date,
              end_date: intervention.end_date,
              budget: intervention.budget,
              lead_id: intervention.lead_id,
              pathway_id: pathwayData.id,
              created_by: currentUser.id
            }])
            .select()
            .single();

          if (interventionError) throw interventionError;
          if (!interventionData) throw new Error('Failed to create intervention');

          // Process actions for this intervention
          for (const action of intervention.actions) {
            // Create action
            const { data: actionData, error: actionError } = await supabase
              .from('actions')
              .insert([{
                name: action.name,
                description: action.description,
                status: action.status,
                start_date: action.start_date,
                end_date: action.end_date,
                lead_id: action.lead_id,
                supporting_staff: action.supporting_staff,
                intervention_id: interventionData.id,
                created_by: currentUser.id
              }])
              .select()
              .single();

            if (actionError) throw actionError;
            if (!actionData) throw new Error('Failed to create action');

            // Process tasks for this action
            for (const task of action.tasks) {
              // Create task
              const { error: taskError } = await supabase
                .from('tasks')
                .insert([{
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  assigned_to: task.assigned_to,
                  due_date: task.due_date,
                  action_id: actionData.id,
                  created_by: currentUser.id
                }]);

              if (taskError) throw taskError;
            }
          }
        }
      }

      // If we get here, everything was successful
      navigate('/clusters');
    } catch (err: any) {
      console.error('Error creating cluster:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Cluster Details',
      component: (
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Cluster Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.cluster.name}
              onChange={(e) => setFormData({
                ...formData,
                cluster: { ...formData.cluster, name: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.cluster.description || ''}
              onChange={(e) => setFormData({
                ...formData,
                cluster: { ...formData.cluster, description: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Pathways',
      component: (
        <div className="space-y-6">
          {formData.pathways.map((pathway, pathwayIndex) => (
            <div key={pathwayIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">Pathway {pathwayIndex + 1}</h3>
                {formData.pathways.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      pathways: formData.pathways.filter((_, i) => i !== pathwayIndex)
                    })}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={pathway.name}
                  onChange={(e) => {
                    const newPathways = [...formData.pathways];
                    newPathways[pathwayIndex].name = e.target.value;
                    setFormData({ ...formData, pathways: newPathways });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={pathway.description || ''}
                  onChange={(e) => {
                    const newPathways = [...formData.pathways];
                    newPathways[pathwayIndex].description = e.target.value;
                    setFormData({ ...formData, pathways: newPathways });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              pathways: [...formData.pathways, {
                name: '',
                description: null,
                interventions: [{
                  name: '',
                  description: null,
                  status: 'not_started',
                  start_date: null,
                  end_date: null,
                  budget: null,
                  lead_id: null,
                  actions: [{
                    name: '',
                    description: null,
                    status: 'not_started',
                    start_date: null,
                    end_date: null,
                    lead_id: null,
                    supporting_staff: [],
                    tasks: [{
                      title: '',
                      description: null,
                      status: 'pending',
                      assigned_to: null,
                      due_date: null,
                    }],
                  }],
                }],
              }],
            })}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pathway
          </button>
        </div>
      ),
    },
    {
      title: 'Interventions',
      component: (
        <div className="space-y-8">
          {formData.pathways.map((pathway, pathwayIndex) => (
            <div key={pathwayIndex} className="space-y-6">
              <h3 className="text-lg font-medium">
                Interventions for {pathway.name || `Pathway ${pathwayIndex + 1}`}
              </h3>

              {pathway.interventions.map((intervention, interventionIndex) => (
                <div key={interventionIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-md font-medium">Intervention {interventionIndex + 1}</h4>
                    {pathway.interventions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions = pathway.interventions.filter(
                            (_, i) => i !== interventionIndex
                          );
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={intervention.name}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].name = e.target.value;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lead</label>
                      <select
                        value={intervention.lead_id || ''}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].lead_id = e.target.value || null;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select a lead</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        rows={2}
                        value={intervention.description || ''}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].description = e.target.value;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={intervention.start_date || ''}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].start_date = e.target.value;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={intervention.end_date || ''}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].end_date = e.target.value;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Budget</label>
                      <input
                        type="number"
                        value={intervention.budget || ''}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].budget = parseFloat(e.target.value) || null;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={intervention.status}
                        onChange={(e) => {
                          const newPathways = [...formData.pathways];
                          newPathways[pathwayIndex].interventions[interventionIndex].status = e.target.value as any;
                          setFormData({ ...formData, pathways: newPathways });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                <option value="off_track">Off Track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newPathways = [...formData.pathways];
                  newPathways[pathwayIndex].interventions.push({
                    name: '',
                    description: null,
                    status: 'not_started',
                    start_date: null,
                    end_date: null,
                    budget: null,
                    lead_id: null,
                    actions: [{
                      name: '',
                      description: null,
                      status: 'not_started',
                      start_date: null,
                      end_date: null,
                      lead_id: null,
                      supporting_staff: [],
                      tasks: [{
                        title: '',
                        description: null,
                        status: 'pending',
                        assigned_to: null,
                        due_date: null,
                      }],
                    }],
                  });
                  setFormData({ ...formData, pathways: newPathways });
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Intervention
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Actions',
      component: (
        <div className="space-y-8">
          {formData.pathways.map((pathway, pathwayIndex) => (
            pathway.interventions.map((intervention, interventionIndex) => (
              <div key={`${pathwayIndex}-${interventionIndex}`} className="space-y-6">
                <h3 className="text-lg font-medium">
                  Actions for {intervention.name || `Intervention ${interventionIndex + 1}`}
                </h3>

                {intervention.actions.map((action, actionIndex) => (
                  <div key={actionIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-md font-medium">Action {actionIndex + 1}</h4>
                      {intervention.actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions = intervention.actions.filter(
                              (_, i) => i !== actionIndex
                            );
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          required
                          value={action.name}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].name = e.target.value;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Lead</label>
                        <select
                          value={action.lead_id || ''}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].lead_id = e.target.value || null;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select a lead</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Supporting Staff</label>
                        <select
                          multiple
                          value={action.supporting_staff}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].supporting_staff = Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            );
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.email}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple staff members</p>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          rows={2}
                          value={action.description || ''}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].description = e.target.value;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                          type="date"
                          value={action.start_date || ''}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].start_date = e.target.value;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                          type="date"
                          value={action.end_date || ''}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].end_date = e.target.value;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={action.status}
                          onChange={(e) => {
                            const newPathways = [...formData.pathways];
                            newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].status = e.target.value as any;
                            setFormData({ ...formData, pathways: newPathways });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="on_track">On Track</option>
                  <option value="off_track">Off Track</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const newPathways = [...formData.pathways];
                    newPathways[pathwayIndex].interventions[interventionIndex].actions.push({
                      name: '',
                      description: null,
                      status: 'not_started',
                      start_date: null,
                      end_date: null,
                      lead_id: null,
                      supporting_staff: [],
                      tasks: [{
                        title: '',
                        description: null,
                        status: 'pending',
                        assigned_to: null,
                        due_date: null,
                      }],
                    });
                    setFormData({ ...formData, pathways: newPathways });
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </button>
              </div>
            ))
          ))}
        </div>
      ),
    },
    {
      title: 'Tasks',
      component: (
        <div className="space-y-8">
          {formData.pathways.map((pathway, pathwayIndex) => (
            pathway.interventions.map((intervention, interventionIndex) => (
              intervention.actions.map((action, actionIndex) => (
                <div key={`${pathwayIndex}-${interventionIndex}-${actionIndex}`} className="space-y-6">
                  <h3 className="text-lg font-medium">
                    Tasks for {action.name || `Action ${actionIndex + 1}`}
                  </h3>

                  {action.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="text-md font-medium">Task {taskIndex + 1}</h4>
                        {action.tasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks = action.tasks.filter(
                                (_, i) => i !== taskIndex
                              );
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className=" h-5 w-5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            required
                            value={task.title}
                            onChange={(e) => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks[taskIndex].title = e.target.value;
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                          <select
                            value={task.assigned_to || ''}
                            onChange={(e) => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks[taskIndex].assigned_to = e.target.value || null;
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="">Select assignee</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.email}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            rows={2}
                            value={task.description || ''}
                            onChange={(e) => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks[taskIndex].description = e.target.value;
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Due Date</label>
                          <input
                            type="date"
                            value={task.due_date || ''}
                            onChange={(e) => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks[taskIndex].due_date = e.target.value;
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={task.status}
                            onChange={(e) => {
                              const newPathways = [...formData.pathways];
                              newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks[taskIndex].status = e.target.value as any;
                              setFormData({ ...formData, pathways: newPathways });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="on_track">On Track</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newPathways = [...formData.pathways];
                      newPathways[pathwayIndex].interventions[interventionIndex].actions[actionIndex].tasks.push({
                        title: '',
                        description: null,
                        status: 'pending',
                        assigned_to: null,
                        due_date: null,
                      });
                      setFormData({ ...formData, pathways: newPathways });
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </button>
                </div>
              ))
            ))
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={
                `whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm 
                ${i === step
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>

      <div>{steps[step].component}</div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </button>

        {step === steps.length - 1 ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Cluster'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
}