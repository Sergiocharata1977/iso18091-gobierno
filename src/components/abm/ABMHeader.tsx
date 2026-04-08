'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ReactNode } from 'react';
import { ABMViewMode, ABMViewToggle } from './ABMViewToggle';

interface ABMHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  currentView: ABMViewMode;
  onViewChange: (view: ABMViewMode) => void;
  hasKanban?: boolean;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function ABMHeader({
  title,
  subtitle,
  icon,
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  currentView,
  onViewChange,
  hasKanban = false,
  actions,
  filters,
}: ABMHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h1>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters + View Toggle */}
        <div className="flex items-center gap-3">
          {filters}
          <ABMViewToggle
            currentView={currentView}
            onViewChange={onViewChange}
            hasKanban={hasKanban}
          />
        </div>
      </div>
    </div>
  );
}
