import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function NewTarget() {
  const [formData, setFormData] = useState({
    action_id: '',
    description: '',
    metric: '',
    baseline_value: '',
    target_value: '',
    current_value: '',
    category: '',
    women_target: '',
    women_current: '',
    youth_target: '',
    youth_current: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<{id: string, name: string, intervention_name: string}[]>([]);
  const navigate = useNavigate();
  const isJobTarget = formData.category === 'jobs';

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          id,
          name,
          intervention:interventions(name)
        `);

      if (error) throw error;
      
      const formattedActions = data?.map(action => ({
        id: action.id,
        name: action.name,
        intervention_name: action.intervention?.name || 'Unknown'
      })) || [];
      
      setActions(formattedActions);
    } catch (err: any) {
      console.error('Error loading actions:', err);
      setError('Failed to load actions. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.action_id || !formData.description || !formData.metric || 
          !formData.baseline_value || !formData.target_value || !formData.current_value) {
        throw new Error('Please fill in all required fields');
      }

      const { data, error } = await supabase
        .from('action_targets')
        .insert([
          {
            action_id: formData.action_id,
            description: formData.description,
            metric: formData.metric,
            baseline_value: parseFloat(formData.baseline_value),
            target_value: parseFloat(formData.target_value),
            current_value: parseFloat(formData.current_value),
            category: formData.category || null,
            women_target: formData.women_target ? parseFloat(formData.women_target) : null,
            women_current: formData.women_current ? parseFloat(formData.women_current) : null,
            youth_target: formData.youth_target ? parseFloat(formData.youth_target) : null,
            youth_current: formData.youth_current ? parseFloat(formData.youth_current) : null
          }
        ])
        .select();

      if (error) throw error;
      
      // Navigate back to the targets list
      navigate('/targets/tracking');
    } catch (err: any) {
      console.error('Error creating target:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6" />
        <h1 className="text-2xl font-bold">New Target</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action <span className="text-red-500">*</span>
            </label>
            <select
              name="action_id"
              value={formData.action_id}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select an action</option>
              {actions.map(action => (
                <option key={action.id} value={action.id}>
                  {action.name} ({action.intervention_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              <option value="jobs">Jobs</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="metric"
              value={formData.metric}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Baseline Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="baseline_value"
                value={formData.baseline_value}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="target_value"
                value={formData.target_value}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="current_value"
                value={formData.current_value}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {isJobTarget && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Job Target Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Women Target
                  </label>
                  <input
                    type="number"
                    name="women_target"
                    value={formData.women_target}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Women
                  </label>
                  <input
                    type="number"
                    name="women_current"
                    value={formData.women_current}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Youth Target
                  </label>
                  <input
                    type="number"
                    name="youth_target"
                    value={formData.youth_target}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Youth
                  </label>
                  <input
                    type="number"
                    name="youth_current"
                    value={formData.youth_current}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/targets/tracking')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Target'}
          </button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
}