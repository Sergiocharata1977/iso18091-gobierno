'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { animations } from '../utils/animations';
import { useNewsFeed } from '../utils/hooks/useNewsFeed';
import { validatePostContent } from '../utils/validations';
import { LoadMoreButton } from './LoadMoreButton';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';

interface NewsFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhotoURL?: string;
  isAdmin?: boolean;
  className?: string;
  /** Control externo del compositor desde el header */
  initialShowComposer?: boolean;
  /** Callback cuando se cierra el compositor */
  onComposerClose?: () => void;
}

export function NewsFeed({
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  isAdmin = false,
  className = '',
  initialShowComposer = false,
  onComposerClose,
}: NewsFeedProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const effectiveUserId = currentUserId || user?.id || '';
  const effectiveUserName =
    currentUserName || user?.email?.split('@')[0] || 'Usuario';

  const [showComposer, setShowComposer] = useState(initialShowComposer);
  const [isUploading, setIsUploading] = useState(false);

  // Sincronizar con prop externa (del header)
  useEffect(() => {
    if (initialShowComposer) {
      setShowComposer(true);
    }
  }, [initialShowComposer]);

  const {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    addPost,
    updatePost,
    removePost,
  } = useNewsFeed({
    organizationId: organizationId || '',
    currentUserId: effectiveUserId,
  });

  const handleCreatePost = async (content: string, files: File[]) => {
    if (!organizationId) {
      alert('Error: No se encontró la organización');
      return;
    }

    // Validate content
    const validation = validatePostContent(content, files);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    try {
      setIsUploading(true);

      // Get auth token
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      const token = await user.getIdToken();

      // Upload images client-side first (this works with Firebase client SDK)
      let uploadedImages: Array<{
        id: string;
        url: string;
        alt: string;
        storagePath: string;
      }> = [];

      if (files.length > 0) {
        const { StorageService } = await import(
          '@/services/storage/StorageService'
        );
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          const postId = `post-${Date.now()}`;
          const storagePath = StorageService.getNewsPath(
            organizationId,
            postId
          );
          const uploaded = await StorageService.uploadFiles(
            imageFiles,
            storagePath
          );

          uploadedImages = uploaded.map(file => ({
            id: file.id,
            url: file.url,
            alt: file.name,
            storagePath: file.path,
          }));
        }
      }

      // Send JSON to API (without files, just URLs)
      const response = await fetch('/api/news/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          organizationId,
          images: uploadedImages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 'Error al crear publicación'
        );
      }

      const result = await response.json();

      // Add the created post to local state
      if (result.success && result.data) {
        addPost(result.data);
      }

      setShowComposer(false);
      onComposerClose?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error al crear la publicación. Por favor, intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReaction = async (
    postId: string,
    reactionType: string,
    hasReacted: boolean
  ) => {
    try {
      // Update local state optimistically
      const post = posts.find(p => p.id === postId);
      if (post) {
        updatePost(postId, {
          reactionCount: hasReacted
            ? post.reactionCount + 1
            : Math.max(0, post.reactionCount - 1),
          userReacted: hasReacted,
        });
      }

      // Here you would call the API
      console.log('Reaction:', { postId, reactionType, hasReacted });
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Revert optimistic update on error
      const post = posts.find(p => p.id === postId);
      if (post) {
        updatePost(postId, {
          reactionCount: hasReacted
            ? Math.max(0, post.reactionCount - 1)
            : post.reactionCount + 1,
          userReacted: !hasReacted,
        });
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Get auth token
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      const token = await user.getIdToken();

      // Call DELETE API
      const response = await fetch(`/api/news/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 'Error al eliminar publicación'
        );
      }

      // Update local state after successful API call
      removePost(postId);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error al eliminar la publicación');
    }
  };

  // Si no hay organización, mostrar mensaje
  if (!organizationId) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-yellow-600">Cargando sesión...</p>
      </div>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton for composer */}
        <div className="animate-pulse">
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>

        {/* Loading skeletons for posts */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            variants={animations.skeletonAnimation}
            className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Post Composer */}
      <AnimatePresence>
        {showComposer ? (
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={animations.fadeIn}
          >
            <PostComposer
              currentUser={{
                uid: effectiveUserId,
                displayName: effectiveUserName,
                photoURL: currentUserPhotoURL,
              }}
              onSubmit={handleCreatePost}
              isLoading={isUploading}
              placeholder="¿Qué novedades quieres compartir con tu equipo?"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={() => setShowComposer(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg gap-3"
            >
              ✏️ Crear nueva publicación
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Posts Feed */}
      <motion.div
        variants={animations.staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        <AnimatePresence>
          {posts.map((post, index) => (
            <motion.div key={post.id} variants={animations.staggerItem} layout>
              <PostCard
                post={post}
                currentUserId={effectiveUserId}
                currentUserName={effectiveUserName}
                currentUserPhotoURL={currentUserPhotoURL}
                isAdmin={isAdmin}
                onDelete={handleDeletePost}
                onReaction={handleReaction}
                variant={index === 0 ? 'featured' : 'default'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {!isLoading && posts.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No hay publicaciones aún
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Sé el primero en compartir novedades con tu equipo
          </p>
          <Button
            onClick={() => setShowComposer(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Crear primera publicación
          </Button>
        </motion.div>
      )}

      {/* Load More */}
      {posts.length > 0 && (
        <LoadMoreButton
          onLoadMore={loadMore}
          isLoading={isLoadingMore}
          hasMore={hasMore}
          onRetry={refresh}
        />
      )}
    </div>
  );
}
