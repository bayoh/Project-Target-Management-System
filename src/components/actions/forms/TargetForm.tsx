import React, { useState } from 'react';
import { AlertCircle, Target, TrendingUp, Users, Briefcase } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/button';

interface TargetFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  target?: {
    description: string;
    metric: string;
    baseline_value: number;
    target_value: number;
    current_value: number;
    category?: string;
    women_target?: number;
    women_current?: number;
    youth_target?: number;
    youth_current?: number;
    job_subcategory?: string;
  };
}

export function TargetForm({ onSubmit, onCancel, target }: TargetFormProps) {
  const [formData, setFormData] = useState({
    description: target?.description || '',
    metric: target?.metric || '',
    baseline_value: target?.baseline_value?.toString() || '',
    target_value: target?.target_value?.toString() || '',
    current_value: target?.current_value?.toString() || '',
    category: target?.category || '',
    women_target: target?.women_target?.toString() || '',
    women_current: target?.women_current?.toString() || '',
    youth_target: target?.youth_target?.toString() || '',
    youth_current: target?.youth_current?.toString() || '',
    job_subcategory: target?.job_subcategory || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        ...formData,
        baseline_value: parseFloat(formData.baseline_value),
        target_value: parseFloat(formData.target_value),
        current_value: parseFloat(formData.current_value),
        women_target: formData.women_target ? parseFloat(formData.women_target) : null,
        women_current: formData.women_current ? parseFloat(formData.women_current) : null,
        youth_target: formData.youth_target ? parseFloat(formData.youth_target) : null,
        youth_current: formData.youth_current ? parseFloat(formData.youth_current) : null,
        job_subcategory: formData.job_subcategory
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // const isJobTarget = formData.category === 'jobs';

  // const categoryOptions = [
  //   { value: '', label: 'Select a category' },
  //   { value: 'jobs', label: 'Jobs' },
  //   { value: 'other', label: 'Others' },
  // ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1 md:p-0">

      <div className="space-y-2">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          <Briefcase className="inline h-4 w-4 mr-1" />
          Category *
        </label>
        <Select
          options={[
            { value: 'jobs', label: 'Jobs' },
            { value: 'other', label: 'Other' }
          ]}
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as any })}
          placeholder="Select a category"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          <Target className="inline h-4 w-4 mr-1" />
          Description *
        </label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the target..."
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="metric" className="block text-sm font-medium text-gray-700">
          <TrendingUp className="inline h-4 w-4 mr-1" />
          Metric *
        </label>
        <Input
          id="metric"
          type="text"
          value={formData.metric}
          onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
          placeholder="e.g., Number of jobs created"
          required
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="baseline_value" className="block text-sm font-medium text-gray-700">
            Baseline Value *
          </label>
          <Input
            id="baseline_value"
            type="number"
            value={formData.baseline_value}
            onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
            placeholder="0"
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="target_value" className="block text-sm font-medium text-gray-700">
            <Target className="inline h-4 w-4 mr-1 text-green-500" />
            Target Value *
          </label>
          <Input
            id="target_value"
            type="number"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            placeholder="100"
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="current_value" className="block text-sm font-medium text-gray-700">
            <TrendingUp className="inline h-4 w-4 mr-1 text-blue-500" />
            Current Value
          </label>
          <Input
            id="current_value"
            type="number"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
            placeholder="50"
            className="h-10"
          />
        </div>
      </div>

      {formData.category === 'jobs' && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Target Details
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="job_subcategory" className="block text-sm font-medium text-gray-700">
                  Job Type
                </label>
                <Input
                  id="job_subcategory"
                  type="text"
                  value={formData.job_subcategory}
                  onChange={(e) => setFormData({ ...formData, job_subcategory: e.target.value })}
                  placeholder="e.g., Full-time, Part-time, Contract"
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="women_target" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-pink-500" />
                    Women's Target Jobs
                  </label>
                  <Input
                    id="women_target"
                    type="number"
                    value={formData.women_target}
                    onChange={(e) => setFormData({ ...formData, women_target: e.target.value })}
                    placeholder="0"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="women_current" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-pink-500" />
                    Women's Current Jobs
                  </label>
                  <Input
                    id="women_current"
                    type="number"
                    value={formData.women_current}
                    onChange={(e) => setFormData({ ...formData, women_current: e.target.value })}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="youth_target" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-purple-500" />
                    Youth Target Jobs
                  </label>
                  <Input
                    id="youth_target"
                    type="number"
                    value={formData.youth_target}
                    onChange={(e) => setFormData({ ...formData, youth_target: e.target.value })}
                    placeholder="0"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="youth_current" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-purple-500" />
                    Youth Current Jobs
                  </label>
                  <Input
                    id="youth_current"
                    type="number"
                    value={formData.youth_current}
                    onChange={(e) => setFormData({ ...formData, youth_current: e.target.value })}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} className="sm:w-auto w-full">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="sm:w-auto w-full">
          {loading ? 'Saving...' : 'Save Target'}
        </Button>
      </div>
    </form>
    </div>
  );
}