import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import type { Intervention, User } from '../../types/project';
import { ChevronLeft, Plus, MessageSquare, Upload, X, FileText, Download, Pencil } from 'lucide-react';
import { ActionList } from '../../components/actions/ActionList';
import { DocumentList, DocumentViewer} from '../../components/documents';
import { format } from 'date-fns';
import { projectApi } from '../../lib/api';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  user: User;
}

interface Document {
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newComment, setNewComment] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
    getUser();
  }, [id]);

  const getUser =  async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log(user.user_metadata.role === 'super_admin')
    setUser(user)
    return user;
  };

  const loadData = async () => {
    try {
      const [interventionData, usersData, commentsData, documentsData] = await Promise.all([
        // projectApi.getInterventionById(id),
        supabase
          .from('interventions')
          .select(`
            *,
            pathway:pathways(name),
            lead:profiles!interventions_lead_id_fkey1(email, full_name),
            actions(*)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .order('email'),
        supabase
          .from('intervention_comments')
          .select(`
            *,
            user:profiles!intervention_comments_created_by_fkey1(*)
          `)
          .eq('intervention_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('intervention_documents')
          .select(`
            *,
            user:profiles!intervention_documents_created_by_fkey1(*)
          `)
          .eq('intervention_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (interventionData.error) throw interventionData.error;
      if (usersData.error) throw usersData.error;
      if (commentsData.error) throw commentsData.error;
      if (documentsData.error) throw documentsData.error;

      // const data = await projectApi.getInterventionById(id);
      console.log(interventionData.data);


      setIntervention(interventionData.data);
      setUsers(usersData.data);
      setComments(commentsData.data);
      setDocuments(documentsData.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load intervention details');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !intervention) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error: commentError } = await supabase
        .from('intervention_comments')
        .insert([{
          intervention_id: intervention.id,
          content: newComment,
          created_by: user.id
        }]);

      if (commentError) throw commentError;
      
      setNewComment('');
      await loadData();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message);
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

  const handleFileUpload = async () => {
    if (!uploadingFiles.length || !intervention) return;
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Upload each file
      for (const file of uploadingFiles) {
        // Sanitize filename by replacing spaces and special characters
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${intervention.id}/${crypto.randomUUID()}-${sanitizedName}`;
        
        // Upload to storage
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
      }

      // Reload documents
      await loadData();
      setShowUploadModal(false);
      setUploadingFiles([]);
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError('Failed to upload files: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('intervention-documents')
        .download(document.url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !intervention) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Intervention</h3>
            <p className="mt-1 text-sm text-gray-500">{error || 'Intervention not found'}</p>
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              
                <h1 className="col-start-2 col-start-9 text-2xl font-bold text-gray-900">{intervention.name}</h1>
           
              {intervention.pathway && (
                <p className="mt-1 text-sm text-gray-500">{intervention.pathway.name}</p>
              )}
            </div>
          </div>
         { (user.user_metadata.role === 'super_admin' || user.id === intervention.lead_id) && <button
            onClick={() => navigate(`/interventions/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </button>}
        </div>

        {/* Overview */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {intervention.actions?.reduce((total, action) => total + (action.budget || 0), 0)
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(intervention.actions.reduce((total, action) => total + (action.budget || 0), 0))
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
              <p className="mt-1 text-sm text-gray-900">{intervention.description}</p>
            </div>
          )}
        </div>

         {/* Actions */}
        <ActionList
          actions={intervention.actions || []}
          interventionId={intervention.id}
          onActionUpdate={loadData}
          users={users}
          showEdit={(user.user_metadata.role === 'super_admin' || user.id === intervention.lead_id)}
        />

        {/* Documents */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
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
            <DocumentList documents={documents} />
            {/* {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      Uploaded by {doc.user.full_name} on {format(new Date(doc.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            ))}

            {documents.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No documents uploaded yet
              </p>
            )} */}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Comments</h2>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <div>
              <label htmlFor="comment" className="sr-only">Add comment</label>
              <textarea
                id="comment"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user.full_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(comment.created_at), 'PPp')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No comments yet. Be the first to add one!
              </p>
            )}
          </div>
        </div>

       

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
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