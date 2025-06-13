import React, { useState, useRef } from 'react';
import { AlertTriangle, Upload, X, Image, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Input } from '../../ui/Input'; // Added import
import { Button } from '../../ui/button'; // Added import
import { projectApi } from '../../../lib/api';

interface AchievementFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  showEdit: boolean;
  action: string;
  achievement?: {
    id: string;
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
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to delete "{fileName}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive" // Using destructive variant for delete button
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AchievementForm({ onSubmit, onCancel, achievement, action , showEdit }: AchievementFormProps) {
  const [formData, setFormData] = useState({
    id: achievement?.id,
    description: achievement?.description || '',
    date_achieved: achievement?.date_achieved || new Date().toISOString().split('T')[0],
    evidence_url: achievement?.evidence_url || '',
    evidence_file: Array.isArray(achievement?.evidence_file) ? achievement?.evidence_file : []
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // This seems unused, consider removing if not needed elsewhere
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploads, setFileUploads] = useState<{[key: string]: { progress: number; uploadedName?: string } }>({}); // Ensure uploadedName is optional
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false); // New state for overall upload status
  
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

      // No need to set isBatchUploading here, it's handled in handleFileChange

      const { error: uploadError, data } = await supabase.storage
        .from('achievements')
        .upload(filePath, file, {
          // onUploadProgress is deprecated, use event listeners on XHR object if needed for more granular progress
          // For simplicity, we'll rely on the overall batch status and individual file completion
        });
        
      // Simulate progress for UI feedback as onUploadProgress is not directly available with supabase.upload like this
      // This is a simplified progress simulation. For real progress, you'd need a more complex setup.
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress <= 100) {
          setFileUploads(prev => ({
            ...prev,
            [file.name]: { progress: Math.min(progress, 100), uploadedName: fileName }
          }));
        }
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100); // Adjust timing as needed

      if (uploadError) {
        clearInterval(interval); // Stop simulation on error
        throw uploadError;
      }

      // Wait for simulated progress to complete before marking as done
      await new Promise(resolve => setTimeout(resolve, 1100)); // Ensure interval has a chance to complete

      const { data: { publicUrl } } = supabase.storage
        .from('achievements')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        evidence_file: Array.isArray(prev.evidence_file) ? [...prev.evidence_file, publicUrl] : [publicUrl]
      }));
      
      // Remove from fileUploads once successfully processed and URL is added
      setFileUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[file.name];
        return newUploads;
      });

      setSelectedFiles(prev => 
        prev.map(f => 
          f.name === file.name 
            ? Object.assign(f, { uploadedName: fileName })
            : f
        )
      );

    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(`Error uploading ${file.name}: ${err.message}`);
      // Keep in fileUploads to show error or remove, based on desired UX
      setFileUploads(prev => {
        const newUploads = { ...prev };
        // Optionally mark as error: newUploads[file.name] = { progress: -1, error: err.message };
        delete newUploads[file.name]; // Or simply remove
        return newUploads;
      });
    } 
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_CONCURRENT_UPLOADS = 3; // Maximum concurrent uploads

    setError(null); // Clear previous errors

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsBatchUploading(true);
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Initialize progress for new files
    const initialFileUploads = validFiles.reduce((acc, file) => {
      acc[file.name] = { progress: 0 };
      return acc;
    }, {} as {[key: string]: { progress: number; uploadedName?: string }});
    setFileUploads(prev => ({ ...prev, ...initialFileUploads }));

    try {
      for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS);
        await Promise.all(batch.map(file => handleFileUpload(file)));
      }
    } catch (batchError) {
      // Errors are handled per file in handleFileUpload, 
      // but a general error can be set here if needed for the whole batch operation.
      console.error('Error during batch file upload:', batchError);
      // setError('An error occurred during file uploads.'); // Optional: general batch error
    } finally {
      setIsBatchUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input after processing
      }
    }
  };

  const handleDeleteFile = async (filePathToDelete: string) => {
    // Ensure filePathToDelete is the actual storage path, not the full public URL if it comes from formData
    let storagePath = filePathToDelete;
    if (filePathToDelete.includes('public/achievements/evidence/')) { // Check if it's a public URL
        const pathMatch = filePathToDelete.match(/evidence\/[^?]+/);
        if (pathMatch && pathMatch[0]) {
            storagePath = pathMatch[0];
        } else {
            setError('Could not determine the file path for deletion.');
            console.error('Invalid file path for deletion:', filePathToDelete);
            setDeleteConfirmation({ isOpen: false, fileName: '', filePath: '' });
            return;
        }
    }
    // If it's already a relative path like 'evidence/filename.ext', it should be fine.

    try {
      // const { error: deleteError } = await supabase.storage
      //   .from('achievements') // Bucket name
      //   .remove([storagePath]); // Path to file in the bucket

      // if (deleteError) throw deleteError;

      // const { error: deleteError} = await supabase.from()
      console.log(achievement)
      const { error } = await projectApi.deleteAchievementFile(achievement?.id, storagePath)

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        evidence_file: Array.isArray(prev.evidence_file) ? prev.evidence_file.filter(url => url !== filePathToDelete && getFileNameFromUrl(url) !== getFileNameFromUrl(storagePath)) : []
      }));
      
      // Also remove from selectedFiles if it was a newly uploaded file that's being deleted before form submission
      setSelectedFiles(prevSelected => prevSelected.filter(file => file.name !== getFileNameFromUrl(storagePath) && (file as any).uploadedName !== getFileNameFromUrl(storagePath)));

      setDeleteConfirmation({ isOpen: false, fileName: '', filePath: '' });
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Error deleting file:', err);
      setError(`Failed to delete ${getFileNameFromUrl(storagePath)}: ${err.message}`);
      setDeleteConfirmation({ isOpen: false, fileName: '', filePath: '' });
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
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1 md:p-0">
      {error && (
        <div className="rounded-md bg-red-50 p-3 md:p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <Input
        label="Description *"
        id="description"
        required
        type="textarea"
        rows={3}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <Input
          label="Date Achieved *"
          type="date"
          id="date_achieved"
          value={formData.date_achieved}
          onChange={(e) => setFormData({ ...formData, date_achieved: e.target.value })}
          className="w-full"
        />

        {/* <Input
          label="Metric"
          id="metric"
          value={formData.metric}
          onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
          className="w-full"
        /> */}
      </div>

      <Input
        label="Supporting Evidence (URL)"
        id="supporting_evidence_url"
        type="url"
        value={formData.evidence_url}
        onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
        className="w-full"
      />

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
                            // Pass the full URL here, handleDeleteFile will parse it
                            filePath: url 
                          })}
                          className="p-1 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                          disabled={isBatchUploading} 
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      
      {/* Uploading Files Preview / Progress */}
      {(selectedFiles.length > 0 || Object.keys(fileUploads).length > 0) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            {isBatchUploading ? 'Uploading Files...' : (Object.keys(fileUploads).length > 0 ? 'Pending Uploads:' : 'Selected Files:')}
          </h4>
          <div className="max-h-[150px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {selectedFiles.map((file) => {
              const uploadInfo = fileUploads[file.name];
              if (!uploadInfo && !formData.evidence_file.some(url => getFileNameFromUrl(url) === file.name || getFileNameFromUrl(url) === (file as any).uploadedName)) {
                // File selected but not yet processed or already uploaded and removed from selectedFiles
                return null; 
              }
              // Only show files that are currently being processed or are selected and not yet uploaded.
              // If a file is in `fileUploads`, it means it's being processed or waiting.
              // If it's only in `selectedFiles` but not `fileUploads` and not in `formData.evidence_file`, it's pending.
              if (!uploadInfo && formData.evidence_file.find(fUrl => getFileNameFromUrl(fUrl) === (file as any).uploadedName)) return null; // Already uploaded and in formData

              return (
                <div key={file.name} className="flex items-center justify-between bg-gray-50 p-2 rounded mb-1">
                  <span className="text-sm text-gray-600 truncate w-2/3">
                    {uploadInfo?.uploadedName || file.name}
                  </span>
                  <div className="flex items-center space-x-2 w-1/3 justify-end">
                    {uploadInfo && uploadInfo.progress >= 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-150"
                          style={{ width: `${uploadInfo.progress}%` }}
                        />
                      </div>
                    )}
                    {/* Show X to remove only if not actively uploading OR if it's just selected and not yet in fileUploads for processing */}
                    {(!uploadInfo || uploadInfo.progress === 0) && !isBatchUploading && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="p-1 rounded-full hover:bg-gray-200"
                        disabled={isBatchUploading} // Also disable remove if batch is uploading
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-3 pt-4 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
          disabled={loading || isBatchUploading} // Disable cancel if busy
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || isBatchUploading} // Disable save if form submitting OR files uploading
          className="w-full sm:w-auto"
        >
          {loading ? 'Saving...' : (isBatchUploading ? 'Uploading...' : 'Save Achievement')}
        </Button>
      </div>
      <DeleteConfirmationDialog 
         isOpen={deleteConfirmation.isOpen}
         fileName={deleteConfirmation.fileName}
         onConfirm={() => handleDeleteFile(deleteConfirmation.filePath)}
         onCancel={() => setDeleteConfirmation({ isOpen: false, fileName: '', filePath: '' })}
       />
    </form>

   
  );
}
     