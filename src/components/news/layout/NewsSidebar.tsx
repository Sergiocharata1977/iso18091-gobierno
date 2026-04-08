'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Users,
  MessageSquare,
  Heart,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NewsSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  stats?: {
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
    activeUsers: number;
  };
  categories?: Array<{
    id: string;
    name: string;
    count: number;
    color: string;
  }>;
  recentPosts?: Array<{
    id: string;
    title: string;
    author: string;
    timestamp: Date;
  }>;
  className?: string;
}

export function NewsSidebar({
  isCollapsed = false,
  onToggle,
  stats = {
    totalPosts: 0,
    totalComments: 0,
    totalReactions: 0,
    activeUsers: 0,
  },
  categories = [],
  recentPosts = [],
  className = '',
}: NewsSidebarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days}d`;
    if (hours > 0) return `hace ${hours}h`;
    return 'ahora';
  };

  return (
    <aside
      className={`relative transition-all duration-300 ease-in-out ${className}`}
    >
      <div className="space-y-4 p-4">
        {/* Statistics Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle
              className={`flex items-center gap-2 text-slate-900 dark:text-slate-100 ${isCollapsed ? 'justify-center' : ''}`}
            >
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              {!isCollapsed && 'Estadísticas'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`grid gap-3 ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}
            >
              <div
                className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}
              >
                <MessageSquare className="h-4 w-4 text-slate-500" />
                {!isCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(stats.totalPosts)}
                    </p>
                    <p className="text-xs text-slate-500">Publicaciones</p>
                  </div>
                )}
              </div>

              <div
                className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Heart className="h-4 w-4 text-red-500" />
                {!isCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(stats.totalReactions)}
                    </p>
                    <p className="text-xs text-slate-500">Reacciones</p>
                  </div>
                )}
              </div>

              <div
                className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Eye className="h-4 w-4 text-blue-500" />
                {!isCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(stats.totalComments)}
                    </p>
                    <p className="text-xs text-slate-500">Comentarios</p>
                  </div>
                )}
              </div>

              <div
                className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Users className="h-4 w-4 text-emerald-500" />
                {!isCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(stats.activeUsers)}
                    </p>
                    <p className="text-xs text-slate-500">Activos</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        {!isCollapsed && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Star className="h-5 w-5 text-yellow-500" />
                Categorías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={
                      activeCategory === category.id ? 'secondary' : 'ghost'
                    }
                    size="sm"
                    className="w-full justify-between"
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === category.id ? null : category.id
                      )
                    }
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {category.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </aside>
  );
}
