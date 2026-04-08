'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  ArrowUpDown,
  Eye,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

type CiudadanosResponse = {
  success?: boolean;
  data?: GovCiudadano[];
  error?: string;
};

type SortKey =
  | 'dni'
  | 'nombre'
  | 'email'
  | 'telefono'
  | 'estado'
  | 'updated_at';

type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

const INITIAL_SORT: SortState = {
  key: 'updated_at',
  direction: 'desc',
};

function getEstadoBadgeClass(estado: GovCiudadano['estado']) {
  if (estado === 'activo') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (estado === 'bloqueado') return 'border-rose-200 bg-rose-100 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function getNombreCompleto(ciudadano: GovCiudadano) {
  return `${ciudadano.nombre} ${ciudadano.apellido}`.trim();
}

function compareValues(left: string, right: string, direction: SortState['direction']) {
  const result = left.localeCompare(right, 'es', { sensitivity: 'base' });
  return direction === 'asc' ? result : result * -1;
}

export default function GobiernoCiudadanosPage() {
  const [ciudadanos, setCiudadanos] = useState<GovCiudadano[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const loadCiudadanos = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await authFetch('/api/gobierno/ciudadanos?limit=50', {
        cache: 'no-store',
      });
      const json = (await response.json()) as CiudadanosResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudieron cargar los ciudadanos');
      }

      setCiudadanos(Array.isArray(json.data) ? json.data : []);
      setError(null);
    } catch (fetchError) {
      setCiudadanos([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudieron cargar los ciudadanos'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCiudadanos();
  }, []);

  const filteredCiudadanos = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const result = ciudadanos.filter(ciudadano => {
      if (!normalizedSearch) return true;
      return (
        getNombreCompleto(ciudadano).toLowerCase().includes(normalizedSearch) ||
        ciudadano.dni.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...result].sort((left, right) => {
      if (sort.key === 'nombre') {
        return compareValues(
          getNombreCompleto(left),
          getNombreCompleto(right),
          sort.direction
        );
      }

      if (sort.key === 'updated_at') {
        return compareValues(left.updated_at, right.updated_at, sort.direction);
      }

      const leftValue = String(left[sort.key] || '');
      const rightValue = String(right[sort.key] || '');
      return compareValues(leftValue, rightValue, sort.direction);
    });
  }, [ciudadanos, deferredSearch, sort]);

  const toggleSort = (key: SortKey) => {
    setSort(current =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'updated_at' ? 'desc' : 'asc' }
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
                <Users className="mr-1 h-3.5 w-3.5" />
                Ciudadanos
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Padron ciudadano
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Lista operativa con busqueda por DNI o nombre completo.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => void loadCiudadanos('refresh')}
                disabled={refreshing}
                className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]"
              >
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Actualizar
              </Button>
              <Link href="/gobierno/ciudadanos/nuevo">
                <Button className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo ciudadano
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o DNI"
                  className="border-slate-200 pl-9 focus-visible:ring-[#2563eb]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Resultados visibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {filteredCiudadanos.length}
              </p>
            </CardContent>
          </Card>
        </section>

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
                    <TableHead>{sortableHead('DNI', 'dni')}</TableHead>
                    <TableHead>{sortableHead('Nombre completo', 'nombre')}</TableHead>
                    <TableHead>{sortableHead('Email', 'email')}</TableHead>
                    <TableHead>{sortableHead('Telefono', 'telefono')}</TableHead>
                    <TableHead>{sortableHead('Estado', 'estado')}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCiudadanos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center text-sm text-slate-500">
                        No hay ciudadanos para mostrar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCiudadanos.map(ciudadano => (
                      <TableRow key={ciudadano.id}>
                        <TableCell className="font-medium text-slate-900">{ciudadano.dni}</TableCell>
                        <TableCell>{getNombreCompleto(ciudadano)}</TableCell>
                        <TableCell>{ciudadano.email || 'Sin email'}</TableCell>
                        <TableCell>{ciudadano.telefono || 'Sin telefono'}</TableCell>
                        <TableCell>
                          <Badge className={getEstadoBadgeClass(ciudadano.estado)}>
                            {ciudadano.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/gobierno/ciudadanos/${ciudadano.id}`}>
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
