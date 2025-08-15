import React, { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface CommentUser {
  full_name: string;
  avatar_url?: string | null;
}

export interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  user: CommentUser;
}

interface CommentsSectionProps {
  title?: string;
  comments: CommentItem[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  className?: string;
  // Deletion controls
  currentUserId?: string;
  contentCreatorId?: string;
  onDelete?: (commentId: string) => Promise<void> | void;
  // Avatar controls
  showAvatars?: boolean;
}

export function CommentsSection({
  title = 'Comments',
  comments,
  value,
  onChange,
  onSubmit,
  submitting = false,
  className = '',
  currentUserId,
  contentCreatorId,
  onDelete,
  showAvatars = true,
}: CommentsSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (commentId: string) => {
    if (!onDelete) return;
    setDeletingId(commentId);
    try {
      await onDelete(commentId);
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase();
  };

  return (
    <div className={`bg-white shadow-sm rounded-lg p-4 sm:p-6 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>

      {/* Comment Form */}
      <form onSubmit={onSubmit} className="mb-6">
        <div>
          <label htmlFor="comment" className="sr-only">Add comment</label>
          <textarea
            id="comment"
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add a comment..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => {
          const canDelete = !!currentUserId && (currentUserId === comment.created_by || currentUserId === contentCreatorId);
          const isDeleting = deletingId === comment.id;
          return (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {showAvatars && (
                    comment.user.avatar_url ? (
                      <img
                        src={comment.user.avatar_url}
                        alt={`${comment.user.full_name}'s avatar`}
                        className="h-8 w-8 rounded-full object-cover bg-gray-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                        {getInitials(comment.user.full_name)}
                      </div>
                    )
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user.full_name}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    {format(new Date(comment.created_at), 'PPp')}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(comment.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center text-red-600 hover:text-red-800 disabled:opacity-50"
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            No comments yet. Be the first to add one!
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          void handleDelete(confirmDeleteId);
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="danger"
      />
    </div>
  );
}