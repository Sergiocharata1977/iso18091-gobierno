'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UnifiedKanban from '@/components/ui/unified-kanban';
import type { KanbanColumn, KanbanItem } from '@/types/rrhh';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function RRHHKanbanPage() {
  const [columns] = useState<KanbanColumn[]>([
    {
      id: 'todo',
      title: 'Por Hacer',
      color: '#6B7280',
      maxItems: 10,
      allowDrop: true,
      order: 1,
    },
    {
      id: 'in-progress',
      title: 'En Progreso',
      color: '#3B82F6',
      maxItems: 8,
      allowDrop: true,
      order: 2,
    },
    {
      id: 'review',
      title: 'En Revision',
      color: '#F59E0B',
      maxItems: 6,
      allowDrop: true,
      order: 3,
    },
    {
      id: 'done',
      title: 'Completado',
      color: '#10B981',
      maxItems: 20,
      allowDrop: true,
      order: 4,
    },
  ]);

  const [items, setItems] = useState<KanbanItem[]>([
    {
      id: '1',
      title: 'Revisar politicas de RRHH',
      description: 'Actualizar manual de empleados',
      columnId: 'todo',
      priority: 'high',
      tags: ['politicas', 'documentacion'],
      assignee: 'Juan Perez',
      dueDate: '2024-01-15',
      progress: 0,
    },
    {
      id: '2',
      title: 'Capacitacion en seguridad',
      description: 'Organizar curso de seguridad laboral',
      columnId: 'in-progress',
      priority: 'medium',
      tags: ['capacitacion', 'seguridad'],
      assignee: 'Maria Garcia',
      dueDate: '2024-01-20',
      progress: 60,
    },
  ]);

  const [loading] = useState(false);
  const [error] = useState<string | undefined>(undefined);

  const handleItemMove = (
    itemId: string,
    _sourceColumnId: string,
    targetColumnId: string
  ) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, columnId: targetColumnId } : item
      )
    );
  };

  const handleItemClick = (item: KanbanItem) => {
    console.log('Clicked item:', item);
  };

  const handleItemEdit = (item: KanbanItem) => {
    console.log('Edit item:', item);
  };

  const handleItemDelete = (item: KanbanItem) => {
    if (confirm(`Estas seguro de eliminar "${item.title}"?`)) {
      setItems(prevItems => prevItems.filter(i => i.id !== item.id));
    }
  };

  const handleAddItem = () => {
    const newItem: KanbanItem = {
      id: Date.now().toString(),
      title: 'Nueva tarea',
      description: 'Descripcion de la nueva tarea',
      columnId: 'todo',
      priority: 'medium',
      tags: ['nuevo'],
      assignee: 'Usuario Actual',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      progress: 0,
    };
    setItems(prevItems => [...prevItems, newItem]);
  };

  return (
    <ModulePageShell contentClassName="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Kanban RRHH"
          description="Gestion visual de tareas y procesos de recursos humanos."
          breadcrumbs={[
            { label: 'RRHH', href: '/rrhh' },
            { label: 'Kanban' },
          ]}
          className="p-0"
        />
        <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Por Hacer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {items.filter(item => item.columnId === 'todo').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {items.filter(item => item.columnId === 'in-progress').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              En Revision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {items.filter(item => item.columnId === 'review').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(item => item.columnId === 'done').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Tablero de Tareas RRHH</CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedKanban
            columns={columns}
            items={items}
            onItemMove={handleItemMove}
            onItemClick={handleItemClick}
            onItemEdit={handleItemEdit}
            onItemDelete={handleItemDelete}
            loading={loading}
            error={error}
            readOnly={false}
            showActions={true}
          />
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}
