'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/lib/sdk/modules/news/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Heart,
  MessageCircle,
  TrendingUp,
  Star,
  Clock,
} from 'lucide-react';

interface PostsShowcaseProps {
  type?: 'trending' | 'featured' | 'popular' | 'recent';
  limit?: number;
  showTabs?: boolean;
}

export function PostsShowcase({
  type = 'trending',
  limit = 10,
  showTabs = true,
}: PostsShowcaseProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(type);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts(activeTab);
  }, [activeTab]);

  const loadPosts = async (tabType: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sdk/posts/${tabType}?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = await response.json();
      setPosts(data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (tabType: string) => {
    switch (tabType) {
      case 'trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'featured':
        return <Star className="h-4 w-4" />;
      case 'popular':
        return <Heart className="h-4 w-4" />;
      case 'recent':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTitle = (tabType: string) => {
    switch (tabType) {
      case 'trending':
        return 'Posts en Tendencia';
      case 'featured':
        return 'Posts Destacados';
      case 'popular':
        return 'Posts Populares';
      case 'recent':
        return 'Posts Recientes';
      default:
        return 'Posts';
    }
  };

  const renderPostCard = (post: Post) => (
    <Card key={post.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <CardDescription className="mt-1">
              Por {post.author} •{' '}
              {(
                (post.createdAt as any)?.toDate?.() ||
                new Date(post.createdAt as any)
              ).toLocaleDateString()}
            </CardDescription>
          </div>
          {(post as any).isFeatured && (
            <Badge className="ml-2">
              <Star className="h-3 w-3 mr-1" />
              Destacado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{post.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments || 0}</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Leer más
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!showTabs) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {getIcon(type)}
          <h2 className="text-2xl font-bold">{getTitle(type)}</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay posts disponibles
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(renderPostCard)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Noticias</CardTitle>
        <CardDescription>Explora los posts más relevantes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as any)}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Tendencia</span>
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Destacados</span>
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Populares</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Recientes</span>
            </TabsTrigger>
          </TabsList>

          {['trending', 'featured', 'popular', 'recent'].map(tabType => (
            <TabsContent
              key={tabType}
              value={tabType}
              className="space-y-4 mt-4"
            >
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay posts disponibles
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map(renderPostCard)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
