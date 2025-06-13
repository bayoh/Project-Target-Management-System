import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1 md:p-0">
      {error && (
        <div className="rounded-md bg-red-50 p-3 md:p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <Select
          label="Status *"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'fulfilled', label: 'Fulfilled' },
          ]}
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value as any })}
          className="w-full"
        />

        <Select
          label="Priority *"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          value={formData.priority}
          onChange={(value) => setFormData({ ...formData, priority: value as any })}
          className="w-full"
        />

        <Input
          label="Date Identified *"
          type="date"
          id="date_identified"
          value={formData.date_identified}
          onChange={(e) => setFormData({ ...formData, date_identified: e.target.value })}
          className="w-full"
        />

        <Input
          label="Date Fulfilled"
          type="date"
          id="date_fulfilled"
          value={formData.date_fulfilled || ''}
          onChange={(e) => setFormData({ ...formData, date_fulfilled: e.target.value || null })}
          className="w-full"
        />
      </div>

      <Input
        label="Fulfillment Details"
        id="fulfillment_details"
        type="textarea"
        rows={3}
        value={formData.fulfillment_details}
        onChange={(e) => setFormData({ ...formData, fulfillment_details: e.target.value })}
        className="w-full"
      />

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
          {loading ? 'Saving...' : 'Save Need'}
        </Button>
      </div>
    </form>
  );
}