'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageCircle,
  Send,
  MoreVertical,
  Heart,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReactionButton } from './ReactionButton';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date;
  updatedAt?: Date;
  reactionCount: number;
  userReacted: boolean;
  replies?: Comment[];
  isEdited?: boolean;
}

interface CommentThreadProps {
  postId: string;
  comments: Comment[];
  currentUserId: string;
  currentUserName: string;
  currentUserPhotoURL?: string;
  onAddComment?: (
    postId: string,
    content: string,
    parentId?: string
  ) => Promise<void>;
  onReaction?: (
    commentId: string,
    reactionType: string,
    hasReacted: boolean
  ) => Promise<void>;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  maxDepth?: number;
  className?: string;
}

export function CommentThread({
  postId,
  comments,
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  onAddComment,
  onReaction,
  onEditComment,
  onDeleteComment,
  maxDepth = 3,
  className = '',
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment?.(postId, newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment?.(postId, replyContent, parentId);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isReply = depth > 0;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
        <Card
          className={`border-l-4 ${isReply ? 'border-l-slate-300' : 'border-l-emerald-500'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.authorPhotoURL} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.authorName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(comment.createdAt, {
                      addSuffix: true,
                      locale: es,
                    })}
                    {comment.isEdited && (
                      <span className="ml-1 italic">(editado)</span>
                    )}
                  </span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words mb-3">
                  {comment.content}
                </p>

                <div className="flex items-center gap-2">
                  <ReactionButton
                    targetType="comment"
                    targetId={comment.id}
                    currentUserId={currentUserId}
                    initialCount={comment.reactionCount}
                    initialUserReacted={comment.userReacted}
                    onReaction={onReaction}
                    variant="compact"
                    showCount={true}
                  />

                  {depth < maxDepth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id ? null : comment.id
                        )
                      }
                      className="text-slate-600 hover:text-emerald-600 gap-1"
                    >
                      <Reply className="h-3 w-3" />
                      Responder
                    </Button>
                  )}

                  {hasReplies && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReplies(comment.id)}
                      className="text-slate-600 hover:text-emerald-600 gap-1"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {comment.replies?.length} respuesta
                      {comment.replies!.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={currentUserPhotoURL} />
                        <AvatarFallback className="text-xs">
                          {getInitials(currentUserName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder={`Responder a ${comment.authorName}...`}
                          className="min-h-[60px] text-sm resize-none"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleAddReply(comment.id);
                            }
                          }}
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!replyContent.trim() || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Responder
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nested Replies */}
        {hasReplies && isExpanded && (
          <div className="mt-2">
            {comment.replies!.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
        </div>
      )}

      {/* Add Comment Form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUserPhotoURL} />
              <AvatarFallback className="text-xs">
                {getInitials(currentUserName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="min-h-[80px] resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddComment();
                  }
                }}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Send className="h-4 w-4" />
                  Comentar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
