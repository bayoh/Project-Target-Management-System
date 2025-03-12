import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface NeedFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  need?: {
    description: string;
    date_identified: string;
    date_fulfilled?: string;
    resource_requirements: string;
    budget_impact?: number;
  };
}

export function NeedForm({ onSubmit, onCancel, need }: NeedFormProps) {
  const [formData, setFormData] = useState({
    description: need?.description || '',
    date_identified: need?.date_identified || new Date().toISOString().split('T')[0],
    date_fulfilled: need?.date_fulfilled || null,
    resource_requirements: need?.resource_requirements || '',
    budget_impact: need?.budget_impact?.toString() || ''
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
        // Only include date_fulfilled if it has a value
        date_fulfilled: formData.date_fulfilled || null,
        // Convert budget_impact to number or null
        budget_impact: formData.budget_impact ? parseFloat(formData.budget_impact) : null
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
          <label htmlFor="date_identified" className="block text-sm font-medium text-gray-700">
            Date Identified *
          </label>
          <input
            type="date"
            id="date_identified"
            value={formData.date_identified}
            onChange={(e) => setFormData({ ...formData, date_identified: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="date_fulfilled" className="block text-sm font-medium text-gray-700">
            Date Fulfilled
          </label>
          <input
            type="date"
            id="date_fulfilled"
            value={formData.date_fulfilled || ''}
            onChange={(e) => setFormData({ ...formData, date_fulfilled: e.target.value || null })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="resource_requirements" className="block text-sm font-medium text-gray-700">
          Resource Requirements *
        </label>
        <textarea
          id="resource_requirements"
          required
          rows={3}
          value={formData.resource_requirements}
          onChange={(e) => setFormData({ ...formData, resource_requirements: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="budget_impact" className="block text-sm font-medium text-gray-700">
          Budget Impact
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            id="budget_impact"
            step="0.01"
            value={formData.budget_impact}
            onChange={(e) => setFormData({ ...formData, budget_impact: e.target.value })}
            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
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
          {loading ? 'Saving...' : 'Save Need'}
        </button>
      </div>
    </form>
  );
}