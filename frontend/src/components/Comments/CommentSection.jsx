// frontend/src/components/Comments/CommentSection.jsx
// v1.2.0-prod — Fixes nested form issue by using type="button".

import { useState, useEffect } from 'react';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { commentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CommentSection = ({ entityType, entityId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    if (!entityType || !entityId) return;
    setIsLoading(true);
    try {
      const res = await commentApi.getByEntity(entityType, entityId);
      if (res.data?.success) {
        setComments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Could not load comments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [entityType, entityId]);

  // ★ FIXED: No longer takes 'e', just handles the post
  const handlePost = async () => {
    if (!newComment.trim() || isPosting) return;

    setIsPosting(true);
    setError('');
    try {
      const res = await commentApi.create(entityType, entityId, newComment);
      if (res.data?.success) {
        setComments([...comments, res.data.data]);
        setNewComment('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setIsPosting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-NG', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary-600 dark:text-gold-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Internal Comments
        </h3>
        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {/* Comment List */}
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2">
            No internal comments yet. Start the conversation.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {comment.user_name || 'Unknown User'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input — Changed from <form> to <div> */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handlePost();
            }
          }}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isPosting}
        />
        <button
          type="button" // ★ FIXED: type="button" prevents form submission
          onClick={handlePost}
          disabled={!newComment.trim() || isPosting}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default CommentSection;