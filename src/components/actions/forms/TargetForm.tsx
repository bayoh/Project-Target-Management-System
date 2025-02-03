import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

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
    youth_current: target?.youth_current?.toString() || ''
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
        youth_current: formData.youth_current ? parseFloat(formData.youth_current) : null
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isJobTarget = formData.category === 'jobs';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a category</option>
          <option value="jobs">Jobs</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <textarea
          id="description"
          required
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="metric" className="block text-sm font-medium text-gray-700">
          Metric *
        </label>
        <input
          type="text"
          id="metric"
          required
          value={formData.metric}
          onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
          placeholder="e.g., jobs, percentage, hours"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="baseline_value" className="block text-sm font-medium text-gray-700">
            Baseline Value *
          </label>
          <input
            type="number"
            id="baseline_value"
            required
            step="any"
            value={formData.baseline_value}
            onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="target_value" className="block text-sm font-medium text-gray-700">
            Target Value *
          </label>
          <input
            type="number"
            id="target_value"
            required
            step="any"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="current_value" className="block text-sm font-medium text-gray-700">
            Current Value *
          </label>
          <input
            type="number"
            id="current_value"
            required
            step="any"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {isJobTarget && (
        <div className="space-y-6 border-t pt-6">
          <h4 className="font-medium text-gray-900">Job Target Details</h4>
          
          {/* Women Jobs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="women_target" className="block text-sm font-medium text-gray-700">
                Target Jobs for Women
              </label>
              <input
                type="number"
                id="women_target"
                value={formData.women_target}
                onChange={(e) => setFormData({ ...formData, women_target: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="women_current" className="block text-sm font-medium text-gray-700">
                Current Jobs for Women
              </label>
              <input
                type="number"
                id="women_current"
                value={formData.women_current}
                onChange={(e) => setFormData({ ...formData, women_current: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Youth Jobs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="youth_target" className="block text-sm font-medium text-gray-700">
                Target Jobs for Youth
              </label>
              <input
                type="number"
                id="youth_target"
                value={formData.youth_target}
                onChange={(e) => setFormData({ ...formData, youth_target: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="youth_current" className="block text-sm font-medium text-gray-700">
                Current Jobs for Youth
              </label>
              <input
                type="number"
                id="youth_current"
                value={formData.youth_current}
                onChange={(e) => setFormData({ ...formData, youth_current: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
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
          className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Target'}
        </button>
      </div>
    </form>
  );
}