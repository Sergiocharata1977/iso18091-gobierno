'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { GovExpediente } from '@/types/gov-expediente';
import {
  ArrowLeft,
  FilePlus2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type CiudadanoResponse = {
  success?: boolean;
  data?: GovCiudadano;
  error?: string;
};

type ExpedientesResponse = {
  success?: boolean;
  data?: GovExpediente[];
  error?: string;
};

function getEstadoBadgeClass(estado: GovCiudadano['estado']) {
  if (estado === 'activo') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (estado === 'bloqueado') return 'border-rose-200 bg-rose-100 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function getExpedienteEstadoClass(estado: GovExpediente['estado']) {
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getNombreCompleto(ciudadano: GovCiudadano) {
  return `${ciudadano.nombre} ${ciudadano.apellido}`.trim();
}

export default function GobiernoCiudadanoDetailPage() {
  const params = useParams<{ id: string }>();
  const ciudadanoId = params?.id;

  const [ciudadano, setCiudadano] = useState<GovCiudadano | null>(null);
  const [expedientes, setExpedientes] = useState<GovExpediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ciudadanoId) return;

    let cancelled = false;

    async function loadDetail() {
      try {
        setLoading(true);

        const [ciudadanoResponse, expedientesResponse] = await Promise.all([
          authFetch(`/api/gobierno/ciudadanos/${ciudadanoId}`, { cache: 'no-store' }),
          authFetch('/api/gobierno/expedientes?limit=50', { cache: 'no-store' }),
        ]);

        const ciudadanoJson = (await ciudadanoResponse.json()) as CiudadanoResponse;
        const expedientesJson = (await expedientesResponse.json()) as ExpedientesResponse;

        if (!ciudadanoResponse.ok || !ciudadanoJson.success || !ciudadanoJson.data) {
          throw new Error(ciudadanoJson.error || 'No se pudo obtener el ciudadano');
        }

        if (!expedientesResponse.ok || !expedientesJson.success) {
          throw new Error(expedientesJson.error || 'No se pudo obtener el historial');
        }

        if (!cancelled) {
          setCiudadano(ciudadanoJson.data);
          setExpedientes(
            (expedientesJson.data || []).filter(
              expediente => expediente.ciudadano_id === ciudadanoId
            )
          );
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCiudadano(null);
          setExpedientes([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo cargar el detalle del ciudadano'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [ciudadanoId]);

  const historial = useMemo(
    () =>
      [...expedientes].sort(
        (left, right) =>
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      ),
    [expedientes]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

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
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    {ciudadano ? getNombreCompleto(ciudadano) : 'Detalle ciudadano'}
                  </h1>
                  {ciudadano ? (
                    <Badge className={getEstadoBadgeClass(ciudadano.estado)}>
                      {ciudadano.estado}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {ciudadano ? `DNI ${ciudadano.dni}` : 'Perfil ciudadano'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/gobierno/ciudadanos">
                <Button variant="outline" className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </Link>
              <Link href={`/gobierno/ciudadanos/${ciudadanoId}/editar`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Link href={`/gobierno/expedientes/nuevo?ciudadano_id=${encodeURIComponent(ciudadanoId || '')}`}>
                <Button className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Nuevo expediente para este ciudadano
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <Card className="rounded-3xl border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-5 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {ciudadano ? (
          <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Datos del ciudadano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Alta</p>
                  <p className="mt-2 text-sm text-slate-700">{formatDate(ciudadano.created_at)}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Email</p>
                    <p className="text-slate-600">{ciudadano.email || 'No informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Telefono</p>
                    <p className="text-slate-600">{ciudadano.telefono || 'No informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Domicilio</p>
                    <p className="text-slate-600">{ciudadano.domicilio || 'No informado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">
                  Historial de expedientes relacionados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Numero EXP</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-14 text-center text-sm text-slate-500">
                          Este ciudadano aun no tiene expedientes relacionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historial.map(expediente => (
                        <TableRow key={expediente.id}>
                          <TableCell className="font-medium text-slate-900">
                            <Link href={`/gobierno/expedientes/${expediente.id}`}>
                              {expediente.numero}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                              {expediente.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>{expediente.asunto}</TableCell>
                          <TableCell>
                            <Badge className={getExpedienteEstadoClass(expediente.estado)}>
                              {expediente.estado.replaceAll('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPrioridadClass(expediente.prioridad)}>
                              {expediente.prioridad}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(expediente.updated_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}
