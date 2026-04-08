'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Comment } from '@/types/news';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function CommentList({
  postId,
  currentUserId,
  isAdmin,
}: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 1000;
  const isValid =
    newComment.trim().length >= 1 && newComment.length <= maxLength;

  useEffect(() => {
    loadComments();
  }, [postId]);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken();
  };

  const loadComments = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts/${postId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.data);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Error al cargar comentarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('El comentario debe tener entre 1 y 1000 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      const data = await response.json();
      setComments([...comments, data.data]);
      setNewComment('');
    } catch (err) {
      console.error('Error creating comment:', err);
      setError('Error al crear comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Formulario de nuevo comentario */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {maxLength - newComment.length < 100 && (
                  <span
                    className={
                      newComment.length > maxLength ? 'text-destructive' : ''
                    }
                  >
                    {maxLength - newComment.length} caracteres restantes
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                size="sm"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Comentar
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {/* Lista de comentarios */}
      <div className="space-y-1">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay comentarios aún. ¡Sé el primero en comentar!
          </p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
