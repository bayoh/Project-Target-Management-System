import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Cluster } from '../types/project';
import { useActivityTracking } from '../hooks/useActivityTracking';

export function EditCluster() {
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { trackUpdate } = useActivityTracking();

  useEffect(() => {
    loadCluster();
  }, [id]);

  const loadCluster = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCluster(data);
      setName(data.name);
      setDescription(data.description || '');
    } catch (err: any) {
      console.error('Error loading cluster:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('clusters')
        .update({ name, description })
        .eq('id', id);

      if (error) throw error;
      
      // Track cluster update
      await trackUpdate('cluster', id!, {
        name,
        description
      });
      
      navigate(`/clusters/${id}`);
    } catch (err: any) {
      console.error('Error updating cluster:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Cluster</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'Cluster not found'}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/clusters')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Clusters
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/clusters/${id}`)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Edit Cluster</h1>
          </div>

          {/* Form */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
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

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate(`/clusters/${id}`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
  );
}