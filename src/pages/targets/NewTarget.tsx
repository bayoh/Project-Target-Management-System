import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle } from 'lucide-react';

import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/button';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useActionsForTarget, useCreateTarget } from '../../hooks/useTargetQueries';

export default function NewTarget() {
  const { trackPageView } = useActivityTracking();
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

  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isJobTarget = formData.category === 'jobs';

  // Use TanStack Query hooks
  const { data: actions = [], isLoading: actionsLoading, error: actionsError } = useActionsForTarget();
  const createTargetMutation = useCreateTarget();

  useEffect(() => {
    trackPageView('New Target');
  }, [trackPageView]);

  // Display error if actions fail to load
  useEffect(() => {
    if (actionsError) {
      setError('Failed to load actions. Please try again.');
    }
  }, [actionsError]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (fieldName: keyof typeof formData) => (value: string | string[]) => {
    const next = Array.isArray(value) ? (value[0] ?? '') : value;
    setFormData(prev => ({
      ...prev,
      [fieldName]: next
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate required fields
      if (!formData.action_id || !formData.description || !formData.metric || 
          !formData.baseline_value || !formData.target_value || !formData.current_value) {
        throw new Error('Please fill in all required fields');
      }

      await createTargetMutation.mutateAsync({
        action_id: formData.action_id,
        description: formData.description,
        metric: formData.metric,
        baseline_value: parseFloat(formData.baseline_value),
        target_value: parseFloat(formData.target_value),
        current_value: parseFloat(formData.current_value),
        category: formData.category || undefined,
        women_target: formData.women_target ? parseFloat(formData.women_target) : undefined,
        women_current: formData.women_current ? parseFloat(formData.women_current) : undefined,
        youth_target: formData.youth_target ? parseFloat(formData.youth_target) : undefined,
        youth_current: formData.youth_current ? parseFloat(formData.youth_current) : undefined,
        job_subcategory: formData.job_subcategory || undefined
      });
      
      // Navigate back to the targets list
      navigate('/targets/tracking');
    } catch (err: unknown) {
      console.error('Error creating target:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  return (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <Select
              options={actions.map(action => ({
                value: action.id,
                label: `${action.name}`
              }))}
              value={formData.action_id}
              onChange={handleSelectChange('action_id')}
              placeholder="Select an action"
              searchable
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              options={[
                { value: 'jobs', label: 'Jobs' },
                { value: 'infrastructure', label: 'Infrastructure' },
                { value: 'health_wellness', label: 'Health and Wellness' },
                { value: 'education_skills', label: 'Education and Skills' },
                { value: 'resource_mobilization', label: 'Resource mobilization' },
                { value: 'other', label: 'Other' }
              ]}
              value={formData.category}
              onChange={handleSelectChange('category')}
              placeholder="Select a category"
            />
          </div>

          <div>
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFieldChange}
              type="textarea"
              required
            />
          </div>

          <div>
            <Input
              label="Metric"
              name="metric"
              value={formData.metric}
              onChange={handleFieldChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Baseline Value"
              name="baseline_value"
              value={formData.baseline_value}
              onChange={handleFieldChange}
              type="number"
              required
            />

            <Input
              label="Target Value"
              name="target_value"
              value={formData.target_value}
              onChange={handleFieldChange}
              type="number"
              required
            />

            <Input
              label="Current Value"
              name="current_value"
              value={formData.current_value}
              onChange={handleFieldChange}
              type="number"
              required
            />
          </div>

          {isJobTarget && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Job Target Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <Select
                  options={[
                    { value: '', label: 'Select a job type' },
                    { value: 'direct', label: 'Direct' },
                    { value: 'indirect', label: 'Indirect' },
                  ]}
                  value={formData.job_subcategory}
                  onChange={handleSelectChange('job_subcategory')}
                  placeholder="Select job subcategory"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Women Target"
                  name="women_target"
                  value={formData.women_target}
                  onChange={handleFieldChange}
                  type="number"
                />

                <Input
                  label="Current Women"
                  name="women_current"
                  value={formData.women_current}
                  onChange={handleFieldChange}
                  type="number"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Youth Target"
                  name="youth_target"
                  value={formData.youth_target}
                  onChange={handleFieldChange}
                  type="number"
                />

                <Input
                  label="Current Youth"
                  name="youth_current"
                  value={formData.youth_current}
                  onChange={handleFieldChange}
                  type="number"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/targets/tracking')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionsLoading || createTargetMutation.isPending}
            >
              {createTargetMutation.isPending ? 'Creating...' : 'Create Target'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}