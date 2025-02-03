import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface IssueFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  issue?: {
    description: string;
    status: 'open' | 'in_progress' | 'resolved';
    severity: 'low' | 'medium' | 'high' | 'critical';
    date_identified: string;
    date_resolved?: string;
    is_blocker: boolean;
    resolution_steps?: string;
  };
}

export function IssueForm({ onSubmit, onCancel, issue }: IssueFormProps) {
  const [formData, setFormData] = useState({
    description: issue?.description || '',
    status: issue?.status || 'open',
    severity: issue?.severity || 'medium',
    date_identified: issue?.date_identified || new Date().toISOString().split('T')[0],
    date_resolved: issue?.date_resolved || null,
    is_blocker: issue?.is_blocker || false,
    resolution_steps: issue?.resolution_steps || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Clean up the data before submitting
      const cleanData = {
        ...formData,
        // Only include date_resolved if it has a value
        date_resolved: formData.date_resolved || null
      };

      await onSubmit(cleanData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status *
          </label>
          <select
            id="status"
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
            Severity *
          </label>
          <select
            id="severity"
            required
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label htmlFor="date_identified" className="block text-sm font-medium text-gray-700">
            Date Identified *
          </label>
          <input
            type="date"
            id="date_identified"
            required
            value={formData.date_identified}
            onChange={(e) => setFormData({ ...formData, date_identified: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="date_resolved" className="block text-sm font-medium text-gray-700">
            Date Resolved
          </label>
          <input
            type="date"
            id="date_resolved"
            value={formData.date_resolved || ''}
            onChange={(e) => setFormData({ ...formData, date_resolved: e.target.value || null })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_blocker"
            checked={formData.is_blocker}
            onChange={(e) => setFormData({ ...formData, is_blocker: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_blocker" className="ml-2 block text-sm text-gray-700">
            This issue is blocking progress
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="resolution_steps" className="block text-sm font-medium text-gray-700">
          Resolution Steps
        </label>
        <textarea
          id="resolution_steps"
          rows={3}
          value={formData.resolution_steps}
          onChange={(e) => setFormData({ ...formData, resolution_steps: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

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
          {loading ? 'Saving...' : 'Save Issue'}
        </button>
      </div>
    </form>
  );
}