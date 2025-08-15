import React, { useState } from 'react';
import { FileText, Image, Download, Eye, Trash2, Loader2 } from 'lucide-react';
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
  onDelete?: (id: string) => Promise<void> | void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    try {
      setDeletingDocument(id);
      await Promise.resolve(onDelete(id));
    } finally {
      setDeletingDocument(null);
    }
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
            deletingDocument === doc.id ? 'opacity-60' : ''
          }`}
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
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              title="View"
              disabled={deletingDocument === doc.id}
            >
              <Eye className="h-5 w-5" />
            </button>
            <a
              href={`https://yoltenqbpcdwshfehuwm.supabase.co/storage/v1/object/public/intervention-documents/${doc.url}`}
              download={doc.name}
              className="text-gray-600 hover:text-gray-800 pointer-events-auto"
              title="Download"
              aria-disabled={deletingDocument === doc.id}
              onClick={(e) => {
                if (deletingDocument === doc.id) e.preventDefault();
              }}
            >
              <Download className="h-5 w-5" />
            </a>
            {/* Delete button only rendered when onDelete provided */}
            {onDelete && (
              <button
                onClick={() => handleDelete(doc.id)}
                className="inline-flex items-center justify-center text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title={deletingDocument === doc.id ? 'Deleting…' : 'Delete'}
                disabled={deletingDocument === doc.id}
              >
                {deletingDocument === doc.id ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2 text-xs text-gray-600">Deleting…</span>
                  </>
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            )}
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