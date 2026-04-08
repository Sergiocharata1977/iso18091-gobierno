import { ListGrid, ListTable } from '@/components/design-system';
import type { ViewMode } from '@/components/design-system/layout/PageToolbar';
import { formatDate } from '@/lib/utils';
import {
  Finding,
  FINDING_STATUS_COLORS,
  FINDING_STATUS_LABELS,
} from '@/types/findings';
import { useEffect, useState } from 'react';
import { FindingCardCompact } from './FindingCardCompact';
import { FindingFormDialog } from './FindingFormDialog';

// Labels para origen del hallazgo
const ORIGEN_LABELS: Record<string, string> = {
  incidente_sst: 'SST',
  aspecto_ambiental: 'Ambiental',
  ptw: 'PTW',
  auditoria: 'Auditoría',
  sgsi_control: 'SGSI',
  registro_configurable: 'Registro',
  manual: 'Manual',
};

// Colores para las normas ISO
const NORMA_COLORS: Record<string, string> = {
  ISO_9001: 'bg-blue-100 text-blue-800',
  ISO_14001: 'bg-green-100 text-green-800',
  ISO_45001: 'bg-orange-100 text-orange-800',
  ISO_27001: 'bg-purple-100 text-purple-800',
  ISO_27002: 'bg-purple-100 text-purple-800',
  PTW: 'bg-red-100 text-red-800',
  CUSTOM: 'bg-slate-100 text-slate-700',
};

const NORMA_DISPLAY: Record<string, string> = {
  ISO_9001: 'ISO 9001',
  ISO_14001: 'ISO 14001',
  ISO_45001: 'ISO 45001',
  ISO_27001: 'ISO 27001',
  ISO_27002: 'ISO 27002',
  ISO_18091: 'ISO 18091',
  ISO_31000: 'ISO 31000',
  PTW: 'PTW',
  CUSTOM: 'Custom',
};

interface FindingListProps {
  filters?: {
    status?: string;
    processId?: string;
    year?: number;
    search?: string;
    requiresAction?: boolean;
    norma?: string;
  };
  viewMode?: ViewMode;
  onRefresh?: () => void;
}

export function FindingList({
  filters,
  viewMode = 'grid',
  onRefresh,
}: FindingListProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadFindings = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (filters?.processId) params.append('processId', filters.processId);
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.requiresAction !== undefined)
        params.append('requiresAction', filters.requiresAction.toString());

      // Apply filters from props
      if (filters?.status && filters.status !== 'all')
        params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.norma) params.append('norma', filters.norma);

      const response = await fetch(`/api/findings?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al cargar hallazgos');
      }

      const data = await response.json();
      let validFindings = data.findings.filter(
        (f: Finding) => f.registration && f.findingNumber
      );
      // Client-side filter by norma if the API doesn't support it yet
      if (filters?.norma) {
        validFindings = validFindings.filter(
          (f: Finding) => f.sig_context?.norma === filters.norma
        );
      }
      setFindings(validFindings);
    } catch (error) {
      console.error('Error loading findings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [filters]);

  // Add listener for refresh events if needed, but prop is better
  useEffect(() => {
    if (onRefresh) {
      // Logic handled by parent re-rendering or passing different props
    }
  }, [onRefresh]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-slate-500">Cargando hallazgos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <ListGrid
          data={findings}
          renderItem={finding => (
            <FindingCardCompact key={finding.id} finding={finding} />
          )}
          keyExtractor={finding => finding.id}
          columns={3}
        />
      ) : (
        <ListTable
          data={findings}
          keyExtractor={finding => finding.id}
          onRowClick={finding =>
            (window.location.href = `/mejoras/hallazgos/${finding.id}`)
          }
          columns={[
            {
              header: 'Código',
              accessorKey: 'findingNumber',
              className: 'font-medium font-mono',
            },
            {
              header: 'Nombre',
              cell: f => f.registration?.name || 'Sin nombre',
            },
            {
              header: 'Norma / Origen',
              cell: f => (
                <div className="flex flex-wrap gap-1">
                  {f.sig_context?.norma && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${NORMA_COLORS[f.sig_context.norma] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {NORMA_DISPLAY[f.sig_context.norma] || f.sig_context.norma}
                    </span>
                  )}
                  {f.origen && ORIGEN_LABELS[f.origen] && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {ORIGEN_LABELS[f.origen]}
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: 'Estado',
              cell: f => (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${FINDING_STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-700'}`}
                >
                  {FINDING_STATUS_LABELS[f.status] || f.status}
                </span>
              ),
            },
            {
              header: 'Fecha',
              cell: f => formatDate(f.createdAt),
            },
            {
              header: 'Progreso',
              cell: f => (
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{f.progress}%</span>
                </div>
              ),
            },
          ]}
        />
      )}

      <FindingFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          setIsFormOpen(false);
          loadFindings();
          onRefresh?.();
        }}
      />
    </div>
  );
}
