import { useRef, useEffect } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { KanbanColumn } from '@/types/rrhh';

interface UseKanbanDropProps {
  columnId: string;
  column: KanbanColumn;
  onDrop: (
    itemId: string,
    sourceColumnId: string,
    targetColumnId: string,
    index?: number
  ) => void;
  onDragOver?: (isOver: boolean) => void;
  disabled?: boolean;
}

export const useKanbanDrop = ({
  columnId,
  column,
  onDrop,
  onDragOver,
  disabled = false,
}: UseKanbanDropProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    return dropTargetForElements({
      element,
      getData: () => ({ columnId }),
      onDragEnter: () => {
        onDragOver?.(true);
      },
      onDragLeave: () => {
        onDragOver?.(false);
      },
      onDrop: ({ source }) => {
        const data = source.data;
        if (data.type === 'kanban-item') {
          const itemId = data.itemId as string;
          const sourceColumnId = data.columnId as string;
          onDrop(itemId, sourceColumnId, columnId);
        }
        onDragOver?.(false);
      },
    });
  }, [columnId, column, onDrop, onDragOver, disabled]);

  return elementRef;
};
