import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/button';

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
    youth_current: '',
    job_subcategory: ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | string, fieldName?: string) => {
    if (typeof e === 'string' && fieldName) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: e
      }));
    } else if (typeof e === 'object') {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
            created_by: (await supabase.auth.getUser()).data.user?.id,
            women_target: formData.women_target ? parseFloat(formData.women_target) : null,
            women_current: formData.women_current ? parseFloat(formData.women_current) : null,
            youth_target: formData.youth_target ? parseFloat(formData.youth_target) : null,
            youth_current: formData.youth_current ? parseFloat(formData.youth_current) : null,
            job_subcategory: formData.job_subcategory || null
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
            <Select
              options={actions.map(action => ({
                value: action.id,
                label: `${action.name}`
              }))}
              value={formData.action_id}
              onChange={(value) => handleInputChange(value, 'action_id')}
              placeholder="Select an action"
              searchable
              label="Action"
              required
            />
          </div>

          <div>
            <Select
              options={[
                { value: 'jobs', label: 'Jobs' },
                { value: 'other', label: 'Other' }
              ]}
              value={formData.category}
              onChange={(value) => handleInputChange(value, 'category')}
              placeholder="Select a category"
              label="Category"
            />
          </div>

          <div>
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              type="textarea"
              required
            />
          </div>

          <div>
            <Input
              label="Metric"
              name="metric"
              value={formData.metric}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Baseline Value"
              name="baseline_value"
              value={formData.baseline_value}
              onChange={handleInputChange}
              type="number"
              required
            />

            <Input
              label="Target Value"
              name="target_value"
              value={formData.target_value}
              onChange={handleInputChange}
              type="number"
              required
            />

            <Input
              label="Current Value"
              name="current_value"
              value={formData.current_value}
              onChange={handleInputChange}
              type="number"
              required
            />
          </div>

          {isJobTarget && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Job Target Details</h3>

              <Select
                label="Job Type"
                options={[
                  { value: '', label: 'Select a job type' },
                  { value: 'direct', label: 'Direct' },
                  { value: 'indirect', label: 'Indirect' },
                ]}
                value={formData.job_subcategory}
                onChange={(value) => handleInputChange(value, 'job_subcategory')}
                placeholder="Select job subcategory"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Women Target"
                  name="women_target"
                  value={formData.women_target}
                  onChange={handleInputChange}
                  type="number"
                />

                <Input
                  label="Current Women"
                  name="women_current"
                  value={formData.women_current}
                  onChange={handleInputChange}
                  type="number"
                />

                <Input
                  label="Youth Target"
                  name="youth_target"
                  value={formData.youth_target}
                  onChange={handleInputChange}
                  type="number"
                />

                <Input
                  label="Current Youth"
                  name="youth_current"
                  value={formData.youth_current}
                  onChange={handleInputChange}
                  type="number"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/targets/tracking')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Target'}
          </Button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
}