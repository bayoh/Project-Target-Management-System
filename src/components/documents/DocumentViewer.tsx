import React, { useState } from 'react';
import { FileText, Image, Download, ExternalLink } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  name: string;
  type: string;
  onClose?: () => void;
}

export function DocumentViewer({ url, name, type, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  const isImage = type.startsWith('image/');
  const isPDF = type === 'application/pdf';

  const renderContent = () => {
    if (isImage) {
      return (
        <img
          src={url}
          alt={name}
          className="max-w-full h-auto"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      );
    }

    if (isPDF) {
      // Use Google Docs viewer for PDFs to avoid CORS issues
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe
          src={googleDocsUrl}
          className="w-full h-[calc(100vh-12rem)]"
          onLoad={() => setIsLoading(false)}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600">
          This file type cannot be previewed directly.
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-500 bg-opacity-75">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center space-x-3">
              {isImage ? (
                <Image className="h-5 w-5 text-gray-400" />
              ) : isPDF ? (
                <FileText className="h-5 w-5 text-gray-400" />
              ) : (
                <FileText className="h-5 w-5 text-gray-400" />
              )}
              <h3 className="text-lg font-medium text-gray-900">{name}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={url}
                download={name}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </a>
              {onClose && (
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}