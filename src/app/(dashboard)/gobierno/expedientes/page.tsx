'use client';

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
import { authFetch } from '@/lib/api/authFetch';
import type { GovCiudadano } from '@/types/gov-ciudadano';
import type {
  EstadoExpediente,
  GovExpediente,
  PrioridadExpediente,
  TipoExpediente,
} from '@/types/gov-expediente';
import { ArrowUpDown, Eye, FolderOpen, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ExpedientesResponse = {
  success?: boolean;
  data?: GovExpediente[];
  error?: string;
};

type CiudadanosResponse = {
  success?: boolean;
  data?: GovCiudadano[];
  error?: string;
};

type SortKey = 'numero' | 'tipo' | 'asunto' | 'ciudadano' | 'estado' | 'prioridad' | 'created_at';
type SortState = { key: SortKey; direction: 'asc' | 'desc' };

const TIPOS: Array<{ value: 'todos' | TipoExpediente; label: string }> = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'denuncia', label: 'Denuncia' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS: Array<{ value: 'todos' | EstadoExpediente; label: string }> = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'ingresado', label: 'Ingresado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'archivado', label: 'Archivado' },
];

const PRIORIDADES: Array<{ value: 'todos' | PrioridadExpediente; label: string }> = [
  { value: 'todos', label: 'Todas las prioridades' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

function getEstadoBadgeClass(estado: GovExpediente['estado']) {
  if (estado === 'resuelto') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (estado === 'cerrado' || estado === 'archivado') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  return 'border-blue-200 bg-blue-100 text-blue-700';
}

function getPrioridadClass(prioridad: GovExpediente['prioridad']) {
  if (prioridad === 'urgente') return 'border-rose-200 bg-rose-100 text-rose-700';
  if (prioridad === 'alta') return 'border-amber-200 bg-amber-100 text-amber-800';
  if (prioridad === 'media') return 'border-sky-200 bg-sky-100 text-sky-700';
  return 'border-emerald-200 bg-emerald-100 text-emerald-700';
}

function getTipoClass(tipo: GovExpediente['tipo']) {
  if (tipo === 'denuncia') return 'border-rose-200 bg-rose-100 text-rose-700';
  if (tipo === 'reclamo') return 'border-amber-200 bg-amber-100 text-amber-800';
  if (tipo === 'consulta') return 'border-sky-200 bg-sky-100 text-sky-700';
  return 'border-blue-200 bg-blue-100 text-blue-700';
}

function compareValues(left: string, right: string, direction: SortState['direction']) {
  const result = left.localeCompare(right, 'es', { sensitivity: 'base' });
  return direction === 'asc' ? result : result * -1;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);
}

export default function GobiernoExpedientesPage() {
  const [expedientes, setExpedientes] = useState<GovExpediente[]>([]);
  const [ciudadanos, setCiudadanos] = useState<GovCiudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<'todos' | EstadoExpediente>('todos');
  const [tipo, setTipo] = useState<'todos' | TipoExpediente>('todos');
  const [prioridad, setPrioridad] = useState<'todos' | PrioridadExpediente>('todos');
  const [sort, setSort] = useState<SortState>({ key: 'created_at', direction: 'desc' });

  const loadData = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);

    try {
      const [expedientesResponse, ciudadanosResponse] = await Promise.all([
        authFetch('/api/gobierno/expedientes?limit=50', { cache: 'no-store' }),
        authFetch('/api/gobierno/ciudadanos?limit=50', { cache: 'no-store' }),
      ]);

      const expedientesJson = (await expedientesResponse.json()) as ExpedientesResponse;
      const ciudadanosJson = (await ciudadanosResponse.json()) as CiudadanosResponse;

      if (!expedientesResponse.ok || !expedientesJson.success) {
        throw new Error(expedientesJson.error || 'No se pudieron cargar los expedientes');
      }

      if (!ciudadanosResponse.ok || !ciudadanosJson.success) {
        throw new Error(ciudadanosJson.error || 'No se pudieron cargar los ciudadanos');
      }

      setExpedientes(Array.isArray(expedientesJson.data) ? expedientesJson.data : []);
      setCiudadanos(Array.isArray(ciudadanosJson.data) ? ciudadanosJson.data : []);
      setError(null);
    } catch (fetchError) {
      setExpedientes([]);
      setCiudadanos([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudieron cargar los expedientes'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const ciudadanosMap = useMemo(
    () =>
      new Map(
        ciudadanos.map(ciudadano => [
          ciudadano.id,
          `${ciudadano.nombre} ${ciudadano.apellido}`.trim(),
        ])
      ),
    [ciudadanos]
  );

  const filteredExpedientes = useMemo(() => {
    const result = expedientes.filter(expediente => {
      if (estado !== 'todos' && expediente.estado !== estado) return false;
      if (tipo !== 'todos' && expediente.tipo !== tipo) return false;
      if (prioridad !== 'todos' && expediente.prioridad !== prioridad) return false;
      return true;
    });

    return [...result].sort((left, right) => {
      if (sort.key === 'ciudadano') {
        return compareValues(
          ciudadanosMap.get(left.ciudadano_id || '') || '',
          ciudadanosMap.get(right.ciudadano_id || '') || '',
          sort.direction
        );
      }

      const leftValue = String(left[sort.key] || '');
      const rightValue = String(right[sort.key] || '');
      return compareValues(leftValue, rightValue, sort.direction);
    });
  }, [ciudadanosMap, estado, expedientes, prioridad, sort, tipo]);

  const toggleSort = (key: SortKey) => {
    setSort(current =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'created_at' ? 'desc' : 'asc' }
    );
  };

  const sortableHead = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-2 text-left font-medium text-slate-600 transition hover:text-[#1e3a5f]"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Expedientes
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Gestion de expedientes
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Seguimiento operativo con filtros por estado, tipo y prioridad.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => void loadData('refresh')} disabled={refreshing} className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Actualizar
              </Button>
              <Link href="/gobierno/expedientes/nuevo">
                <Button className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo expediente
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Estado</p>
              <Select value={estado} onValueChange={value => setEstado(value as 'todos' | EstadoExpediente)}>
                <SelectTrigger className="border-slate-200"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Tipo</p>
              <Select value={tipo} onValueChange={value => setTipo(value as 'todos' | TipoExpediente)}>
                <SelectTrigger className="border-slate-200"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Prioridad</p>
              <Select value={prioridad} onValueChange={value => setPrioridad(value as 'todos' | PrioridadExpediente)}>
                <SelectTrigger className="border-slate-200"><SelectValue placeholder="Todas las prioridades" /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="rounded-3xl border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-5 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>{sortableHead('Numero EXP', 'numero')}</TableHead>
                    <TableHead>{sortableHead('Tipo', 'tipo')}</TableHead>
                    <TableHead>{sortableHead('Asunto', 'asunto')}</TableHead>
                    <TableHead>{sortableHead('Ciudadano', 'ciudadano')}</TableHead>
                    <TableHead>{sortableHead('Estado', 'estado')}</TableHead>
                    <TableHead>{sortableHead('Prioridad', 'prioridad')}</TableHead>
                    <TableHead>{sortableHead('Fecha', 'created_at')}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpedientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center text-sm text-slate-500">
                        No hay expedientes para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpedientes.map(expediente => (
                      <TableRow key={expediente.id}>
                        <TableCell className="font-medium text-slate-900">{expediente.numero}</TableCell>
                        <TableCell><Badge className={getTipoClass(expediente.tipo)}>{expediente.tipo}</Badge></TableCell>
                        <TableCell>{expediente.asunto}</TableCell>
                        <TableCell>{ciudadanosMap.get(expediente.ciudadano_id || '') || 'Sin ciudadano'}</TableCell>
                        <TableCell><Badge className={getEstadoBadgeClass(expediente.estado)}>{expediente.estado.replaceAll('_', ' ')}</Badge></TableCell>
                        <TableCell><Badge className={getPrioridadClass(expediente.prioridad)}>{expediente.prioridad}</Badge></TableCell>
                        <TableCell>{formatDate(expediente.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/gobierno/expedientes/${expediente.id}`}>
                            <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalle
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
