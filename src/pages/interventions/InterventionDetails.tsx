import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import type { Intervention, User } from '../../types/project';
import { ChevronLeft, Upload, X, Pencil } from 'lucide-react';
import { ActionList } from '../../components/actions/ActionList';
import { DocumentList} from '../../components/documents';
// removed unused: import { format } from 'date-fns';
import { projectApi } from '../../lib/api';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { CommentsSection } from '../../components/comments/CommentsSection';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  user: User;
}

interface InterventionDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  created_by: string;
  user: User;
}

export function InterventionDetails() {
  const { trackPageView } = useActivityTracking();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get intervention details
  const { data: intervention, isLoading: interventionLoading, error: interventionError } = useQuery({
    queryKey: queryKeys.interventions.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          pathway:pathways(name),
          lead:profiles!interventions_lead_id_fkey1(email, full_name),
          actions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Calculate start and end dates from actions
      const actions = data.actions || [];
      if (actions.length > 0) {
        const actionDates = actions.reduce((dates: Date[], action: any) => {
          if (action.start_date) dates.push(new Date(action.start_date));
          if (action.end_date) dates.push(new Date(action.end_date));
          return dates;
        }, []);

        if (actionDates.length > 0) {
          data.start_date = new Date(Math.min(...actionDates.map((d: Date) => d.getTime()))).toISOString().split('T')[0];
          data.end_date = new Date(Math.max(...actionDates.map((d: Date) => d.getTime()))).toISOString().split('T')[0];
        }
      }

      return data;
    },
    enabled: !!id,
  });

  // Get users
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) throw error;
      return data || [];
    },
  });

  // Get comments
  const { data: comments = [] } = useQuery({
    queryKey: ['intervention-comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_comments')
        .select(`
          *,
          user:profiles!intervention_comments_created_by_fkey1(*)
        `)
        .eq('intervention_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Get documents
  const { data: documents = [] } = useQuery({
    queryKey: ['intervention-documents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_documents')
        .select(`
          *,
          user:profiles!intervention_documents_created_by_fkey1(*)
        `)
        .eq('intervention_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    trackPageView('Intervention Details');
  }, [id, trackPageView]);

  // Calculate completion percentage
  const calculateProgress = () => {
    if (!intervention?.actions || intervention.actions.length === 0) return 0;
    const completedActions = intervention.actions.filter((action: any) => action.status === 'completed').length;
    return Math.round((completedActions / intervention.actions.length) * 100);
  };

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('intervention_comments')
        .insert([{
          intervention_id: id,
          content,
          created_by: user.id
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['intervention-comments', id] });
    },
    onError: (err: any) => {
      console.error('Error adding comment:', err);
      setError(err.message);
    },
  });

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !intervention) return;

    setSubmitting(true);
    try {
      await createCommentMutation.mutateAsync(newComment);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadingFiles([...uploadingFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(uploadingFiles.filter((_, i) => i !== index));
  };

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Upload each file
      for (const file of files) {
        // Sanitize filename by replacing spaces and special characters
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${id}/${crypto.randomUUID()}-${sanitizedName}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('intervention-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Add document record
        const { error: docError } = await supabase
          .from('intervention_documents')
          .insert([{
            intervention_id: id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: fileName,
            created_by: user.id
          }]);

        if (docError) throw docError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-documents', id] });
      setShowUploadModal(false);
      setUploadingFiles([]);
    },
    onError: (err: any) => {
      console.error('Error uploading files:', err);
      setError('Failed to upload files: ' + err.message);
    },
  });

  const handleFileUpload = async () => {
    if (!uploadingFiles.length || !intervention) return;
    
    setUploading(true);
    try {
      await uploadFilesMutation.mutateAsync(uploadingFiles);
    } finally {
      setUploading(false);
    }
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ documentId, documentUrl }: { documentId: string; documentUrl: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('intervention-documents')
        .remove([documentUrl]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('intervention_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-documents', id] });
    },
    onError: (err: any) => {
      console.error('Error deleting document:', err);
      setError('Failed to delete document: ' + err.message);
    },
  });

  const handleDeleteDocument = async (documentId: string, documentUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocumentMutation.mutateAsync({ documentId, documentUrl });
    } catch (err: any) {
      // Error handling is done in the mutation
    }
  };

  const handleDownload = async (document: InterventionDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('intervention-documents')
        .download(document.url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  if (interventionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (interventionError || !intervention) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Intervention</h3>
            <p className="mt-1 text-sm text-gray-500">{interventionError?.message || error || 'Intervention not found'}</p>
            <div className="mt-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              
                <h1 className="col-start-2 col-start-9 text-xl whitespace-pre-wrap line-clamp-2 hover:line-clamp-none transition-all duration-200 font-semi-bold text-gray-900 truncate max-w-2xl">{intervention.name}</h1>
           
              {intervention.pathway && (
                <p className="mt-1 text-sm text-gray-500">{intervention.pathway.name}</p>
              )}
            </div>
          </div>
         { (user?.user_metadata?.role === 'super_admin' || user?.id === intervention.lead_id) && <button
            onClick={() => navigate(`/interventions/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </button>}
        </div>

        {/* Overview */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Overall Progress</h3>
              <span className="text-sm font-medium text-gray-900">{calculateProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${calculateProgress() === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Intervention #</h3>
              <p className="mt-1 text-sm text-gray-900">{intervention.code}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className={`mt-1 text-sm font-medium ${
                intervention.status === 'completed' ? 'text-green-600' :
                intervention.status === 'at_risk' ? 'text-red-600' :
                intervention.status === 'in_progress' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {intervention.status.replace('_', ' ')}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Timeline</h3>
              <p className="mt-1 text-sm text-gray-900">
                {intervention.start_date && (
                  <span>{new Date(intervention.start_date).toLocaleDateString()}</span>
                )}
                {intervention.end_date && (
                  <>
                    <span className="mx-2">-</span>
                    <span>{new Date(intervention.end_date).toLocaleDateString()}</span>
                  </>
                )}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Budget</h3>
              <p className="mt-1 text-sm text-gray-900">
                {intervention.actions?.reduce((total: number, action: any) => total + (action.budget || 0), 0)
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(intervention.actions.reduce((total: number, action: any) => total + (action.budget || 0), 0))
                  : 'Not set'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Lead</h3>
              <p className="mt-1 text-sm text-gray-900">
                {intervention.lead?.full_name || 'Unassigned'}
              </p>
            </div>
          </div>

          {intervention.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all duration-200">{intervention.description}</p>
            </div>
          )}
        </div>

         {/* Actions */}
        <ActionList
          actions={intervention.actions || []}
          interventionId={intervention.id}
          onActionUpdate={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.interventions.detail(id!) });
            queryClient.invalidateQueries({ queryKey: ['intervention-documents', id] });
            queryClient.invalidateQueries({ queryKey: ['intervention-comments', id] });
          }}
          users={users}
          showEdit={(user?.user_metadata?.role === 'super_admin' || user?.id === intervention.lead_id)}
        />

        {/* Documents */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </button>
          </div>

          <div className="space-y-4">
            <DocumentList
              documents={documents}
              onDelete={(documentId) => {
                const docToDelete = documents.find(doc => doc.id === documentId);
                if (docToDelete) {
                  handleDeleteDocument(documentId, docToDelete.url);
                }
              }}
            />
          </div>
        </div>

        {/* Comments */}
        <CommentsSection
          title="Comments"
          comments={comments}
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleCommentSubmit}
          submitting={submitting}
          currentUserId={user?.id}
          contentCreatorId={intervention?.created_by}
          onDelete={async (commentId) => {
            // Only allow delete if user is authorized; server-side RLS should also enforce
            await supabase
              .from('intervention_comments')
              .delete()
              .eq('id', commentId);
            queryClient.invalidateQueries({ queryKey: ['intervention-comments', id] });
          }}
        />

       

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full mx-2 sm:mx-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
                <h3 className="text-lg font-medium text-gray-900">Upload Documents</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

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

                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          onClick={() => removeUploadingFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadingFiles([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={uploading || uploadingFiles.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}



