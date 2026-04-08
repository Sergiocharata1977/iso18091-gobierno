'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Kanban, LayoutGrid, List } from 'lucide-react';

export type ABMViewMode = 'list' | 'grid' | 'kanban';

interface ABMViewToggleProps {
  currentView: ABMViewMode;
  onViewChange: (view: ABMViewMode) => void;
  hasKanban?: boolean;
}

export function ABMViewToggle({
  currentView,
  onViewChange,
  hasKanban = false,
}: ABMViewToggleProps) {
  return (
    <div className="bg-muted p-1 rounded-lg flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0',
          currentView === 'list' && 'bg-background shadow-sm'
        )}
        onClick={() => onViewChange('list')}
        title="Vista Lista"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0',
          currentView === 'grid' && 'bg-background shadow-sm'
        )}
        onClick={() => onViewChange('grid')}
        title="Vista Grid"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      {hasKanban && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            currentView === 'kanban' && 'bg-background shadow-sm'
          )}
          onClick={() => onViewChange('kanban')}
          title="Vista Kanban"
        >
          <Kanban className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
