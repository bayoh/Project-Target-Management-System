import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface AchievementFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  achievement?: {
    description: string;
    date_achieved: string;
    evidence_url?: string;
  };
}

export function AchievementForm({ onSubmit, onCancel, achievement }: AchievementFormProps) {
  const [formData, setFormData] = useState({
    description: achievement?.description || '',
    date_achieved: achievement?.date_achieved || new Date().toISOString().split('T')[0],
    evidence_url: achievement?.evidence_url || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
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

      <div>
        <label htmlFor="date_achieved" className="block text-sm font-medium text-gray-700">
          Date Achieved *
        </label>
        <input
          type="date"
          id="date_achieved"
          required
          value={formData.date_achieved}
          onChange={(e) => setFormData({ ...formData, date_achieved: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="evidence_url" className="block text-sm font-medium text-gray-700">
          Evidence URL
        </label>
        <input
          type="url"
          id="evidence_url"
          value={formData.evidence_url}
          onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
          placeholder="https://"
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
          {loading ? 'Saving...' : 'Save Achievement'}
        </button>
      </div>
    </form>
  );
}