import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '../../ui/Input'; // Added import
import { Select } from '../../ui/Select'; // Added import
import { Button } from '../../ui/button'; // Added import

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

  const isJobTarget = formData.category === 'jobs';

  const categoryOptions = [
    { value: '', label: 'Select a category' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'other', label: 'Others' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1 md:p-0">
      {error && (
        <div className="rounded-md bg-red-50 p-3 md:p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <Select
        label="Category"
        options={categoryOptions}
        value={formData.category}
        onChange={(value) => setFormData({ ...formData, category: value as string })}
        placeholder="Select a category"
        className="w-full"
      />

      <Input
        label="Description *"
        id="description"
        required
        type="textarea"
        rows={3}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full"
      />

      <Input
        label="Metric *"
        type="text"
        id="metric"
        required
        value={formData.metric}
        onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
        placeholder="e.g., jobs, percentage, hours"
        className="w-full"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <Input
          label="Baseline Value *"
          type="number"
          id="baseline_value"
          required
          step="any"
          value={formData.baseline_value}
          onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
          className="w-full"
        />

        <Input
          label="Target Value *"
          type="number"
          id="target_value"
          required
          step="any"
          value={formData.target_value}
          onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
          className="w-full"
        />

        <Input
          label="Current Value *"
          type="number"
          id="current_value"
          required
          step="any"
          value={formData.current_value}
          onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
          className="w-full"
        />
      </div>

      {isJobTarget && (
        <div className="space-y-4 md:space-y-6 border-t border-gray-200 pt-4 md:pt-6 mt-4 md:mt-6">
          <h4 className="text-base font-semibold text-gray-800">Job Target Details</h4>
          
          <Select
            label="Job Type"
            options={[
              { value: '', label: 'Select a job type' },
              { value: 'direct', label: 'Direct' },
              { value: 'indirect', label: 'Indirect' },
            ]}
            value={formData.job_subcategory}
            onChange={(value) => setFormData({ ...formData, job_subcategory: value as string })}            
            placeholder="Select job subcategory"
            className="w-full"
          />

          {/* Women Jobs Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <Input
              label="Target Jobs for Women"
              type="number"
              id="women_target"
              value={formData.women_target}
              onChange={(e) => setFormData({ ...formData, women_target: e.target.value })}
              className="w-full"
            />
            <Input
              label="Current Jobs for Women"
              type="number"
              id="women_current"
              value={formData.women_current}
              onChange={(e) => setFormData({ ...formData, women_current: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Youth Jobs Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <Input
              label="Target Jobs for Youth"
              type="number"
              id="youth_target"
              value={formData.youth_target}
              onChange={(e) => setFormData({ ...formData, youth_target: e.target.value })}
              className="w-full"
            />
            <Input
              label="Current Jobs for Youth"
              type="number"
              id="youth_current"
              value={formData.youth_current}
              onChange={(e) => setFormData({ ...formData, youth_current: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-3 pt-4 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'Saving...' : 'Save Target'}
        </Button>
      </div>
    </form>
  );
}