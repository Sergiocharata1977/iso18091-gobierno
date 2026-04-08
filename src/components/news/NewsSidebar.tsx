'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/news';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  CheckSquare,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface NewsSidebarProps {
  currentUserId?: string;
}

export function NewsSidebar({ currentUserId }: NewsSidebarProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadTrendingPosts();
    }
  }, [organizationId]);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken();
  };

  const loadTrendingPosts = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/sdk/posts/trending?limit=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load trending posts');
      }

      const data = await response.json();
      setTrendingPosts(data.data || []);
    } catch (err) {
      console.error('Error loading trending posts:', err);
      setError('Error al cargar posts trending');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Hace un momento';
    }
  };

  const quickLinks = [
    {
      label: 'Auditorías',
      href: '/mejoras/auditorias',
      icon: CheckSquare,
      color: 'text-blue-600',
    },
    {
      label: 'Documentos',
      href: '/documentos',
      icon: FileText,
      color: 'text-green-600',
    },
    {
      label: 'Calendario',
      href: '/calendario',
      icon: Calendar,
      color: 'text-purple-600',
    },
    {
      label: 'Procesos',
      href: '/procesos',
      icon: Users,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Enlaces Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                >
                  <Icon className={`h-4 w-4 mr-2 ${link.color}`} />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Trending Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : trendingPosts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay posts trending aún
            </p>
          ) : (
            <div className="space-y-3">
              {trendingPosts.map(post => (
                <Link
                  key={post.id}
                  href={`/noticias/${post.id}`}
                  className="block group"
                >
                  <div className="p-2 rounded hover:bg-muted transition-colors">
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>💬 {post.commentCount}</span>
                      <span>❤️ {post.reactionCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            Comparte noticias, actualizaciones y eventos importantes con tu
            equipo.
          </p>
          <p>
            Los posts más comentados y reaccionados aparecen en la sección
            Trending.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
