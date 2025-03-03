import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Upload, X } from 'lucide-react';
import type { User, Cluster, Pathway } from '../../types/project';

interface FormData {
  name: string;
  code: number;
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
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    code: 0,
    cluster_id: '',
    pathway_id: '',
    start_date: '',
    end_date: '',
    lead_id: '',
    budget: '',
    attachments: []
  });

  const [users, setUsers] = useState<User[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
    loadClusters();
  }, []);

  useEffect(() => {
    if (formData.cluster_id) {
      loadPathways(formData.cluster_id);
    } else {
      setPathways([]);
      setFormData(prev => ({ ...prev, pathway_id: '' }));
    }
  }, [formData.cluster_id]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users_view')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('name');

      if (error) throw error;
      setClusters(data);
    } catch (err) {
      console.error('Error loading clusters:', err);
    }
  };

  const loadPathways = async (clusterId: string) => {
    try {
      const { data, error } = await supabase
        .from('pathways')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('name');

      if (error) throw error;
      setPathways(data);
    } catch (err) {
      console.error('Error loading pathways:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create intervention
      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .insert([{
          name: formData.name,
          codee: formData.code,
          description: formData.description,
          pathway_id: formData.pathway_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          lead_id: formData.lead_id || null,
          created_by: user.id
        }])
        .select()
        .single();

      if (interventionError) throw interventionError;
      if (!intervention) throw new Error('Failed to create intervention');

      // Upload attachments
      const attachmentPromises = formData.attachments.map(async (file) => {
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
      navigate(`/interventions/${intervention.id}`);
    } catch (err: any) {
      console.error('Error creating intervention:', err);
      setError(err.message);
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
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Intervention</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a new intervention by filling out the information below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-6 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Code *
                  </label>
                  <input
                    type="number"
                    id="code"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="cluster" className="block text-sm font-medium text-gray-700">
                    Cluster *
                  </label>
                  <select
                    id="cluster"
                    required
                    value={formData.cluster_id}
                    onChange={(e) => setFormData({ ...formData, cluster_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a cluster</option>
                    {clusters.map((cluster) => (
                      <option key={cluster.id} value={cluster.id}>
                        {cluster.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pathway" className="block text-sm font-medium text-gray-700">
                    Pathway *
                  </label>
                  <select
                    id="pathway"
                    required
                    value={formData.pathway_id}
                    onChange={(e) => setFormData({ ...formData, pathway_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a pathway</option>
                    {pathways.map((pathway) => (
                      <option key={pathway.id} value={pathway.id}>
                        {pathway.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lead" className="block text-sm font-medium text-gray-700">
                    Lead
                  </label>
                  <select
                    id="lead"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a lead</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                    Budget
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="budget"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-6 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Attachments</h3>

              <div className="space-y-4">
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
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
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, XLS, XLSX up to 10MB each
                    </p>
                  </div>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
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
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/interventions')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Intervention'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}