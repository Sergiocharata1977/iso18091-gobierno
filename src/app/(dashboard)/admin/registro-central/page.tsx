'use client';

import { PageHeader, Section } from '@/components/design-system';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  SystemActivityLogEntry,
  SystemActivityStatus,
} from '@/types/system-activity-log';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

const SOURCE_MODULES = [
  { value: '', label: 'Todos los módulos' },
  { value: 'audit', label: 'Auditorías' },
  { value: 'direct_actions', label: 'Acciones IA' },
  { value: 'capabilities', label: 'Capabilities' },
  { value: 'terminal_agent', label: 'Sentinel / Terminal' },
  { value: 'accounting', label: 'Contabilidad' },
  { value: 'crm', label: 'CRM' },
  { value: 'mobile_operaciones', label: 'App Operaciones' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'success', label: 'Exitoso' },
  { value: 'failure', label: 'Error' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'denied', label: 'Denegado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const STATUS_VARIANT: Record<
  SystemActivityStatus,
  'success' | 'destructive' | 'warning' | 'secondary' | 'outline'
> = {
  success: 'success',
  failure: 'destructive',
  pending: 'secondary',
  blocked: 'warning',
  denied: 'destructive',
  cancelled: 'outline',
};

const SEVERITY_VARIANT: Record<
  string,
  'success' | 'destructive' | 'warning' | 'secondary' | 'outline'
> = {
  info: 'secondary',
  low: 'outline',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
};

interface Filters {
  start_date: string;
  end_date: string;
  source_module: string;
  status: string;
  entity_type: string;
  actor_user_id: string;
}

function toQueryString(filters: Filters, limit: number): string {
  const params = new URLSearchParams();
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.source_module) params.set('source_module', filters.source_module);
  if (filters.status) params.set('status', filters.status);
  if (filters.entity_type) params.set('entity_type', filters.entity_type);
  if (filters.actor_user_id) params.set('actor_user_id', filters.actor_user_id);
  params.set('limit', String(limit));
  return params.toString();
}

function formatDateTime(date: unknown): string {
  if (!date) return '—';
  try {
    return new Date(date as string).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function exportCsv(entries: SystemActivityLogEntry[]) {
  const headers = [
    'Fecha/Hora',
    'Actor',
    'Rol',
    'Módulo',
    'Acción',
    'Etiqueta',
    'Entidad',
    'Código',
    'Estado',
    'Severidad',
    'Descripción',
  ];

  const rows = entries.map(e => [
    formatDateTime(e.occurred_at),
    e.actor_display_name ?? e.actor_user_id ?? e.actor_type,
    e.actor_role ?? '',
    e.source_module,
    e.action_type,
    e.action_label,
    e.entity_type ?? '',
    e.entity_code ?? '',
    e.status,
    e.severity,
    (e.description ?? '').replace(/"/g, '""'),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `registro-central-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ActorCell({ entry }: { entry: SystemActivityLogEntry }) {
  if (entry.actor_type === 'system' || entry.actor_type === 'ai_agent') {
    return (
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          {entry.actor_type === 'ai_agent' ? 'IA' : 'Sistema'}
        </span>
        {entry.source_submodule && (
          <span className="text-xs text-slate-400">{entry.source_submodule}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="text-sm text-slate-700">
        {entry.actor_display_name || entry.actor_user_id || '—'}
      </span>
      {entry.actor_role && (
        <span className="text-xs text-slate-400">{entry.actor_role}</span>
      )}
    </div>
  );
}

function ExpandedRow({ entry }: { entry: SystemActivityLogEntry }) {
  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-sm space-y-2">
      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        {entry.description && (
          <div className="col-span-2">
            <span className="text-slate-500 font-medium">Descripción: </span>
            <span className="text-slate-700">{entry.description}</span>
          </div>
        )}
        {entry.entity_id && (
          <div>
            <span className="text-slate-500 font-medium">Entity ID: </span>
            <span className="font-mono text-xs text-slate-600">{entry.entity_id}</span>
          </div>
        )}
        {entry.correlation_id && (
          <div>
            <span className="text-slate-500 font-medium">Correlation ID: </span>
            <span className="font-mono text-xs text-slate-600">{entry.correlation_id}</span>
          </div>
        )}
        {entry.channel && (
          <div>
            <span className="text-slate-500 font-medium">Canal: </span>
            <span className="text-slate-600">{entry.channel}</span>
          </div>
        )}
        {entry.actor_department_name && (
          <div>
            <span className="text-slate-500 font-medium">Departamento: </span>
            <span className="text-slate-600">{entry.actor_department_name}</span>
          </div>
        )}
      </div>
      {entry.related_entities.length > 0 && (
        <div>
          <span className="text-slate-500 font-medium">Entidades relacionadas: </span>
          <span className="text-slate-600">
            {entry.related_entities
              .map(e => `${e.entity_type}:${e.entity_id}`)
              .join(', ')}
          </span>
        </div>
      )}
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div>
          <span className="text-slate-500 font-medium">Metadata: </span>
          <pre className="text-xs font-mono text-slate-600 bg-slate-100 p-2 rounded mt-1 overflow-auto max-h-24">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RegistroCentralPage() {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [filters, setFilters] = useState<Filters>({
    start_date: sevenDaysAgo,
    end_date: today,
    source_module: '',
    status: '',
    entity_type: '',
    actor_user_id: '',
  });
  const [limit, setLimit] = useState(100);
  const [entries, setEntries] = useState<SystemActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = useCallback(
    async (currentFilters: Filters, currentLimit: number) => {
      try {
        setIsLoading(true);
        const qs = toQueryString(currentFilters, currentLimit);
        const res = await fetch(`/api/admin/system-activity-log?${qs}`);
        if (!res.ok) throw new Error('Error al cargar el registro');
        const json = await res.json();
        setEntries(json.data ?? []);
        setHasMore(json.pagination?.has_more ?? false);
      } catch {
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchEntries(filters, limit);
  }, [fetchEntries, filters, limit]);

  function handleFilterChange<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function handleLoadMore() {
    setLimit(prev => prev + 100);
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro Centralizado de Acciones"
        subtitle="Log append-only inmutable de todas las acciones del sistema"
        breadcrumbs={[
          { label: 'Administración', href: '/admin/usuarios' },
          { label: 'Registro Central' },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(entries)}
            disabled={entries.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchEntries(filters, limit)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </PageHeader>

      {showFilters && (
        <Section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Desde</label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={e => handleFilterChange('start_date', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Hasta</label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={e => handleFilterChange('end_date', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Módulo</label>
              <Select
                value={filters.source_module}
                onValueChange={v => handleFilterChange('source_module', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_MODULES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Estado</label>
              <Select
                value={filters.status}
                onValueChange={v => handleFilterChange('status', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Tipo entidad</label>
              <Input
                placeholder="ej: audit, finding"
                value={filters.entity_type}
                onChange={e => handleFilterChange('entity_type', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Usuario ID</label>
              <Input
                placeholder="UID del actor"
                value={filters.actor_user_id}
                onChange={e => handleFilterChange('actor_user_id', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </Section>
      )}

      <Section className="p-0 overflow-hidden">
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Cargando registro...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Activity className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium">Sin eventos en el período</p>
            <p className="text-xs text-slate-400 mt-1">
              Ajusta los filtros de fecha o módulo
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs whitespace-nowrap">
                      Fecha / Hora
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Actor
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Módulo
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Acción
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Entidad
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Estado
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-xs">
                      Severity
                    </th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <React.Fragment key={entry.id}>
                      <tr
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleExpanded(entry.id)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-slate-600 text-xs font-mono">
                          {formatDateTime(entry.occurred_at)}
                        </td>
                        <td className="px-4 py-2">
                          <ActorCell entry={entry} />
                        </td>
                        <td className="px-4 py-2 text-slate-600 text-xs">
                          {entry.source_module}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-slate-700">{entry.action_label}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {entry.entity_type}
                          {entry.entity_code && (
                            <span className="ml-1 font-mono">({entry.entity_code})</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <BaseBadge
                            variant={STATUS_VARIANT[entry.status] ?? 'outline'}
                          >
                            {entry.status}
                          </BaseBadge>
                        </td>
                        <td className="px-4 py-2">
                          <BaseBadge
                            variant={SEVERITY_VARIANT[entry.severity] ?? 'outline'}
                          >
                            {entry.severity}
                          </BaseBadge>
                        </td>
                        <td className="px-2 py-2 text-slate-400">
                          {expandedId === entry.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <ExpandedRow entry={entry} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Mostrando {entries.length} evento{entries.length !== 1 ? 's' : ''}
                {hasMore && ' (hay más)'}
              </span>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  Cargar más
                </Button>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
