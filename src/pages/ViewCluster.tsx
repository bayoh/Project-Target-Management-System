import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { PathwayForm } from '../components/pathways/PathwayForm';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Cluster, Pathway } from '../types/project';
import { useActivityTracking } from '../hooks/useActivityTracking';

export function ViewCluster() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPathwayForm, setShowPathwayForm] = useState(false);
  const [editingPathway, setEditingPathway] = useState<Pathway | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { trackCreate, trackUpdate, trackDelete } = useActivityTracking();

  useEffect(() => {
    loadCluster();
  }, [id]);

  const loadCluster = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select(`
          *,
          pathways (
            *,
            interventions (
              id,
              name,
              status
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCluster(data);
    } catch (err: any) {
      console.error('Error loading cluster:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePathwaySubmit = async (pathwayData: Partial<Pathway>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (editingPathway) {
        // Update existing pathway
        const { error } = await supabase
          .from('pathways')
          .update({
            name: pathwayData.name,
            description: pathwayData.description
          })
          .eq('id', editingPathway.id);

        if (error) throw error;
        
        // Track pathway update
        await trackUpdate('pathway', editingPathway.id, {
          cluster_id: cluster?.id,
          name: pathwayData.name,
          description: pathwayData.description
        });
      } else {
        // Create new pathway
        const { data, error } = await supabase
          .from('pathways')
          .insert([{
            ...pathwayData,
            created_by: user.id
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Track pathway creation
        await trackCreate('pathway', data.id, {
          cluster_id: cluster?.id,
          name: pathwayData.name,
          description: pathwayData.description
        });
      }

      await loadCluster();
      setShowPathwayForm(false);
      setEditingPathway(null);
    } catch (err: any) {
      console.error('Error saving pathway:', err);
      throw err;
    }
  };

  const handleDeletePathway = async (pathwayId: string) => {
    try {
      const { error } = await supabase
        .from('pathways')
        .delete()
        .eq('id', pathwayId);

      if (error) throw error;
      
      // Track pathway deletion
      await trackDelete('pathway', pathwayId, {
        cluster_id: cluster?.id
      });
      
      await loadCluster();
      setShowDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting pathway:', err);
      setError(err.message);
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
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/clusters')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{cluster.name}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setEditingPathway(null);
                setShowPathwayForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pathway
            </button>
            <button
              onClick={() => navigate(`/clusters/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Cluster
            </button>
          </div>
        </div>

        {/* Description */}
        {cluster.description && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600">{cluster.description}</p>
          </div>
        )}

        {/* Pathways */}
        <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
          <div className="px-6 py-4 gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pathways</h2>
          </div>

          {cluster.pathways?.map((pathway) => (
            <div key={pathway.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{pathway.name}</h3>
                  {pathway.description && (
                    <p className="mt-1 text-sm text-gray-500">{pathway.description}</p>
                  )}
                  <div className="mt-2 text-sm text-gray-500">
                    {pathway.interventions?.length || 0} interventions
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingPathway(pathway);
                      setShowPathwayForm(true);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(pathway.id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!cluster.pathways || cluster.pathways.length === 0) && (
            <div className="px-6 py-4 text-center text-sm text-gray-500">
              No pathways yet. Click "Add Pathway" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Pathway Form Modal */}
      {showPathwayForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPathway ? 'Edit Pathway' : 'Add New Pathway'}
            </h3>
            <PathwayForm
              clusterId={cluster.id}
              pathway={editingPathway || undefined}
              onSubmit={handlePathwaySubmit}
              onCancel={() => {
                setShowPathwayForm(false);
                setEditingPathway(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Pathway</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this pathway? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePathway(showDeleteConfirm)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}