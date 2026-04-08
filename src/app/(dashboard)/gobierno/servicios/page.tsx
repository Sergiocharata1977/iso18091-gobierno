'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { authFetch } from '@/lib/api/authFetch';
import type { GovServicio } from '@/types/gov-servicio';
import {
  CheckCheck,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ServiciosResponse = {
  success?: boolean;
  data?: GovServicio[];
  error?: string;
};

const categoriaLabels: Record<GovServicio['categoria'], string> = {
  tramite: 'Tramite',
  consulta: 'Consulta',
  habilitacion: 'Habilitacion',
  beneficio: 'Beneficio',
  otro: 'Otro',
};

const estadoLabels: Record<GovServicio['estado'], string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  borrador: 'Borrador',
};

const categoriaClasses: Record<GovServicio['categoria'], string> = {
  tramite: 'border-sky-200 bg-sky-50 text-sky-700',
  consulta: 'border-violet-200 bg-violet-50 text-violet-700',
  habilitacion: 'border-amber-200 bg-amber-50 text-amber-700',
  beneficio: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  otro: 'border-slate-200 bg-slate-100 text-slate-700',
};

const estadoClasses: Record<GovServicio['estado'], string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactivo: 'border-rose-200 bg-rose-50 text-rose-700',
  borrador: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function GobiernoServiciosPage() {
  const [servicios, setServicios] = useState<GovServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServicios = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await authFetch('/api/gobierno/servicios', {
        cache: 'no-store',
      });
      const json = (await response.json()) as ServiciosResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo cargar la carta de servicios');
      }

      setServicios(json.data);
      setError(null);
    } catch (fetchError) {
      setServicios([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar la carta de servicios'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadServicios();
  }, [loadServicios]);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="ISO 18091"
          title="Carta de servicios publicos"
          description="Catalogo de servicios municipales con SLA, areas responsables y visibilidad publica."
          breadcrumbs={[
            { label: 'Gobierno', href: '/gobierno/panel' },
            { label: 'Carta de servicios' },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => void loadServicios('refresh')}
                disabled={loading || refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
              <Button asChild className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                <Link href="/gobierno/servicios/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo servicio
                </Link>
              </Button>
            </>
          }
        />

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-5 w-5 text-[#2563eb]" />
                Servicios registrados
              </CardTitle>
              <CardDescription>
                Gestiona la oferta de servicios y su publicacion para la ciudadania.
              </CardDescription>
            </div>
            <Badge className="w-fit border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
              {servicios.length} servicios
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563eb]" />
                Cargando servicios...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : servicios.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <CheckCheck className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-base font-medium text-slate-700">
                  Aun no hay servicios cargados
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Crea la primera ficha para publicar informacion de atencion al ciudadano.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Publico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicios.map(servicio => (
                      <TableRow key={servicio.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{servicio.nombre}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {servicio.descripcion}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoriaClasses[servicio.categoria]}>
                            {categoriaLabels[servicio.categoria]}
                          </Badge>
                        </TableCell>
                        <TableCell>{servicio.sla_dias} dias</TableCell>
                        <TableCell>{servicio.area}</TableCell>
                        <TableCell>
                          <Badge className={estadoClasses[servicio.estado]}>
                            {estadoLabels[servicio.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {servicio.publico ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Publico
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
