'use client';

import { cn } from '@/lib/utils';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanBoardProps } from './kanbanTypes';

export function UnifiedKanban({
  columns,
  items: initialItems,
  onItemMove,
  onItemClick,
  renderCard,
}: KanbanBoardProps) {
  // Estado local para actualizaciones optimistas (opcional, pero recomendado para UX fluido)
  // Nota: En una implementacion real compleja, esto podria manejarse fuera o con un reducer.
  // Por ahora, confiamos en que el padre actualice `items` via props, pero el monitor dispara el evento.

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const itemId = source.data.itemId as string;
        const sourceColumnId = (source.data.item as any).status;
        const destinationColumnId = destination.data.columnId as string;

        if (sourceColumnId === destinationColumnId) {
          // Reordenamiento dentro de la misma columna (TODO: Implementar indice)
          return;
        }

        // Disparamos el evento al padre
        // Por simplicidad en esta version v1, index es 0 o final.
        // Una implementacion mas rica calcularia el indice basado en el eje Y.
        onItemMove(itemId, destinationColumnId, 0);
      },
    });
  }, [onItemMove]);

  // Derivar items por columna
  const getItemsByColumn = (columnId: string) => {
    return initialItems.filter(item => item.status === columnId);
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-5', // Soporte hasta 5 columnas
  };

  // Determinar clases de grilla basadas en cantidad de columnas
  const colsCount = Math.min(columns.length, 5) as 1 | 2 | 3 | 4 | 5;
  const gridClass = gridCols[colsCount] || 'grid-cols-1 md:grid-cols-3';

  return (
    <div className={cn('grid gap-4 h-full', gridClass)}>
      {columns.map(col => (
        <KanbanColumn
          key={col.id}
          column={col}
          items={getItemsByColumn(col.id)}
          onCardClick={onItemClick}
          renderCard={renderCard}
        />
      ))}
    </div>
  );
}
