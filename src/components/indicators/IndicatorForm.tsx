import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Indicator, IndicatorType } from '../../types/project';
import { AlertTriangle } from 'lucide-react';

interface IndicatorFormProps {
  actionId: string;
  onSuccess?: (indicator: Indicator) => void;
  onCancel?: () => void;
}

export function IndicatorForm({ actionId, onSuccess, onCancel }: IndicatorFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IndicatorType>('quantitative');
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [unit, setUnit] = useState('');
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
        .from('indicators')
        .insert([{
          action_id: actionId,
          name,
          description: description || null,
          type,
          target_value: targetValue ? parseFloat(targetValue) : null,
          target_date: targetDate || null,
          category: category || null,
          subcategory: subcategory || null,
          unit: unit || null,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      if (onSuccess) onSuccess(data as Indicator);
    } catch (err: any) {
      console.error('Error creating indicator:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'jobs', label: 'Jobs' },
    { value: 'training', label: 'Training' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'other', label: 'Other' },
  ];

  const subcategoryOptions = {
    jobs: [
      { value: 'women', label: 'Women' },
      { value: 'youth', label: 'Youth' },
      { value: 'general', label: 'General' },
    ],
    training: [
      { value: 'technical', label: 'Technical Skills' },
      { value: 'soft', label: 'Soft Skills' },
      { value: 'business', label: 'Business Skills' },
    ],
    infrastructure: [
      { value: 'construction', label: 'Construction' },
      { value: 'renovation', label: 'Renovation' },
      { value: 'equipment', label: 'Equipment' },
    ],
    other: [
      { value: 'general', label: 'General' },
    ],
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Indicator Name
        </label>
        <input
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as IndicatorType)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="quantitative">Quantitative</option>
          <option value="qualitative">Qualitative</option>
        </select>
      </div>

      {type === 'quantitative' && (
        <>
          <div>
            <label htmlFor="targetValue" className="block text-sm font-medium text-gray-700">
              Target Value
            </label>
            <input
              type="number"
              id="targetValue"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              Unit
            </label>
            <input
              type="text"
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., people, percentage, currency"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
          Target Date
        </label>
        <input
          type="date"
          id="targetDate"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory('');
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a category</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {category && (
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
            Subcategory
          </label>
          <select
            id="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a subcategory</option>
            {subcategoryOptions[category as keyof typeof subcategoryOptions].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          {loading ? 'Creating...' : 'Create Indicator'}
        </button>
      </div>
    </form>
  );
}