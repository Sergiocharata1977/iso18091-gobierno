'use client';

import { useCallback, useEffect, useState } from 'react';

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  images?: Array<{ id: string; url: string; alt?: string }>;
  reactionCount: number;
  commentCount: number;
  userReacted: boolean;
}

interface UseNewsFeedOptions {
  organizationId: string;
  currentUserId: string;
  initialFilters?: {
    category?: string;
    author?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
  pageSize?: number;
}

interface UseNewsFeedReturn {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  filters: {
    category?: string;
    author?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
  loadPosts: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateFilters: (
    newFilters: Partial<UseNewsFeedOptions['initialFilters']>
  ) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
}

export function useNewsFeed({
  organizationId,
  currentUserId,
  initialFilters = {},
  pageSize = 10,
}: UseNewsFeedOptions): UseNewsFeedReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();

      // Si ya hay un usuario, obtener token directamente
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }

      // Esperar a que el estado de auth se resuelva
      return new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, async user => {
          unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken();
              resolve(token);
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });

        // Timeout después de 5 segundos
        setTimeout(() => resolve(null), 5000);
      });
    } catch (err) {
      console.error('Error getting auth token:', err);
      return null;
    }
  };

  // Marcar cuando auth está listo
  useEffect(() => {
    const checkAuth = async () => {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, user => {
        setIsAuthReady(true);
        if (!user) {
          setError('Usuario no autenticado');
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    };
    checkAuth();
  }, []);

  const buildQueryParams = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: pageSize.toString(),
        organizationId,
      });

      if (filters.category) params.append('category', filters.category);
      if (filters.author) params.append('author', filters.author);
      if (filters.dateFrom)
        params.append('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());

      return params;
    },
    [organizationId, pageSize, filters]
  );

  const loadPosts = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const token = await getAuthToken();

        if (!token) {
          setError(
            'Sesión no iniciada. Por favor, inicia sesión para ver las publicaciones.'
          );
          return;
        }

        const params = buildQueryParams(pageNum);

        const response = await fetch(`/api/news/posts?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to load posts');
        }

        const data = await response.json();

        setPosts(prev => (append ? [...prev, ...data.data] : data.data));
        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.error('Error loading posts:', err);
        setError(
          err instanceof Error ? err.message : 'Error al cargar publicaciones'
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildQueryParams]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await loadPosts(page + 1, true);
  }, [hasMore, isLoadingMore, page, loadPosts]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadPosts(1, false);
  }, [loadPosts]);

  const updateFilters = useCallback(
    (newFilters: Partial<UseNewsFeedOptions['initialFilters']>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
      setPage(1);
      // Filters will trigger a reload via useEffect
    },
    []
  );

  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts(prev =>
      prev.map(post => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadPosts(1, false);
  }, [filters, loadPosts]);

  // Initial load
  useEffect(() => {
    loadPosts(1, false);
  }, []); // Only run once on mount

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filters,
    loadPosts,
    loadMore,
    refresh,
    updateFilters,
    addPost,
    updatePost,
    removePost,
  };
}
