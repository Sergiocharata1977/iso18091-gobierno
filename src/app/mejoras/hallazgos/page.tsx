'use client';

import { PageHeader } from '@/components/design-system/layout/PageHeader';
import {
  PageToolbar,
  ViewMode,
} from '@/components/design-system/layout/PageToolbar';
import { FindingFormDialog } from '@/components/findings/FindingFormDialog';
import { FindingKanban } from '@/components/findings/FindingKanban';
import { FindingList } from '@/components/findings/FindingList';
import { FindingStats } from '@/components/findings/FindingStats';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FINDING_STATUS_LABELS } from '@/types/findings';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function HallazgosPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list (table)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [normaFilter, setNormaFilter] = useState('all');

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setShowDialog(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <PageHeader
          title="Hallazgos"
          description="Gestión de hallazgos con 4 fases: Registro, Acción Inmediata, Ejecución y Análisis"
          breadcrumbs={[
            { label: 'Mejora', href: '/mejoras' },
            { label: 'Hallazgos' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="hallazgos" />
              <Button
                onClick={() => setShowDialog(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Hallazgo
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <FindingStats key={`stats-${refreshKey}`} />

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          supportedViews={['list', 'grid', 'kanban']}
          searchPlaceholder="Buscar hallazgo..."
          filterOptions={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-background border-input">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(FINDING_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={normaFilter} onValueChange={setNormaFilter}>
                <SelectTrigger className="w-[160px] h-10 bg-background border-input">
                  <SelectValue placeholder="Norma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las normas</SelectItem>
                  <SelectItem value="ISO_9001">ISO 9001</SelectItem>
                  <SelectItem value="ISO_14001">ISO 14001</SelectItem>
                  <SelectItem value="ISO_45001">ISO 45001</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Content */}
        {viewMode === 'kanban' ? (
          <FindingKanban key={`kanban-${refreshKey}`} />
        ) : (
          <FindingList
            key={`list-${refreshKey}`}
            viewMode={viewMode} // list (=table) or grid
            filters={{
              search: searchTerm,
              status: statusFilter,
              norma: normaFilter !== 'all' ? normaFilter : undefined,
            }}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        )}

        {/* Dialog */}
        <FindingFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
