import { cn } from '@/lib/utils';
import { spacing } from '../../tokens';

interface ListGridProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyState?: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function ListGrid<T>({
  data,
  renderItem,
  keyExtractor,
  emptyState,
  className,
  columns = 3,
}: ListGridProps<T>) {
  if (!data || data.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
        No hay elementos para mostrar
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid', gridCols[columns], spacing.md, className)}>
      {data.map(item => (
        <div key={keyExtractor(item)} className="h-full">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
