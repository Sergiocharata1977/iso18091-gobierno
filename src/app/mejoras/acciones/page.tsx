'use client';

import { ActionFormDialog } from '@/components/actions/ActionFormDialog';
import { ActionKanban } from '@/components/actions/ActionKanban';
import { ActionList } from '@/components/actions/ActionList';
import { ActionStats } from '@/components/actions/ActionStats';
import { PageHeader, PageToolbar } from '@/components/design-system';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ActionFormData } from '@/types/actions';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type ViewMode = 'list' | 'kanban';

export default function AccionesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSubmit = async (data: ActionFormData) => {
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la acción');
      }

      setRefreshKey(prev => prev + 1);
      setShowDialog(false);
    } catch (error) {
      console.error('Error creating action:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <PageHeader
          title="Acciones"
          description="Gestión de acciones correctivas, preventivas y de mejora"
          breadcrumbs={[
            { label: 'Mejora', href: '/mejoras' },
            { label: 'Acciones' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="acciones" />
              <Button
                onClick={() => setShowDialog(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Acción
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <ActionStats key={`stats-${refreshKey}`} />

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode as ViewMode)}
          supportedViews={['list', 'kanban']}
          searchPlaceholder="Buscar acción..."
          filterOptions={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-background border-input">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="open">Abierta</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="verified">Verificada</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Content - List or Kanban */}
        {viewMode === 'list' ? (
          <ActionList key={`list-${refreshKey}`} />
        ) : (
          <ActionKanban key={`kanban-${refreshKey}`} />
        )}

        {/* Dialog */}
        <ActionFormDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
