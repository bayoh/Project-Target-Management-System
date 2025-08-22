import React, { useState } from 'react';
import { AlertTriangle, Calendar, DollarSign, Package } from 'lucide-react';
import { Input } from '../../ui/Input'; // Added import
import { Select } from '../../ui/Select'; // Added import
import { Button } from '../../ui/button'; // Added import

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
    budget_impact: need?.budget_impact?.toString() || '',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the need..."
          required
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* <div className='space-y-2'>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status *
          </label>
          <Select
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'fulfilled', label: 'Fulfilled' },
          ]}
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value as any })}
          className="w-full"
        />

        </div> */}

        <div className="space-y-2">
          <label htmlFor="date_identified" className="block text-sm font-medium text-gray-700">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date Identified *
          </label>
          <Input
            id="date_identified"
            type="date"
            value={formData.date_identified}
            onChange={(e) => setFormData({ ...formData, date_identified: e.target.value })}
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="date_fulfilled" className="block text-sm font-medium text-gray-700">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date Fulfilled
          </label>
          <Input
            id="date_fulfilled"
            type="date"
            value={formData.date_fulfilled || ''}
            onChange={(e) => setFormData({ ...formData, date_fulfilled: e.target.value || null })}
            className="h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="space-y-2">
          <label htmlFor="resource_requirements" className="block text-sm font-medium text-gray-700">
            <Package className="inline h-4 w-4 mr-1" />
            Resource Requirements *
          </label>
          <Input
            id="resource_requirements"
            type="textarea"
            rows={3}
            value={formData.resource_requirements}
            onChange={(e) => setFormData({ ...formData, resource_requirements: e.target.value })}
            placeholder="Describe required resources..."
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="budget_impact" className="block text-sm font-medium text-gray-700">
            <DollarSign className="inline h-4 w-4 mr-1" />
            Budget Impact
          </label>
          <Input
            id="budget_impact"
            type="number"
            step="0.01"
            min="0"
            value={formData.budget_impact}
            onChange={(e) => setFormData({ ...formData, budget_impact: e.target.value })}
            placeholder="0.00"
            className="h-10"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel} className="sm:w-auto w-full">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="sm:w-auto w-full">
          {loading ? 'Saving...' : 'Save Need'}
        </Button>
      </div>
    </form>
  );
}