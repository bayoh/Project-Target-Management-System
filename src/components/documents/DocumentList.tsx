import React, { useState } from 'react';
import { FileText, Image, Download, Eye } from 'lucide-react';
import { DocumentViewer } from './DocumentViewer';

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete?: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-gray-400" />;
    }
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(doc.type)}
            <div>
              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedDocument(doc)}
              className="text-blue-600 hover:text-blue-800"
              title="View"
            >
              <Eye className="h-5 w-5" />
            </button>
            <a
              href={doc.url}
              download={doc.name}
              className="text-gray-600 hover:text-gray-800"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </a>
          </div>
        </div>
      ))}

      {selectedDocument && (
        <DocumentViewer
          url={selectedDocument.url}
          name={selectedDocument.name}
          type={selectedDocument.type}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}