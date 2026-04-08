'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import {
  KANBAN_DEFAULTS,
  type KanbanColumnConfig,
} from '@/types/kanbanSchema';
import type { UserPrivateTask } from '@/types/private-sections';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TaskKanbanProps {
  tasks: UserPrivateTask[];
  onTaskUpdated?: () => void;
}

type TaskColumn = {
  id: UserPrivateTask['status'];
  title: string;
  color: string;
};

const TASK_STATUS_MAP: Record<string, UserPrivateTask['status']> = {
  pendiente: 'pending',
  en_progreso: 'in_progress',
  revision: 'review',
  completada: 'completed',
  pending: 'pending',
  in_progress: 'in_progress',
  review: 'review',
  completed: 'completed',
};

const TASK_STATUS_ORDER: UserPrivateTask['status'][] = [
  'pending',
  'in_progress',
  'review',
  'completed',
];

function mapColumns(columns: KanbanColumnConfig[]): TaskColumn[] {
  return columns
    .map((column, index) => ({
      id: TASK_STATUS_MAP[column.id] || TASK_STATUS_ORDER[index],
      title: column.title,
      color: column.color,
    }))
    .filter((column): column is TaskColumn => Boolean(column.id));
}

export function TaskKanban({ tasks, onTaskUpdated }: TaskKanbanProps) {
  const { user } = useAuth();
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [columns, setColumns] = useState<TaskColumn[]>(() =>
    mapColumns(KANBAN_DEFAULTS.tareas)
  );

  useEffect(() => {
    const orgId = user?.organization_id;
    if (!orgId) return;

    let isMounted = true;

    const loadColumns = async () => {
      try {
        const response = await fetch(
          `/api/kanban-schemas/tareas?organization_id=${orgId}`
        );

        if (!response.ok) return;

        const payload = await response.json();
        const remoteColumns = payload?.data?.columns;

        if (isMounted && Array.isArray(remoteColumns)) {
          setColumns(mapColumns(remoteColumns));
        }
      } catch {
        // Fallback silencioso a defaults
      }
    };

    void loadColumns();

    return () => {
      isMounted = false;
    };
  }, [user?.organization_id]);

  const handleDragStart = (taskId: string) => {
    setDraggingTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (
    e: React.DragEvent,
    newStatus: UserPrivateTask['status']
  ) => {
    e.preventDefault();
    if (!draggingTask || !user?.id) return;

    try {
      const res = await fetch(`/api/users/${user.id}/tasks/${draggingTask}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Error al actualizar');

      onTaskUpdated?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al mover la tarea');
    } finally {
      setDraggingTask(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Eliminar esta tarea?')) return;
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/users/${user.id}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      onTaskUpdated?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la tarea');
    }
  };

  const getTasksByStatus = (status: UserPrivateTask['status']) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {columns.map(column => (
        <div
          key={column.id}
          className={`rounded-lg p-4 ${column.color} min-h-[500px]`}
          onDragOver={handleDragOver}
          onDrop={event => handleDrop(event, column.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{column.title}</h3>
            <Badge variant="secondary">{getTasksByStatus(column.id).length}</Badge>
          </div>

          <div className="space-y-3">
            {getTasksByStatus(column.id).map(task => (
              <Card
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                className="cursor-move hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="mb-1 font-medium text-foreground">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getPriorityVariant(priority: string): any {
  const variants: Record<string, string> = {
    urgent: 'destructive',
    high: 'default',
    medium: 'secondary',
    low: 'outline',
  };
  return variants[priority] || 'secondary';
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  };
  return labels[priority] || priority;
}
