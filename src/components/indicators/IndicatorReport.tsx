import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Indicator, IndicatorReport as IIndicatorReport } from '../../types/project';
import { AlertTriangle } from 'lucide-react';

interface IndicatorReportProps {
  indicator: Indicator;
  onSuccess?: (report: IIndicatorReport) => void;
  onCancel?: () => void;
}

export function IndicatorReport({ indicator, onSuccess, onCancel }: IndicatorReportProps) {
  const [reportDate, setReportDate] = useState('');
  const [quantitativeValue, setQuantitativeValue] = useState('');
  const [qualitativeValue, setQualitativeValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('indicator_reports')
        .insert([{
          indicator_id: indicator.id,
          report_date: reportDate,
          quantitative_value: quantitativeValue ? parseFloat(quantitativeValue) : null,
          qualitative_value: qualitativeValue || null,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      if (onSuccess) onSuccess(data as IIndicatorReport);
    } catch (err: any) {
      console.error('Error creating report:', err);
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
        <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">
          Report Date
        </label>
        <input
          type="date"
          id="reportDate"
          required
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {indicator.type === 'quantitative' && (
        <div>
          <label htmlFor="quantitativeValue" className="block text-sm font-medium text-gray-700">
            Value
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              id="quantitativeValue"
              required
              value={quantitativeValue}
              onChange={(e) => setQuantitativeValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {indicator.unit && (
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                {indicator.unit}
              </span>
            )}
          </div>
          {indicator.target_value && (
            <p className="mt-1 text-sm text-gray-500">
              Target: {indicator.target_value} {indicator.unit}
            </p>
          )}
        </div>
      )}

      {indicator.type === 'qualitative' && (
        <div>
          <label htmlFor="qualitativeValue" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="qualitativeValue"
            required
            rows={4}
            value={qualitativeValue}
            onChange={(e) => setQualitativeValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describe the progress, achievements, and any relevant details..."
          />
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}