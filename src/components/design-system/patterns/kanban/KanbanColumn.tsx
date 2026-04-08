'use client';

import { cn } from '@/lib/utils';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect, useRef, useState } from 'react';
import { padding, radius, spacing, typography } from '../../tokens';
import { KanbanCard } from './KanbanCard';
import { KanbanColumnDef as IKanbanColumn, KanbanItem } from './kanbanTypes';

interface KanbanColumnProps {
  column: IKanbanColumn;
  items: KanbanItem[];
  renderCard?: (item: KanbanItem) => React.ReactNode;
  onCardClick?: (item: KanbanItem) => void;
  className?: string;
}

export function KanbanColumn({
  column,
  items,
  renderCard,
  onCardClick,
  className,
}: KanbanColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ columnId: column.id }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [column.id]);

  return (
    <div className={cn('flex flex-col h-full min-h-[500px]', className)}>
      {/* Header */}
      <div className={cn('flex items-center gap-2 mb-3', padding.card)}>
        {column.color && (
          <div className={cn('w-3 h-3 rounded-full', column.color)} />
        )}
        <h3 className={cn(typography.small, 'font-semibold')}>
          {column.title}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
          {items.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={ref}
        className={cn(
          'flex-1 bg-muted/50 transition-colors duration-200',
          radius.card,
          padding.card,
          spacing.sm,
          'flex flex-col gap-3', // Espaciado entre tarjetas
          isDraggedOver ? 'bg-muted/80 ring-2 ring-primary/20' : ''
        )}
      >
        {items.map(item => (
          <KanbanCard
            key={item.id}
            item={item}
            onClick={() => onCardClick?.(item)}
            renderCustom={renderCard}
          />
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg min-h-[100px]">
            Arrastrar aquí
          </div>
        )}
      </div>
    </div>
  );
}
