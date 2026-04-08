'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Filter, Menu, Plus, Search } from 'lucide-react';
import { useState } from 'react';

interface NewsHeaderProps {
  onCreatePost?: () => void;
  onSearch?: (query: string) => void;
  onToggleFilters?: () => void;
  onToggleSidebar?: () => void;
  notificationCount?: number;
  isMobile?: boolean;
  className?: string;
}

export function NewsHeader({
  onCreatePost,
  onSearch,
  onToggleFilters,
  onToggleSidebar,
  notificationCount = 0,
  isMobile = false,
  className = '',
}: NewsHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg ${className}`}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 drop-shadow-md">
            Centro de Noticias
          </h1>
          {!isMobile && (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
            >
              ISO 9001
            </Badge>
          )}
        </div>

        {/* Search Bar - Desktop */}
        {!isMobile && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar publicaciones..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </form>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button - Mobile */}
          {isMobile && (
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Filters Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFilters}
            className="relative"
          >
            <Filter className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* Create Post Button */}
          <Button
            onClick={onCreatePost}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size={isMobile ? 'icon' : 'default'}
          >
            <Plus className="h-4 w-4" />
            {!isMobile && 'Nueva Publicación'}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isMobile && (
        <div className="border-t px-4 py-3 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar publicaciones..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
