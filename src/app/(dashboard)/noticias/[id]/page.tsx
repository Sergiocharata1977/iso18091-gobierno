'use client';

import { CommentList } from '@/components/news/CommentList';
import { PostCard } from '@/components/news/PostCard';
import { Button } from '@/components/ui/button';
import { Post } from '@/types/news';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PostDetailPage() {
  const [user, setUser] = useState<{ uid: string; role: string } | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();

        const unsubscribe = auth.onAuthStateChanged(async firebaseUser => {
          if (!firebaseUser) {
            router.push('/login');
            return;
          }

          const idTokenResult = await firebaseUser.getIdTokenResult();
          const role = (idTokenResult.claims.role as string) || 'user';

          setUser({
            uid: firebaseUser.uid,
            role,
          });

          // Cargar el post
          await loadPost(firebaseUser);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, postId]);

  const loadPost = async (firebaseUser: any) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/news/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('not_found');
        } else {
          setError('error');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setPost(data.data);
    } catch (err) {
      console.error('Error loading post:', err);
      setError('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error === 'not_found' || !post || !post.isActive) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Publicación no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Esta publicación no existe o ha sido eliminada.
          </p>
          <Link href="/noticias">
            <Button>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver a Noticias
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Error al cargar</h2>
          <p className="text-muted-foreground mb-4">
            Hubo un error al cargar la publicación.
          </p>
          <Link href="/noticias">
            <Button>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver a Noticias
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="container max-w-3xl py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/noticias">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Volver a Noticias
          </Button>
        </Link>
      </div>

      {/* Post */}
      <div className="space-y-6">
        <PostCard post={post} currentUserId={user.uid} isAdmin={isAdmin} />

        {/* Comentarios */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Comentarios</h2>
          <CommentList
            postId={postId}
            currentUserId={user.uid}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
