'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect, useRef, useState } from 'react';
import { padding, radius, shadow, typography } from '../../tokens';
import { KanbanItem } from './kanbanTypes';

interface KanbanCardProps {
  item: KanbanItem;
  onClick?: () => void;
  renderCustom?: (item: KanbanItem) => React.ReactNode;
}

export function KanbanCard({ item, onClick, renderCustom }: KanbanCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ type: 'kanban-card', itemId: item.id, item }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      })
    );
  }, [item]);

  if (renderCustom) {
    return (
      <div ref={ref} className={cn(dragging ? 'opacity-50' : '')}>
        {renderCustom(item)}
      </div>
    );
  }

  // Default rendering using DomainCard logic (simplified)
  return (
    <div
      ref={ref}
      className={cn(
        'bg-card group relative flex flex-col gap-2 border border-border/50',
        padding.card,
        radius.card,
        shadow.card,
        'cursor-grab active:cursor-grabbing hover:border-primary/50',
        dragging && 'opacity-40 ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2">
        <span className={cn(typography.small, 'font-medium leading-tight')}>
          {item.title}
        </span>
        {item.priority && (
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              item.priority === 'high' || item.priority === 'critical'
                ? 'bg-red-500'
                : item.priority === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            )}
          />
        )}
      </div>

      {item.subtitle && (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {item.subtitle}
        </span>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer info (Date, Assignee) */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
        {item.dueDate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(item.dueDate).toLocaleDateString()}
          </span>
        )}
        {item.assignee && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={item.assignee.avatar} />
            <AvatarFallback className="text-[9px]">
              {item.assignee.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
