'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/api/authFetch';
import {
  NORMATIVA_ESTADOS,
  NORMATIVA_TIPOS,
  type NormativaEstado,
  type NormativaMunicipal,
  type NormativaTipo,
} from '@/types/gov/normativa';
import { BookText, FileSearch, Gavel, Loader2, Scale, Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

type NormativaListItem = Omit<
  NormativaMunicipal,
  'created_at' | 'updated_at' | 'fecha_sancion' | 'fecha_promulgacion' | 'fecha_publicacion'
> & {
  created_at: string | null;
  updated_at: string | null;
  fecha_sancion?: string | null;
  fecha_promulgacion?: string | null;
  fecha_publicacion?: string | null;
};

const tipoLabels: Record<NormativaTipo, string> = {
  ordenanza: 'Ordenanza',
  decreto: 'Decreto',
  resolucion: 'Resolucion',
  disposicion: 'Disposicion',
};

const estadoLabels: Record<NormativaEstado, string> = {
  borrador: 'Borrador',
  vigente: 'Vigente',
  derogada: 'Derogada',
  archivada: 'Archivada',
};

const estadoBadgeClass: Record<NormativaEstado, string> = {
  borrador: 'border-amber-200 bg-amber-50 text-amber-800',
  vigente: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  derogada: 'border-rose-200 bg-rose-50 text-rose-700',
  archivada: 'border-slate-200 bg-slate-100 text-slate-700',
};

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

export default function NormativasPage() {
  const { user, loading: authLoading } = useAuth();
  const [normativas, setNormativas] = useState<NormativaListItem[]>([]);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<'all' | NormativaTipo>('all');
  const [estado, setEstado] = useState<'all' | NormativaEstado>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.organization_id && user?.rol !== 'super_admin') {
      setLoading(false);
      setError('No se encontro la organizacion activa para listar normativas.');
      return;
    }

    let cancelled = false;

    const loadNormativas = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (user?.organization_id) {
          params.set('organization_id', user.organization_id);
        }

        const response = await authFetch(`/api/normativas?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = (await response.json()) as {
          success: boolean;
          data?: NormativaListItem[];
          error?: string;
        };

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'No se pudieron cargar las normativas');
        }

        if (!cancelled) {
          setNormativas(Array.isArray(json.data) ? json.data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudieron cargar las normativas'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNormativas();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.organization_id, user?.rol]);

  const filteredNormativas = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('es');

    return normativas.filter(normativa => {
      const matchesTipo = tipo === 'all' || normativa.tipo === tipo;
      const matchesEstado = estado === 'all' || normativa.estado === estado;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          normativa.numero,
          normativa.titulo,
          normativa.resumen,
          normativa.area_responsable_nombre,
          normativa.emisor,
          ...(normativa.tema_tags || []),
        ]
          .filter(Boolean)
          .some(value =>
            String(value).toLocaleLowerCase('es').includes(normalizedSearch)
          );

      return matchesTipo && matchesEstado && matchesSearch;
    });
  }, [deferredSearch, estado, normativas, tipo]);

  const stats = useMemo(() => {
    const vigentes = normativas.filter(item => item.estado === 'vigente').length;
    const ordenanzas = normativas.filter(item => item.tipo === 'ordenanza').length;

    return {
      total: normativas.length,
      vigentes,
      ordenanzas,
      visibles: filteredNormativas.length,
    };
  }, [filteredNormativas.length, normativas]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Normativas"
          description="Repositorio operativo de ordenanzas, decretos, resoluciones y disposiciones municipales."
          breadcrumbs={[
            { label: 'Municipio' },
            { label: 'Normativas' },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Scale className="h-6 w-6 text-muted-foreground" />
                {stats.total}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Total registradas
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">{stats.vigentes}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Vigentes
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">{stats.ordenanzas}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Ordenanzas
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-3xl">
                <FileSearch className="h-6 w-6 text-muted-foreground" />
                {stats.visibles}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Resultados visibles
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscador normativo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por numero, titulo, area o tema"
                className="pl-9"
              />
            </div>

            <Select
              value={tipo}
              onValueChange={value => setTipo(value as 'all' | NormativaTipo)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {NORMATIVA_TIPOS.map(item => (
                  <SelectItem key={item} value={item}>
                    {tipoLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={estado}
              onValueChange={value =>
                setEstado(value as 'all' | NormativaEstado)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {NORMATIVA_ESTADOS.map(item => (
                  <SelectItem key={item} value={item}>
                    {estadoLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Listado de actos administrativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Fecha publicacion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNormativas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <BookText className="h-8 w-8 text-slate-400" />
                            <span>No hay normativas para los filtros seleccionados.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNormativas.map(normativa => (
                        <TableRow key={normativa.id}>
                          <TableCell className="font-medium">
                            {normativa.numero}
                          </TableCell>
                          <TableCell>{tipoLabels[normativa.tipo]}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">
                                {normativa.titulo}
                              </p>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {normativa.resumen}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={estadoBadgeClass[normativa.estado]}
                            >
                              {estadoLabels[normativa.estado]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {normativa.area_responsable_nombre || 'Sin area'}
                          </TableCell>
                          <TableCell>
                            {formatDate(normativa.fecha_publicacion)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
