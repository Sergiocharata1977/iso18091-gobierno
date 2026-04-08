'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  CIUDADANO_TIPOS,
  type Ciudadano,
  type CiudadanoTipo,
} from '@/types/gov/ciudadano';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

const tipoLabels: Record<CiudadanoTipo, string> = {
  vecino: 'Vecino',
  contribuyente: 'Contribuyente',
  organismo: 'Organismo',
  empresa: 'Empresa',
  otro: 'Otro',
};

function getFullName(ciudadano: Ciudadano) {
  return `${ciudadano.nombre} ${ciudadano.apellido}`.trim();
}

export default function CiudadanosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [ciudadanos, setCiudadanos] = useState<Ciudadano[]>([]);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<'all' | CiudadanoTipo>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.organization_id) {
      setLoading(false);
      setError('No se encontro la organizacion activa para listar ciudadanos.');
      return;
    }

    let cancelled = false;

    const loadCiudadanos = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          organization_id: user.organization_id ?? '',
        });

        const response = await authFetch(`/api/ciudadanos?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'No se pudieron cargar los ciudadanos');
        }

        if (!cancelled) {
          setCiudadanos(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudieron cargar los ciudadanos'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCiudadanos();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.organization_id]);

  const filteredCiudadanos = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return ciudadanos.filter(ciudadano => {
      const matchesTipo = tipo === 'all' || ciudadano.tipo === tipo;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        getFullName(ciudadano).toLowerCase().includes(normalizedSearch) ||
        ciudadano.dni?.toLowerCase().includes(normalizedSearch);

      return matchesTipo && matchesSearch;
    });
  }, [ciudadanos, deferredSearch, tipo]);

  const canalMasUsado = useMemo(() => {
    if (ciudadanos.length === 0) return 'Sin datos';

    const totals = ciudadanos.reduce(
      (accumulator, ciudadano) => {
        accumulator[ciudadano.canal_preferido] =
          (accumulator[ciudadano.canal_preferido] || 0) + 1;
        return accumulator;
      },
      {} as Record<string, number>
    );

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos';
  }, [ciudadanos]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Ciudadanos"
          description="Gestion de legajos ciudadanos con busqueda operativa y acceso al perfil 360."
          breadcrumbs={[
            { label: 'Municipio' },
            { label: 'Ciudadanos' },
          ]}
          actions={
            <Button asChild>
              <Link href="/ciudadanos/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Ciudadano
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total registrados</CardDescription>
              <CardTitle className="text-3xl">{ciudadanos.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Resultados visibles</CardDescription>
              <CardTitle className="text-3xl">
                {filteredCiudadanos.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Canal mas usado</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                {canalMasUsado}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Padron ciudadano</CardTitle>
            <CardDescription>
              Busca por nombre o DNI y filtra por tipo de ciudadano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o DNI"
                  className="pl-9"
                />
              </div>
              <Select
                value={tipo}
                onValueChange={value =>
                  setTipo(value as 'all' | CiudadanoTipo)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {CIUDADANO_TIPOS.map(item => (
                    <SelectItem key={item} value={item}>
                      {tipoLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                      <TableHead>Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Canal preferido</TableHead>
                      <TableHead>Barrio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCiudadanos.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No hay ciudadanos para los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCiudadanos.map(ciudadano => (
                        <TableRow
                          key={ciudadano.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/ciudadanos/${ciudadano.id}`)}
                        >
                          <TableCell className="font-medium">
                            {getFullName(ciudadano)}
                          </TableCell>
                          <TableCell>{ciudadano.dni || 'Sin DNI'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {tipoLabels[ciudadano.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {ciudadano.canal_preferido}
                          </TableCell>
                          <TableCell>{ciudadano.barrio || 'Sin barrio'}</TableCell>
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
