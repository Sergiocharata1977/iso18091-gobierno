import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Filter,
  Kanban as KanbanIcon,
  LayoutGrid,
  List as ListIcon,
  Search,
  Table as TableIcon,
} from 'lucide-react';

export type ViewMode = 'list' | 'grid' | 'kanban' | 'table';

interface PageToolbarProps {
  onSearch?: (term: string) => void;
  searchValue?: string;
  onFilterClick?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  searchPlaceholder?: string;
  supportedViews?: ViewMode[];
  className?: string;
  children?: React.ReactNode; // Extra controls
  filterOptions?: React.ReactNode; // Add filterOptions prop
}

export function PageToolbar({
  onSearch,
  onFilterClick,
  viewMode,
  onViewModeChange,
  searchPlaceholder = 'Buscar...',
  supportedViews = ['list', 'grid'],
  className,
  children,
  searchValue,
  filterOptions,
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 bg-card p-4 rounded-xl border border-border mt-0',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9 bg-background"
              value={searchValue}
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>
        </div>

        {/* Actions & View Toggles */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onFilterClick && (
            <Button variant="outline" size="icon" onClick={onFilterClick}>
              <Filter className="h-4 w-4" />
            </Button>
          )}

          {children}

          {onViewModeChange && supportedViews.length > 1 && (
            <div className="bg-muted p-1 rounded-lg flex items-center gap-1">
              {supportedViews.includes('list') && (
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewModeChange('list')}
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              )}
              {supportedViews.includes('grid') && (
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewModeChange('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              )}
              {supportedViews.includes('kanban') && (
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewModeChange('kanban')}
                >
                  <KanbanIcon className="h-4 w-4" />
                </Button>
              )}
              {supportedViews.includes('table') && (
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewModeChange('table')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Options Area */}
      {filterOptions && (
        <div className="pt-2 border-t border-border mt-2">{filterOptions}</div>
      )}
    </div>
  );
}
