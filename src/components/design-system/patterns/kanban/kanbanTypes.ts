export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string; // Para mostrar algo debajo del título (ej: Cliente)
  status: string; // El ID de la columna donde está
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: {
    name: string;
    avatar?: string;
  };
  dueDate?: Date | string;
  meta?: any; // Datos extra para renderizado personalizado
}

export interface KanbanColumnDef {
  id: string; // Debe matchear con item.status
  title: string;
  color?: string; // Color distintivo de la columna (borde o badge)
  limit?: number; // WIP limit opcional
  allowDrop?: boolean;
  order?: number;
}

export interface KanbanBoardProps {
  columns: KanbanColumnDef[];
  items: KanbanItem[];
  onItemMove: (itemId: string, newStatus: string, newIndex: number) => void;
  onItemClick?: (item: KanbanItem) => void;
  renderCard?: (item: KanbanItem) => React.ReactNode; // Render custom si se desea
}
