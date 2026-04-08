'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock,
  Eye,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ReactionButton } from '../interactions/ReactionButton';
import { ShareButton } from '../interactions/ShareButton';
import { ImageGallery } from '../media/ImageGallery';
import { animations } from '../utils/animations';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date;
  updatedAt?: Date;
  images?: Array<{ id: string; url: string; alt?: string }>;
  reactionCount: number;
  commentCount: number;
  userReacted: boolean;
  isEdited?: boolean;
  views?: number;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  currentUserName?: string;
  currentUserPhotoURL?: string;
  isAdmin: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onReaction?: (
    postId: string,
    reactionType: string,
    hasReacted: boolean
  ) => Promise<void>;
  variant?: 'default' | 'compact' | 'featured';
  showMetrics?: boolean;
  className?: string;
}

export function PostCard({
  post,
  currentUserId,
  currentUserName = 'Usuario',
  currentUserPhotoURL,
  isAdmin,
  onEdit,
  onDelete,
  onReaction,
  variant = 'default',
  showMetrics = true,
  className = '',
}: PostCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);

  const isAuthor = post.authorId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken();
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // Already loaded

    setIsLoadingComments(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts/${post.id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleComments = async () => {
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      await loadComments();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.data]);
        setNewComment('');
        setLocalCommentCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setLocalCommentCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
      return;
    }

    try {
      await onDelete?.(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error al eliminar la publicación');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (timestamp: Date) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true, locale: es });
    } catch {
      return 'Hace un momento';
    }
  };

  const cardVariants = {
    default: 'w-full',
    compact: 'w-full max-w-md',
    featured: 'w-full max-w-2xl mx-auto',
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="whileHover"
      variants={animations.cardHover}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cardVariants[variant]}
    >
      <Card
        className={`transition-all duration-200 shadow-md hover:shadow-xl ${className}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-emerald-100">
                <AvatarImage src={post.authorPhotoURL} />
                <AvatarFallback className="bg-emerald-600 text-white">
                  {getInitials(post.authorName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {post.authorName}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-xs border-emerald-200 text-emerald-700"
                  >
                    ISO 9001
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.createdAt)}</span>
                  {post.isEdited && (
                    <span className="text-xs italic">(editado)</span>
                  )}
                  {showMetrics && post.views && (
                    <>
                      <span>•</span>
                      <Eye className="w-3 h-3" />
                      <span>{post.views}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="bg-white dark:bg-slate-900 shadow-lg border"
                >
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(post)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Post Content */}
          <div className="prose prose-sm max-w-none">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Images Gallery - Facebook Style */}
          {post.images && post.images.length > 0 && (
            <div className="rounded-xl overflow-hidden -mx-4 sm:mx-0">
              {post.images.length === 1 ? (
                // Single image - full width, maintains aspect ratio
                <div
                  className="relative w-full cursor-pointer group"
                  onClick={() => window.open(post.images![0].url, '_blank')}
                >
                  <img
                    src={post.images[0].url}
                    alt={post.images[0].alt || 'Imagen de publicación'}
                    className="w-full max-h-[500px] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ) : (
                // Multiple images - use gallery grid
                <ImageGallery
                  images={post.images}
                  maxDisplay={4}
                  className="rounded-none"
                />
              )}
            </div>
          )}

          {/* Engagement Actions - Like Facebook */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <ReactionButton
                targetType="post"
                targetId={post.id}
                currentUserId={currentUserId}
                initialCount={post.reactionCount}
                initialUserReacted={post.userReacted}
                onReaction={onReaction}
                variant="compact"
              />

              {/* Comment Button - toggles inline comments */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleComments}
                className={`gap-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 ${
                  showComments ? 'text-emerald-600 bg-emerald-50' : ''
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">{localCommentCount}</span>
              </Button>
            </div>

            <ShareButton
              postId={post.id}
              postTitle={post.content.substring(0, 50) + '...'}
              variant="compact"
            />
          </div>

          {/* Inline Comments Section - Facebook Style */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-slate-100 pt-3 space-y-3"
              >
                {/* Comment Input */}
                <form
                  onSubmit={handleSubmitComment}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={currentUserPhotoURL} />
                    <AvatarFallback className="bg-emerald-600 text-white text-xs">
                      {getInitials(currentUserName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder={`Comentar como ${currentUserName}...`}
                      className="pr-10 rounded-full bg-slate-100 border-0 focus:ring-2 focus:ring-emerald-500"
                      disabled={isSubmittingComment}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-emerald-100"
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                  </div>
                </form>

                {/* Comments List */}
                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-2">
                    Sé el primero en comentar
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {comments.map(comment => {
                      const canDeleteComment =
                        comment.authorId === currentUserId || isAdmin;
                      return (
                        <div key={comment.id} className="flex gap-2 group">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={comment.authorPhotoURL} />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              {getInitials(comment.authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-slate-100 rounded-2xl px-3 py-2">
                              <p className="text-sm font-medium text-slate-900">
                                {comment.authorName}
                              </p>
                              <p className="text-sm text-slate-700">
                                {comment.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-3">
                              <span className="text-xs text-slate-400">
                                {formatDate(comment.createdAt)}
                              </span>
                              {canDeleteComment && (
                                <button
                                  onClick={() =>
                                    handleDeleteComment(comment.id)
                                  }
                                  className="text-xs text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
