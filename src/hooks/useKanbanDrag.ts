import { useRef, useEffect } from 'react';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import type { KanbanItem } from '@/types/rrhh';

interface UseKanbanDragProps {
  itemId: string;
  columnId: string;
  item: KanbanItem;
  onDragStart?: (itemId: string) => void;
  onDragEnd?: (itemId: string) => void;
}

export const useKanbanDrag = ({
  itemId,
  columnId,
  item,
  onDragStart,
  onDragEnd,
}: UseKanbanDragProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    return combine(
      draggable({
        element,
        getInitialData: () => ({
          itemId,
          columnId,
          item,
          type: 'kanban-item',
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            render: ({ container }: { container: HTMLElement }) => {
              const preview = createDragPreview(item);
              container.appendChild(preview);
              return () => preview.remove();
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
          onDragStart?.(itemId);
        },
        onDrop: () => {
          onDragEnd?.(itemId);
        },
      })
    );
  }, [itemId, columnId, item, onDragStart, onDragEnd]);

  return elementRef;
};

// Función auxiliar para crear el preview del drag
const createDragPreview = (item: KanbanItem): HTMLElement => {
  const preview = document.createElement('div');
  preview.className =
    'bg-white border border-gray-300 rounded-lg p-3 shadow-lg max-w-xs';
  preview.innerHTML = `
    <div class="font-medium text-sm text-gray-900 truncate">
      ${item.title}
    </div>
    ${item.description ? `<div class="text-xs text-gray-600 mt-1 truncate">${item.description}</div>` : ''}
    ${item.priority ? `<div class="text-xs mt-2 inline-block px-2 py-1 rounded ${getPriorityColor(item.priority)}">${item.priority}</div>` : ''}
  `;
  return preview;
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
