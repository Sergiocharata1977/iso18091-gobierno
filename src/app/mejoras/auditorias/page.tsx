'use client';

import {
  AuditAdvancedFilters,
  type AuditFiltersState,
} from '@/components/audits/AuditAdvancedFilters';
import { AuditExportButton } from '@/components/audits/AuditExportButton';
import { AuditFormDialog } from '@/components/audits/AuditFormDialog';
import { AuditKanban } from '@/components/audits/AuditKanban';
import { AuditList } from '@/components/audits/AuditList';
import { PageHeader, PageToolbar } from '@/components/design-system';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { Audit, AuditFormData } from '@/types/audits';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ViewMode = 'kanban' | 'list';

export default function AuditsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [filteredAudits, setFilteredAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [filters, setFilters] = useState<AuditFiltersState>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.organization_id) {
      fetchAudits();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [audits, filters, searchTerm]);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const organizationId = user?.organization_id;
      if (!organizationId) return;

      const response = await fetch(
        `/api/sdk/audits?organization_id=${organizationId}`
      );
      const result = await response.json();

      if (result.success) {
        setAudits(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...audits];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        audit =>
          audit.title?.toLowerCase().includes(term) ||
          audit.auditNumber?.toLowerCase().includes(term) ||
          audit.scope?.toLowerCase().includes(term)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(audit =>
        filters.status?.includes(audit.status)
      );
    }

    if (filters.auditType && filters.auditType.length > 0) {
      filtered = filtered.filter(audit =>
        filters.auditType?.includes(audit.auditType)
      );
    }

    if (filters.year) {
      filtered = filtered.filter(audit => {
        try {
          let auditYear: number;
          const createdAt = audit.createdAt as any;
          if (
            createdAt &&
            typeof createdAt === 'object' &&
            'toDate' in createdAt
          ) {
            auditYear = createdAt.toDate().getFullYear();
          } else if (createdAt instanceof Date) {
            auditYear = createdAt.getFullYear();
          } else if (typeof createdAt === 'string') {
            auditYear = new Date(createdAt).getFullYear();
          } else {
            return false;
          }
          return auditYear === filters.year;
        } catch {
          return false;
        }
      });
    }

    setFilteredAudits(filtered);
  };

  const handleCreateAudit = async (formData: AuditFormData) => {
    try {
      const organizationId = user?.organization_id;
      if (!organizationId) {
        throw new Error('No se encontro organization_id en el usuario');
      }

      const apiData = {
        ...formData,
        organization_id: organizationId,
        plannedDate:
          formData.plannedDate instanceof Date
            ? formData.plannedDate.toISOString()
            : formData.plannedDate,
      };

      const response = await fetch('/api/sdk/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        await fetchAudits();
        router.push(`/mejoras/auditorias/${result.data.id}`);
      } else {
        throw new Error(result.message || 'Error al crear la auditoria');
      }
    } catch (error) {
      console.error('Error creating audit:', error);
      throw error;
    }
  };

  const stats = {
    total: filteredAudits.length,
    planned: filteredAudits.filter(a => a.status === 'planned').length,
    in_progress: filteredAudits.filter(a => a.status === 'in_progress').length,
    completed: filteredAudits.filter(a => a.status === 'completed').length,
  };

  const statusCards = [
    {
      id: 'total',
      title: 'Total',
      value: stats.total,
      icon: ClipboardCheck,
      valueClassName: 'text-slate-900',
      iconClassName: 'text-slate-600',
    },
    {
      id: 'planned',
      title: 'Planificadas',
      value: stats.planned,
      icon: Clock3,
      valueClassName: 'text-blue-600',
      iconClassName: 'text-blue-600',
    },
    {
      id: 'in_progress',
      title: 'En Progreso',
      value: stats.in_progress,
      icon: PlayCircle,
      valueClassName: 'text-amber-600',
      iconClassName: 'text-amber-600',
    },
    {
      id: 'completed',
      title: 'Completadas',
      value: stats.completed,
      icon: CheckCircle2,
      valueClassName: 'text-emerald-600',
      iconClassName: 'text-emerald-600',
    },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm text-muted-foreground">
                Cargando auditorias...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="Auditorias"
          description="Gestion de auditorias internas ISO 9001"
          breadcrumbs={[
            { label: 'Mejora', href: '/mejoras' },
            { label: 'Auditorias' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="auditorias" />
              <AuditExportButton audits={filteredAudits} />
              <Button
                onClick={() => setShowFormDialog(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Auditoria
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.iconClassName}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${card.valueClassName}`}>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode as ViewMode)}
          supportedViews={['list', 'kanban']}
          searchPlaceholder="Buscar auditoria..."
        />

        <AuditAdvancedFilters
          onFiltersChange={setFilters}
          isLoading={loading}
        />

        {filteredAudits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay auditorias que coincidan con los filtros.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'kanban' ? (
          <AuditKanban audits={filteredAudits} />
        ) : (
          <AuditList audits={filteredAudits} />
        )}

        <AuditFormDialog
          open={showFormDialog}
          onClose={() => setShowFormDialog(false)}
          onSubmit={handleCreateAudit}
        />
      </div>
    </div>
  );
}
