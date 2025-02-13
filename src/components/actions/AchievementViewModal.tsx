import React from 'react';
import { X, ExternalLink, FileText, Download } from 'lucide-react';

interface AchievementViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    description: string;
    date_achieved: string;
    evidence_url?: string;
    evidence_file?: string[];
  };
}

export function AchievementViewModal({ isOpen, onClose, achievement }: AchievementViewModalProps) {
  if (!isOpen) return null;

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
  };

  const isPDFFile = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Achievement Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Description</h4>
            <p className="mt-1 text-sm text-gray-900">{achievement.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700">Date Achieved</h4>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(achievement.date_achieved).toLocaleDateString()}
            </p>
          </div>

          {achievement.evidence_url && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Evidence URL</h4>
              <a
                href={achievement.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
              >
                {achievement.evidence_url}
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
          )}

          {achievement.evidence_file && achievement.evidence_file.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence Files</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievement.evidence_file.map((url, index) => {
                  const fileName = getFileNameFromUrl(url);
                  return (
                    <div key={url} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="aspect-w-16 aspect-h-9 mb-2">
                        {isImageFile(url) ? (
                          <img
                            src={url}
                            alt={fileName}
                            className="object-cover rounded cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ) : isPDFFile(url) ? (
                          <div 
                            className="flex items-center justify-center bg-gray-100 rounded cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-gray-100 rounded">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate flex-1">{fileName}</span>
                        <a
                          href={url}
                          download
                          className="p-1 rounded-full hover:bg-gray-200"
                          title="Download file"
                        >
                          <Download className="h-4 w-4 text-gray-500" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}