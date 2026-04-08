'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, LayoutGrid, Plus, RefreshCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import UnifiedKanban from '@/components/ui/unified-kanban';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { KanbanColumn, KanbanItem } from '@/types/rrhh';

type EstadoExpediente =
  | 'recibido'
  | 'admitido'
  | 'en_analisis'
  | 'derivado'
  | 'observado'
  | 'resuelto'
  | 'archivado';

type PrioridadExpediente = 'baja' | 'media' | 'alta' | 'urgente';

type ExpedienteListItem = {
  id: string;
  numero: string;
  tipo: string;
  titulo: string;
  ciudadano_id?: string;
  ciudadano_nombre?: string;
  estado: EstadoExpediente;
  prioridad: PrioridadExpediente;
  area_responsable_id?: string;
  area_responsable_nombre?: string;
  fecha_vencimiento?: string | null;
  historial: Array<{
    estado: EstadoExpediente;
    fecha: string | null;
    comentario?: string;
    responsable_nombre?: string;
  }>;
};

const ESTADOS: Array<{
  value: EstadoExpediente;
  label: string;
  color: string;
  badgeClassName: string;
}> = [
  { value: 'recibido', label: 'Recibido', color: '#64748b', badgeClassName: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'admitido', label: 'Admitido', color: '#2563eb', badgeClassName: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'en_analisis', label: 'En analisis', color: '#7c3aed', badgeClassName: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'derivado', label: 'Derivado', color: '#0891b2', badgeClassName: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'observado', label: 'Observado', color: '#d97706', badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'resuelto', label: 'Resuelto', color: '#16a34a', badgeClassName: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'archivado', label: 'Archivado', color: '#111827', badgeClassName: 'bg-zinc-200 text-zinc-800 border-zinc-300' },
];

