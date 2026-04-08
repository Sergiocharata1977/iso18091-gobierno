'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { KanbanColumn, KanbanItem } from '@/types/rrhh';
import { AlertTriangle, Calendar, Edit, Trash2, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// Module-level drag state (seguro porque solo 1 drag ocurre a la vez)
let draggedItemId: string | null = null;

// Componente de tarjeta individual
interface KanbanCardProps {
  item: KanbanItem;
  onClick?: (item: KanbanItem) => void;
  onEdit?: (item: KanbanItem) => void;
  onDelete?: (item: KanbanItem) => void;
  readOnly?: boolean;
  showActions?: boolean;
  customRenderer?: (item: KanbanItem) => React.ReactNode;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  item,
  onClick,
  onEdit,
  onDelete,
  readOnly = false,
  showActions = true,
  customRenderer,
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Si hay un renderer personalizado, usarlo
  if (customRenderer) {
    return (
      <div
        className="cursor-grab active:cursor-grabbing"
        draggable={!readOnly}
        onDragStart={e => {
          draggedItemId = item.id;
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          draggedItemId = null;
        }}
        onClick={() => onClick?.(item)}
      >
        {customRenderer(item)}
      </div>
    );
  }

  const daysUntilDue = item.dueDate ? getDaysUntilDue(item.dueDate) : null;

  return (
    <Card
      className="mb-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group"
      draggable={!readOnly}
      onDragStart={e => {
        draggedItemId = item.id;
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        draggedItemId = null;
      }}
      onClick={() => onClick?.(item)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium mb-1 line-clamp-2">
              {item.title}
            </CardTitle>
            {item.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          {showActions && !readOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onEdit?.(item);
                }}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onDelete?.(item);
                }}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Prioridad y Tags */}
          <div className="flex gap-1 flex-wrap">
            {item.priority && (
              <Badge
                variant="secondary"
                className={`text-xs ${
                  item.priority === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : item.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : item.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                }`}
              >
                {item.priority}
              </Badge>
            )}
            {item.tags?.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Responsable */}
          {item.assignee && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <User className="h-3 w-3" />
              <span className="truncate">{item.assignee}</span>
            </div>
          )}

          {/* Fecha de vencimiento */}
          {item.dueDate && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span
                className={`${
                  daysUntilDue !== null && daysUntilDue < 0
                    ? 'text-red-600 font-medium'
                    : daysUntilDue !== null && daysUntilDue <= 3
                      ? 'text-orange-600 font-medium'
                      : 'text-gray-600'
                }`}
              >
                {formatDate(item.dueDate)}
                {daysUntilDue !== null && (
                  <span className="ml-1">
                    (
                    {daysUntilDue < 0
                      ? `${Math.abs(daysUntilDue)} días vencida`
                      : daysUntilDue === 0
                        ? 'Vence hoy'
                        : `${daysUntilDue} días`}
                    )
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Progreso */}
          {item.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progreso</span>
                <span>{item.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de columna
interface KanbanColumnProps {
  column: KanbanColumn;
  items: KanbanItem[];
  onItemClick?: (item: KanbanItem) => void;
  onItemEdit?: (item: KanbanItem) => void;
  onItemDelete?: (item: KanbanItem) => void;
  onDropItem?: (itemId: string, targetColumnId: string) => void;
  readOnly?: boolean;
  showActions?: boolean;
  customRenderer?: (item: KanbanItem) => React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  items,
  onItemClick,
  onItemEdit,
  onItemDelete,
  onDropItem,
  readOnly = false,
  showActions = true,
  customRenderer,
}) => {
  const [isOver, setIsOver] = useState(false);

  const canAcceptMore = !column.maxItems || items.length < column.maxItems;

  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-96">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color || '#6B7280' }}
        />
        <h3 className="font-medium text-sm">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
          {column.maxItems && ` / ${column.maxItems}`}
        </Badge>
      </div>

      <div
        className={`min-h-32 transition-all rounded-lg ${
          isOver && canAcceptMore
            ? 'bg-blue-50 border-2 border-blue-300 border-dashed'
            : isOver && !canAcceptMore
              ? 'bg-red-50 border-2 border-red-300 border-dashed'
              : ''
        }`}
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsOver(true);
        }}
        onDragEnter={e => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsOver(false);
          }
        }}
        onDrop={e => {
          e.preventDefault();
          setIsOver(false);
          if (draggedItemId && canAcceptMore) {
            onDropItem?.(draggedItemId, column.id);
            draggedItemId = null;
          }
        }}
      >
        {items.map(item => (
          <KanbanCard
            key={item.id}
            item={item}
            onClick={onItemClick}
            onEdit={onItemEdit}
            onDelete={onItemDelete}
            readOnly={readOnly}
            showActions={showActions}
            customRenderer={customRenderer}
          />
        ))}

        {/* Indicador de límite alcanzado */}
        {column.maxItems && items.length >= column.maxItems && (
          <div className="text-center py-4 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
            Límite máximo alcanzado
          </div>
        )}

        {/* Placeholder cuando está vacío */}
        {items.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            {readOnly ? 'Sin elementos' : 'Arrastra elementos aquí'}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal UnifiedKanban
interface UnifiedKanbanProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemMove?: (
    itemId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newIndex: number
  ) => void;
  onItemClick?: (item: KanbanItem) => void;
  onItemEdit?: (item: KanbanItem) => void;
  onItemDelete?: (item: KanbanItem) => void;
  loading?: boolean;
  error?: string;
  readOnly?: boolean;
  showActions?: boolean;
  customCardRenderer?: (item: KanbanItem) => React.ReactNode;
}

const UnifiedKanban: React.FC<UnifiedKanbanProps> = ({
  columns,
  items,
  onItemMove,
  onItemClick,
  onItemEdit,
  onItemDelete,
  loading = false,
  error,
  readOnly = false,
  showActions = true,
  customCardRenderer,
}) => {
  // Agrupar items por columna
  const itemsByColumn = useMemo(() => {
    const grouped: Record<string, KanbanItem[]> = {};
    columns.forEach(column => {
      grouped[column.id] = items.filter(item => item.columnId === column.id);
    });
    return grouped;
  }, [columns, items]);

  const handleItemMove = (itemId: string, targetColumnId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.columnId === targetColumnId) return;

    const sourceColumnId = item.columnId;
    const targetItems = itemsByColumn[targetColumnId] || [];
    const newIndex = targetItems.length; // Agregar al final por defecto

    onItemMove?.(itemId, sourceColumnId, targetColumnId, newIndex);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
      }}
    >
      {columns.map(column => (
        <KanbanColumn
          key={column.id}
          column={column}
          items={itemsByColumn[column.id] || []}
          onItemClick={onItemClick}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          onDropItem={handleItemMove}
          readOnly={readOnly}
          showActions={showActions}
          customRenderer={customCardRenderer}
        />
      ))}
    </div>
  );
};

export default UnifiedKanban;
export { KanbanCard, KanbanColumn };
export type { KanbanCardProps, KanbanColumnProps };
