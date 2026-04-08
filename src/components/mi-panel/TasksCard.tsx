'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TasksCardTask } from './types';

interface TasksCardProps {
  tasks: TasksCardTask[];
  loading: boolean;
  error?: string | null;
}

function formatShortDate(value: unknown): string {
  if (!value) return 'Sin fecha';
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleDateString('es-AR');
}

export function TasksCard({ tasks, loading, error }: TasksCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Tareas asignadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando tareas...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-500">Sin tareas visibles.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {task.description || 'Sin descripcion'}
                    </p>
                  </div>
                  <Badge variant="outline">{task.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{task.priority}</Badge>
                  <Badge variant="outline">
                    Vence: {formatShortDate(task.due_date)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
