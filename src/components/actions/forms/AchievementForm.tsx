import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, AlertCircle, Loader2, Calendar, FileIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete File</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
            Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-gray-100">"{fileName}"</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel} size="sm" className="px-4">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} size="sm" className="px-4">
              Delete
            </Button>
          </div>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description *
        </label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the achievement..."
          required
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="date_achieved" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date Achieved *
          </label>
          <Input
            id="date_achieved"
            type="date"
            value={formData.date_achieved}
            onChange={(e) => setFormData({ ...formData, date_achieved: e.target.value })}
            required
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="supporting_evidence_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Supporting Evidence URL
        </label>
        <Input
          id="supporting_evidence_url"
          type="url"
          value={formData.evidence_url}
          onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
          placeholder="https://example.com/evidence"
          className="h-10"
        />
      </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileIcon className="inline h-4 w-4 mr-1" />
            Upload Evidence Files
          </label>
          <div className="mt-1 flex items-center space-x-4">
            <div className="flex-1">
              <label
                htmlFor="evidence_file"
                className={`
                  border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer
                  ${selectedFiles.length ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
                `}
              >
                <div className="space-y-1 text-center">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg inline-block mb-3">
                    <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Drag and drop files here, or{' '}
                      <span className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium underline">
                        {selectedFiles.length ? `${selectedFiles.length} files selected` : 'browse'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Images, PDFs, Documents • Max 5MB each
                    </p>
                  </div>
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
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded Files</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {formData.evidence_file.map((url, index) => {
                  const fileName = getFileNameFromUrl(url);
                  return (
                    <div key={url} className="relative group bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="aspect-w-16 aspect-h-9 mb-2">
                        {isImageFile(url) ? (
                          <img
                            src={url}
                            alt={fileName}
                            className="object-cover rounded border border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                            <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmation({ 
                            isOpen: true, 
                            fileName, 
                            // Pass the full URL here, handleDeleteFile will parse it
                            filePath: url 
                          })}
                          className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <div key={file.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-1">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {uploadInfo && uploadInfo.progress > 0 && uploadInfo.progress < 100 ? (
                        <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate block">
                        {uploadInfo?.uploadedName || file.name}
                      </span>
                      {uploadInfo && uploadInfo.progress >= 0 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-150"
                            style={{ width: `${uploadInfo.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show X to remove only if not actively uploading OR if it's just selected and not yet in fileUploads for processing */}
                  {(!uploadInfo || uploadInfo.progress === 0) && !isBatchUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.name)}
                      className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      disabled={isBatchUploading} // Also disable remove if batch is uploading
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (isBatchUploading ? 'Uploading...' : 'Save Achievement')}
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
     