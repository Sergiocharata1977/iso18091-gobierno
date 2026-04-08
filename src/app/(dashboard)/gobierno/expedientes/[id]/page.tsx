'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/api/authFetch';
import type { GovCiudadano } from '@/types/gov-ciudadano';
import type { EstadoExpediente, GovExpediente } from '@/types/gov-expediente';
import {
  ArrowLeft,
  ChevronDown,
  FolderOpen,
  Loader2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type ExpedienteResponse = {
  success?: boolean;
  data?: GovExpediente;
  error?: string;
};

type CiudadanoResponse = {
  success?: boolean;
  data?: GovCiudadano;
  error?: string;
};

const NEXT_STATES: Record<EstadoExpediente, EstadoExpediente[]> = {
  ingresado: ['en_proceso'],
  en_proceso: ['resuelto'],
  resuelto: ['cerrado'],
  cerrado: [],
  archivado: [],
};

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

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function GobiernoExpedienteDetailPage() {
  const params = useParams<{ id: string }>();
  const expedienteId = params?.id;

  const [expediente, setExpediente] = useState<GovExpediente | null>(null);
  const [ciudadano, setCiudadano] = useState<GovCiudadano | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expedienteId) return;

    let cancelled = false;

    async function loadDetail() {
      try {
        setLoading(true);

        const expedienteResponse = await authFetch(`/api/gobierno/expedientes/${expedienteId}`, {
          cache: 'no-store',
        });
        const expedienteJson = (await expedienteResponse.json()) as ExpedienteResponse;

        if (!expedienteResponse.ok || !expedienteJson.success || !expedienteJson.data) {
          throw new Error(expedienteJson.error || 'No se pudo obtener el expediente');
        }

        let ciudadanoData: GovCiudadano | null = null;

        if (expedienteJson.data.ciudadano_id) {
          const ciudadanoResponse = await authFetch(
            `/api/gobierno/ciudadanos/${expedienteJson.data.ciudadano_id}`,
            { cache: 'no-store' }
          );
          const ciudadanoJson = (await ciudadanoResponse.json()) as CiudadanoResponse;
          if (ciudadanoResponse.ok && ciudadanoJson.success && ciudadanoJson.data) {
            ciudadanoData = ciudadanoJson.data;
          }
        }

        if (!cancelled) {
          setExpediente(expedienteJson.data);
          setCiudadano(ciudadanoData);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setExpediente(null);
          setCiudadano(null);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo cargar el detalle del expediente'
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
  }, [expedienteId]);

  const updateEstado = async (estado: EstadoExpediente) => {
    if (!expedienteId || !expediente) return;

    try {
      setUpdating(true);

      const response = await authFetch(`/api/gobierno/expedientes/${expedienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      const json = (await response.json()) as ExpedienteResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo actualizar el estado');
      }

      setExpediente(json.data);
      setError(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar el estado'
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Expedientes
              </Badge>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    {expediente?.numero || 'Detalle expediente'}
                  </h1>
                  {expediente ? (
                    <>
                      <Badge className={getEstadoBadgeClass(expediente.estado)}>
                        {expediente.estado.replaceAll('_', ' ')}
                      </Badge>
                      <Badge className={getPrioridadClass(expediente.prioridad)}>
                        {expediente.prioridad}
                      </Badge>
                    </>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {expediente?.asunto || 'Expediente municipal'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/gobierno/expedientes">
                <Button variant="outline" className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </Link>

              {expediente ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={updating || NEXT_STATES[expediente.estado].length === 0}>
                      {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                      Cambiar estado
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {NEXT_STATES[expediente.estado].length === 0 ? (
                      <DropdownMenuItem disabled>Sin transiciones disponibles</DropdownMenuItem>
                    ) : (
                      NEXT_STATES[expediente.estado].map(estado => (
                        <DropdownMenuItem key={estado} onClick={() => void updateEstado(estado)}>
                          {estado.replaceAll('_', ' ')}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <Card className="rounded-3xl border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-5 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {expediente ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Datos principales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</p>
                    <div className="mt-2">
                      <Badge className={getTipoClass(expediente.tipo)}>{expediente.tipo}</Badge>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Area responsable</p>
                    <p className="mt-2 text-sm text-slate-800">{expediente.area_responsable || 'Sin definir'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha de creacion</p>
                    <p className="mt-2 text-sm text-slate-800">{formatDate(expediente.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ultima actualizacion</p>
                    <p className="mt-2 text-sm text-slate-800">{formatDate(expediente.updated_at)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Descripcion</h2>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {expediente.descripcion}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Vinculos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ciudadano</p>
                  {ciudadano ? (
                    <div className="mt-3 space-y-2">
                      <p className="font-medium text-slate-900">{ciudadano.nombre} {ciudadano.apellido}</p>
                      <p className="text-sm text-slate-600">DNI {ciudadano.dni}</p>
                      <Link href={`/gobierno/ciudadanos/${ciudadano.id}`}>
                        <Button variant="ghost" size="sm" className="px-0 text-[#1e3a5f]">
                          <UserRound className="mr-2 h-4 w-4" />
                          Abrir ciudadano
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Sin ciudadano vinculado.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SLA</p>
                  <p className="mt-2 text-sm text-slate-800">
                    {expediente.fecha_vencimiento_sla
                      ? formatDate(expediente.fecha_vencimiento_sla)
                      : 'Sin vencimiento informado'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}
