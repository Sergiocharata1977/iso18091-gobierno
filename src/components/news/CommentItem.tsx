'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Comment } from '@/types/news';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ReactionButton } from './ReactionButton';

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  isAdmin: boolean;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = comment.authorId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete?.(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error al eliminar el comentario');
    } finally {
      setIsDeleting(false);
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

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Hace un momento';
    }
  };

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.authorPhotoURL || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{comment.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
              {comment.isEdited && (
                <span className="ml-1 italic">(editado)</span>
              )}
            </p>
          </div>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(comment)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </p>

        <div className="pt-1">
          <ReactionButton
            targetType="comment"
            targetId={comment.id}
            currentUserId={currentUserId}
            initialCount={comment.reactionCount}
            initialUserReacted={false}
          />
        </div>
      </div>
    </div>
  );
}
