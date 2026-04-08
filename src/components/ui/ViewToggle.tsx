'use client';

import { Button } from '@/components/ui/button';
import { Grid, List } from 'lucide-react';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewToggle({
  view,
  onViewChange,
  className = '',
}: ViewToggleProps) {
  return (
    <div
      className={`flex gap-1 border border-slate-200 rounded-md p-1 bg-slate-50 ${className}`}
    >
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className={
          view === 'list'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-900'
        }
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className={
          view === 'grid'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-900'
        }
      >
        <Grid className="h-4 w-4" />
      </Button>
    </div>
  );
}