const PRIORIDADES: Array<{
  value: PrioridadExpediente;
  label: string;
  className: string;
}> = [
  { value: 'baja', label: 'Baja', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'media', label: 'Media', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'alta', label: 'Alta', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'urgente', label: 'Urgente', className: 'bg-rose-100 text-rose-700 border-rose-200' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getEstadoMeta(estado: EstadoExpediente) {
  return ESTADOS.find(item => item.value === estado) || ESTADOS[0];
}

function getPrioridadMeta(prioridad: PrioridadExpediente) {
  return PRIORIDADES.find(item => item.value === prioridad) || PRIORIDADES[0];
}

function getSlaTone(fechaVencimiento?: string | null) {
  if (!fechaVencimiento) return 'text-slate-500';
  const target = new Date(fechaVencimiento).getTime();
  if (Number.isNaN(target)) return 'text-slate-500';
  const diffDays = Math.ceil((target - Date.now()) / 86400000);
  if (diffDays < 0) return 'text-rose-600';
  if (diffDays <= 2) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function ExpedientesPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const orgId = user?.organization_id;

  const [expedientes, setExpedientes] = useState<ExpedienteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [filters, setFilters] = useState({
    tipo: 'todos',
    estado: 'todos',
    prioridad: 'todos',
    area: 'todos',
  });

  const tipoOptions = useMemo(
    () => Array.from(new Set(expedientes.map(item => item.tipo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [expedientes]
  );

  const areaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          expedientes
            .map(item => item.area_responsable_nombre || item.area_responsable_id)
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [expedientes]
  );

  const filteredExpedientes = useMemo(
    () =>
      expedientes.filter(item => {
        if (filters.tipo !== 'todos' && item.tipo !== filters.tipo) return false;
        if (filters.estado !== 'todos' && item.estado !== filters.estado) return false;
        if (filters.prioridad !== 'todos' && item.prioridad !== filters.prioridad) {
          return false;
        }
        const areaName = item.area_responsable_nombre || item.area_responsable_id;
        if (filters.area !== 'todos' && areaName !== filters.area) return false;
        return true;
      }),
    [expedientes, filters]
  );

  const kanbanColumns = useMemo<KanbanColumn[]>(
    () =>
      ESTADOS.map((estado, index) => ({
        id: estado.value,
        title: estado.label,
        color: estado.color,
        allowDrop: true,
        order: index,
      })),
    []
  );

  const kanbanItems = useMemo<KanbanItem[]>(
    () =>
      filteredExpedientes.map(item => ({
        id: item.id,
        title: item.titulo,
        description: item.ciudadano_nombre || 'Sin ciudadano vinculado',
        columnId: item.estado,
        priority:
          item.prioridad === 'urgente'
            ? 'critical'
            : item.prioridad === 'alta'
              ? 'high'
              : item.prioridad === 'media'
                ? 'medium'
                : 'low',
        tags: [item.tipo, item.area_responsable_nombre || 'Sin area'],
        assignee: item.ciudadano_nombre,
        dueDate: item.fecha_vencimiento || undefined,
        metadata: item,
      })),
    [filteredExpedientes]
  );

  async function loadExpedientes() {
    if (!orgId) {
      setExpedientes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (filters.tipo !== 'todos') query.set('tipo', filters.tipo);
      if (filters.estado !== 'todos') query.set('estado', filters.estado);
      if (filters.prioridad !== 'todos') query.set('prioridad', filters.prioridad);

      const response = await fetch(`/api/expedientes?${query.toString()}`, {
        cache: 'no-store',
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudieron cargar los expedientes');
      }

      setExpedientes(Array.isArray(json.data) ? json.data : []);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudieron cargar los expedientes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      void loadExpedientes();
    }
  }, [authLoading, orgId, filters.tipo, filters.estado, filters.prioridad]);

  async function handleMove(
    itemId: string,
    _sourceColumnId: string,
    targetColumnId: string
  ) {
    const nextEstado = targetColumnId as EstadoExpediente;
    const current = expedientes.find(item => item.id === itemId);
    if (!current || current.estado === nextEstado) return;

    try {
      setMovingId(itemId);
      const response = await fetch(`/api/expedientes/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextEstado }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo mover el expediente');
      }

      setExpedientes(prev => prev.map(item => (item.id === itemId ? json.data : item)));
      toast({
        title: 'Estado actualizado',
        description: `${current.numero} paso a ${getEstadoMeta(nextEstado).label}.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo mover el expediente';
      setError(message);
      toast({
        title: 'Error al mover',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-3xl text-slate-900">Expedientes</CardTitle>
              <p className="mt-2 text-sm text-slate-600">
                Lista operativa con vista tabular y kanban por estado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ViewToggle view={view} onViewChange={setView} />
              <Button variant="outline" onClick={() => void loadExpedientes()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
              <Link href="/expedientes/nuevo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo expediente
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!orgId && !authLoading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay una organizacion activa en la sesion.
          </div>
        )}

        <Card className="border-slate-200">
          <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
              <Select value={filters.tipo} onValueChange={value => setFilters(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tipoOptions.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Estado</label>
              <Select value={filters.estado} onValueChange={value => setFilters(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS.map(estado => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Prioridad</label>
              <Select value={filters.prioridad} onValueChange={value => setFilters(prev => ({ ...prev, prioridad: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {PRIORIDADES.map(prioridad => (
                    <SelectItem key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Area</label>
              <Select value={filters.area} onValueChange={value => setFilters(prev => ({ ...prev, area: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {areaOptions.map(area => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {view === 'list' ? (
          <Card className="border-slate-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Ciudadano</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        Cargando expedientes...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpedientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        No hay expedientes para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpedientes.map(item => {
                      const estado = getEstadoMeta(item.estado);
                      const prioridad = getPrioridadMeta(item.prioridad);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-900">{item.numero}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{item.titulo}</p>
                              <p className="text-xs text-slate-500">{item.tipo}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.ciudadano_nombre || 'Sin ciudadano'}</TableCell>
                          <TableCell>
                            <Badge className={cn('border', estado.badgeClassName)}>
                              {estado.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('border', prioridad.className)}>
                              {prioridad.label}
                            </Badge>
                          </TableCell>
                          <TableCell className={getSlaTone(item.fecha_vencimiento)}>
                            {formatDate(item.fecha_vencimiento)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/expedientes/${item.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <LayoutGrid className="h-4 w-4" />
                Arrastra una tarjeta para cambiar su estado. El movimiento actualiza el historial.
              </div>
              <div className={cn(movingId && 'opacity-70')}>
                <UnifiedKanban
                  columns={kanbanColumns}
                  items={kanbanItems}
                  loading={loading}
                  readOnly={!orgId || !!movingId}
                  showActions={false}
                  onItemMove={handleMove}
                  customCardRenderer={item => {
                    const expediente = item.metadata as ExpedienteListItem;
                    const prioridad = getPrioridadMeta(expediente.prioridad);
                    return (
                      <Card className="mb-3 border border-slate-200 bg-white shadow-sm">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {expediente.numero}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {expediente.titulo}
                              </p>
                            </div>
                            <Badge className={cn('border', prioridad.className)}>
                              {prioridad.label}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600">
                            <p>{expediente.ciudadano_nombre || 'Sin ciudadano vinculado'}</p>
                            <p>{expediente.area_responsable_nombre || 'Sin area responsable'}</p>
                            <p className={getSlaTone(expediente.fecha_vencimiento)}>
                              Vence: {formatDate(expediente.fecha_vencimiento)}
                            </p>
                          </div>

                          <Link href={`/expedientes/${expediente.id}`} className="inline-flex items-center text-xs font-medium text-sky-700">
                            Abrir detalle
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
