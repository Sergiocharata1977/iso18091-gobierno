'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/news';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PostCard } from './PostCard';
import { PostForm } from './PostForm';

interface NewsFeedProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

export function NewsFeed({ currentUserId, isAdmin = false }: NewsFeedProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const effectiveUserId = currentUserId || user?.id || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadPosts();
    }
  }, [organizationId]);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken();
  };

  const loadPosts = async (pageNum: number = 1) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts?page=${pageNum}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setPosts(data.data);
      } else {
        setPosts(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Error al cargar publicaciones');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    loadPosts(page + 1);
  };

  const handleCreatePost = async (content: string, imageFiles: File[]) => {
    if (!organizationId) {
      throw new Error('No organization ID available');
    }

    try {
      const token = await getAuthToken();

      // Crear FormData
      const formData = new FormData();
      formData.append('content', content);
      formData.append('organizationId', organizationId);

      // Agregar archivos de imagen
      imageFiles.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });

      const response = await fetch('/api/news/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const data = await response.json();
      setPosts([data.data, ...posts]);
    } catch (err) {
      console.error('Error creating post:', err);
      throw new Error('Error al crear publicación');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/news/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      throw err;
    }
  };

  if (!organizationId) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-600">Cargando sesión...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => loadPosts()} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario de nueva publicación */}
      <PostForm onSubmit={handleCreatePost} />

      {/* Lista de publicaciones */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No hay publicaciones aún. ¡Sé el primero en publicar!
            </p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={effectiveUserId}
                isAdmin={isAdmin}
                onDelete={handleDeletePost}
              />
            ))}

            {/* Botón cargar más */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                >
                  {isLoadingMore && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
