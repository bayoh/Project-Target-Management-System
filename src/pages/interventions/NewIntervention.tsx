import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { AlertTriangle, Upload, X, Calendar as CalendarIcon } from 'lucide-react'; // Added CalendarIcon for potential use
import type { User, Cluster, Pathway } from '../../types/project';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/button';
import { Calendar } from '../../components/ui/Calendar';
import { useActivityTracking } from '../../hooks/useActivityTracking';

interface FormData {
  name: string;
  code: string;
  description: string;
  cluster_id: string;
  pathway_id: string;
  start_date: string;
  end_date: string;
  lead_id: string;
  budget: string;
  attachments: File[];
}

export function NewIntervention() {
  const { trackPageView } = useActivityTracking();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    code: '',
    cluster_id: '',
    pathway_id: '',
    start_date: '',
    end_date: '',
    lead_id: '',
    budget: '',
    attachments: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get users
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list(''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) throw error;
      return data || [];
    },
  });

  // Get clusters
  const { data: clusters = [] } = useQuery({
    queryKey: queryKeys.clusters.list(''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Get pathways for selected cluster
  const { data: pathways = [] } = useQuery({
    queryKey: queryKeys.pathways.list(formData.cluster_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pathways')
        .select('*')
        .eq('cluster_id', formData.cluster_id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.cluster_id,
  });

  useEffect(() => {
    trackPageView('New Intervention');
  }, [trackPageView]);

  useEffect(() => {
    if (!formData.cluster_id) {
      setFormData(prev => ({ ...prev, pathway_id: '' }));
    }
  }, [formData.cluster_id]);

  // Create intervention mutation
  const createInterventionMutation = useMutation({
    mutationFn: async (interventionData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create intervention
      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .insert([{
          name: interventionData.name,
          code: interventionData.code,
          description: interventionData.description,
          pathway_id: interventionData.pathway_id,
          start_date: interventionData.start_date,
          end_date: interventionData.end_date,
          budget: interventionData.budget ? parseFloat(interventionData.budget) : null,
          lead_id: interventionData.lead_id || null,
          created_by: user.id
        }])
        .select()
        .single();

      if (interventionError) throw interventionError;
      if (!intervention) throw new Error('Failed to create intervention');

      // Upload attachments
      const attachmentPromises = interventionData.attachments.map(async (file) => {
        const fileName = `${intervention.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('intervention-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Add document record
        const { error: docError } = await supabase
          .from('intervention_documents')
          .insert([{
            intervention_id: intervention.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: fileName,
            created_by: user.id
          }]);

        if (docError) throw docError;
      });

      await Promise.all(attachmentPromises);
      return intervention;
    },
    onSuccess: (intervention) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interventions.list('') });
      navigate(`/interventions/${intervention.id}`);
    },
    onError: (err: any) => {
      console.error('Error creating intervention:', err);
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createInterventionMutation.mutateAsync(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...Array.from(e.target.files)]
      });
    }
  };

  const removeFile = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Intervention</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a new intervention by filling out the information below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-6 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <Input
                    label="Code *"
                    type="text"
                    id="code"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <Input
                    label="Name *"
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-6">
                  <Input
                    label="Description"
                    type="textarea"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="cluster" className="block text-sm font-medium text-gray-700">
                    Cluster *
                  </label>
                  <Select
                    id="cluster"
                    required
                    value={formData.cluster_id}
                    onChange={(value) => setFormData({ ...formData, cluster_id: value as string })}
                    options={clusters.map(cluster => ({ value: cluster.id, label: cluster.name }))}
                    placeholder="Select a cluster"
                    className="mt-1"
                    allowClear={false}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="pathway" className="block text-sm font-medium text-gray-700">
                    Pathway *
                  </label>
                  <Select
                    id="pathway"
                    required
                    value={formData.pathway_id}
                    onChange={(value) => setFormData({ ...formData, pathway_id: value as string })}
                    options={pathways.map(pathway => ({ value: pathway.id, label: pathway.name }))}
                    placeholder="Select a pathway"
                    className="mt-1"
                    disabled={!formData.cluster_id || pathways.length === 0}
                    allowClear={false}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <Calendar
                    id="start_date"
                    selected={formData.start_date ? new Date(formData.start_date) : null}
                    onSelect={(date) => {
                      if (date && date instanceof Date) {
                        setFormData({ ...formData, start_date: date.toISOString().split('T')[0] });
                      } else {
                        setFormData({ ...formData, start_date: '' });
                      }
                    }}
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <Calendar
                    id="end_date"
                    selected={formData.end_date ? new Date(formData.end_date) : null}
                    onSelect={(date) => {
                      if (date && date instanceof Date) {
                        setFormData({ ...formData, end_date: date.toISOString().split('T')[0] });
                      } else {
                        setFormData({ ...formData, end_date: '' });
                      }
                    }}
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="lead" className="block text-sm font-medium text-gray-700">
                    Lead
                  </label>
                  <Select
                    id="lead"
                    value={formData.lead_id}
                    onChange={(value) => setFormData({ ...formData, lead_id: value as string })}
                    options={users.map(user => ({ value: user.id, label: user.full_name || user.email || 'Unnamed User' }))}
                    placeholder="Select a lead"
                    className="mt-1"
                    searchable
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Budget"
                    type="number"
                    id="budget"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="mt-1 pl-7"
                    icon={<span className="text-gray-500 sm:text-sm">$</span>}
                  />
                </div>
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-6 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Attachments</h3>

              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex flex-col sm:flex-row text-sm text-gray-600 items-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-0 sm:pl-1 mt-1 sm:mt-0">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, XLS, XLSX up to 10MB each
                    </p>
                  </div>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Uploaded files:</h4>
                    {formData.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 pr-3 bg-gray-50 rounded-md border border-gray-200"
                      >
                        <span className="text-sm text-gray-700 truncate flex-grow mr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 flex-shrink-0"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-8">
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/interventions')}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Intervention'}
                </Button>
              </div>
            </div>
          </form>
      </div>
    </div>
  );
}