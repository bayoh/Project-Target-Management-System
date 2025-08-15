import React, { useState } from 'react';
import { AlertCircle, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description *
        </label>
        <Input
          id="description"
          type="textarea"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the issue..."
          required
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-1">
              {formData.status === 'open' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              {formData.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-500" />}
              {(formData.status === 'resolved') && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              Status *
            </div>
          </label>
          <Select
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as any })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="severity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <AlertCircle className={`h-4 w-4 ${
                formData.severity === 'high' ? 'text-orange-500' :
                formData.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
              }`} />
              Severity *
            </div>
          </label>
          <Select
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            value={formData.severity}
            onChange={(value) => setFormData({ ...formData, severity: value as any })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="date_identified" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="date_resolved" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date Resolved
          </label>
          <Input
            id="date_resolved"
            type="date"
            value={formData.date_resolved || ''}
            onChange={(e) => setFormData({ ...formData, date_resolved: e.target.value || null })}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <input
          id="is_blocker"
          type="checkbox"
          checked={formData.is_blocker}
          onChange={(e) => setFormData({ ...formData, is_blocker: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label htmlFor="is_blocker" className="block text-sm text-gray-900 dark:text-gray-100 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            This is a blocker issue
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="resolution_steps" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Resolution Steps
        </label>
        <textarea
          id="resolution_steps"
          value={formData.resolution_steps}
          onChange={(e) => setFormData({ ...formData, resolution_steps: e.target.value })}
          placeholder="Describe the steps taken to resolve this issue..."
          rows={4}
          className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} className="sm:w-auto w-full">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="sm:w-auto w-full">
          {loading ? 'Saving...' : 'Save Issue'}
        </Button>
      </div>
    </form>
    </div>
  );
}