'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Post } from '@/types/news';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ReactionButton } from './ReactionButton';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onModerate?: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onModerate,
}: PostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isAuthor = post.authorId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete?.(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error al eliminar la publicación');
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

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev =>
      prev === post.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex(prev =>
      prev === 0 ? post.images.length - 1 : prev - 1
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.authorPhotoURL || undefined} />
              <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(post.createdAt)}
                {post.isEdited && (
                  <span className="ml-1 italic">(editado)</span>
                )}
              </p>
            </div>
          </div>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(post)}>
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
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm whitespace-pre-wrap break-words">
          {post.content}
        </p>

        {/* Images Grid */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3">
            <div
              className={`grid gap-2 ${
                post.images.length === 1
                  ? 'grid-cols-1'
                  : post.images.length === 2
                    ? 'grid-cols-2'
                    : post.images.length === 3
                      ? 'grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {post.images.slice(0, 4).map((image, index) => (
                <button
                  key={index}
                  className="relative aspect-square overflow-hidden rounded border hover:opacity-80 transition-opacity"
                  onClick={() => openLightbox(index)}
                >
                  <Image
                    src={image.url}
                    alt={`Imagen ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  {post.images.length > 4 && index === 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        +{post.images.length - 4}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Lightbox Dialog */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-4xl">
                <div className="relative">
                  <Image
                    src={post.images[currentImageIndex]?.url || ''}
                    alt={`Imagen ${currentImageIndex + 1}`}
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                  {post.images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        {currentImageIndex + 1} / {post.images.length}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-4">
          <ReactionButton
            targetType="post"
            targetId={post.id}
            currentUserId={currentUserId}
            initialCount={post.reactionCount}
            initialUserReacted={false}
          />

          <Link href={`/noticias/${post.id}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">{post.commentCount}</span>
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
