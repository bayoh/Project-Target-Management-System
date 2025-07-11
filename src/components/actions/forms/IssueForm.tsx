import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '../../ui/Input'; // Added import
import { Select } from '../../ui/Select'; // Added import
import { Button } from '../../ui/button'; // Added import

interface IssueFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  onIssueResolved?: () => void; // New prop for handling issue resolution
  issue?: {
    description: string;
    status: 'open' | 'in_progress' | 'resolved';
    severity: 'low' | 'medium' | 'high' ;
    date_identified: string;
    date_resolved?: string;
    is_blocker: boolean;
    resolution_steps?: string;
  };
}

export function IssueForm({ onSubmit, onCancel, issue, onIssueResolved }: IssueFormProps) {
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

      // If the issue is being resolved, call the onIssueResolved callback
      if (cleanData.status === 'resolved' && onIssueResolved) {
        onIssueResolved();
      }

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
          aria-label="Status *"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
          ]}
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value as any })}
          className="w-full"
        />

        <Select
          aria-label="Severity *"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          value={formData.severity}
          onChange={(value) => setFormData({ ...formData, severity: value as any })}
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
          label="Date Resolved"
          type="date"
          id="date_resolved"
          value={formData.date_resolved || ''}
          onChange={(e) => setFormData({ ...formData, date_resolved: e.target.value || null })}
          className="w-full"
        />
      </div>

      <div className="flex items-center">
        <Input
          type="checkbox"
          id="is_blocker"
          checked={formData.is_blocker}
          onChange={(e) => setFormData({ ...formData, is_blocker: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
        />
        <label htmlFor="is_blocker" className="text-sm text-gray-700">
          This issue is preventing progress
        </label>
      </div>

      <Input
        label="Resolution Steps"
        id="resolution_steps"
        type="textarea"
        rows={3}
        value={formData.resolution_steps}
        onChange={(e) => setFormData({ ...formData, resolution_steps: e.target.value })}
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
          {loading ? 'Saving...' : 'Save Issue'}
        </Button>
      </div>
    </form>
  );
}