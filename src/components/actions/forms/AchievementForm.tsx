import React, { useState, useRef } from 'react';
import { AlertTriangle, Upload, X, Image, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AchievementFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  achievement?: {
    description: string;
    date_achieved: string;
    evidence_url?: string;
    evidence_file?: string[];
  };
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmationDialog({ isOpen, fileName, onConfirm, onCancel }: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to delete {fileName}? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function AchievementForm({ onSubmit, onCancel, achievement }: AchievementFormProps) {
  const [formData, setFormData] = useState({
    description: achievement?.description || '',
    date_achieved: achievement?.date_achieved || new Date().toISOString().split('T')[0],
    evidence_url: achievement?.evidence_url || '',
    evidence_file: Array.isArray(achievement?.evidence_file) ? achievement?.evidence_file : []
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploads, setFileUploads] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; fileName: string; filePath: string }>({ 
    isOpen: false, 
    fileName: '', 
    filePath: '' 
  });

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `evidence/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('achievements')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setFileUploads(prev => ({
              ...prev,
              [file.name]: {
                progress: Math.round(percent),
                uploadedName: fileName
              }
            }));
          },
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('achievements')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        evidence_file: Array.isArray(prev.evidence_file) ? [...prev.evidence_file, publicUrl] : [publicUrl]
      }));
      
      setFileUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[file.name];
        return newUploads;
      });

      // Update the selected files with the uploaded file name
      setSelectedFiles(prev => 
        prev.map(f => 
          f.name === file.name 
            ? Object.assign(f, { uploadedName: fileName })
            : f
        )
      );

    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message);
      setFileUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[file.name];
        return newUploads;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_CONCURRENT_UPLOADS = 3; // Maximum concurrent uploads

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Process files in batches
    for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS);
      await Promise.all(batch.map(file => handleFileUpload(file)));
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      // Extract the file path from the public URL
      const pathMatch = filePath.match(/evidence\/[^?]+/);
      if (!pathMatch) throw new Error('Invalid file path');
      
      const storagePath = pathMatch[0];
      
      const { error: deleteError } = await supabase.storage
        .from('achievements')
        .remove([storagePath]);

      if (deleteError) throw deleteError;

      setFormData(prev => ({
        ...prev,
        evidence_file: prev.evidence_file.filter(url => url !== filePath)
      }));

      setDeleteConfirmation({ isOpen: false, fileName: '', filePath: '' });
    } catch (err: any) {
      console.error('Error deleting file:', err);
      setError(err.message);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setFormData(prev => {
      const urls = Array.isArray(prev.evidence_file) ? prev.evidence_file : [];
      const fileNameToRemove = fileName.includes('/') ? fileName : urls.find(url => getFileNameFromUrl(url) === fileName);
      return {
        ...prev,
        evidence_file: urls.filter(url => url !== fileNameToRemove)
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
  };

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  };

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
          value={formData.date_achieved}
          onChange={(e) => setFormData({ ...formData, date_achieved: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="space-y-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Upload Evidence Document
          </label>
          <div className="mt-1 flex items-center space-x-4">
            <div className="flex-1">
              <label
                htmlFor="evidence_file"
                className={`
                  flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md
                  cursor-pointer hover:border-gray-400 transition-colors
                  ${selectedFiles ? 'bg-gray-50' : ''}
                `}
              >
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500">
                      {selectedFiles.length ? `${selectedFiles.length} files selected` : 'Upload files'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPEG, PDF, DOC up to 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="evidence_file"
                  name="evidence_file"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpeg,.jpg"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* Existing Files Preview */}
          {formData.evidence_file && formData.evidence_file.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {formData.evidence_file.map((url, index) => {
                  const fileName = getFileNameFromUrl(url);
                  return (
                    <div key={url} className="relative group bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="aspect-w-16 aspect-h-9 mb-2">
                        {isImageFile(url) ? (
                          <img
                            src={url}
                            alt={fileName}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center bg-gray-100 rounded">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate flex-1">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmation({ 
                            isOpen: true, 
                            fileName, 
                            filePath: url 
                          })}
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uploading Files Preview */}
          <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {selectedFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-600">
                  {fileUploads[file.name]?.uploadedName || file.name}
                </span>
                <div className="flex items-center space-x-2">
                  {fileUploads[file.name] !== undefined && (
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileUploads[file.name].progress}%` }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.name)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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