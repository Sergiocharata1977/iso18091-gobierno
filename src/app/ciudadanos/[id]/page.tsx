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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { authFetch } from '@/lib/api/authFetch';
import type {
  Ciudadano,
  CiudadanoCanalPreferido,
  CiudadanoTipo,
} from '@/types/gov/ciudadano';
import type { Expediente } from '@/types/gov/expediente';
import { ArrowLeft, FilePlus2, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const tipoLabels: Record<CiudadanoTipo, string> = {
  vecino: 'Vecino',
  contribuyente: 'Contribuyente',
  organismo: 'Organismo',
  empresa: 'Empresa',
  otro: 'Otro',
};

const canalLabels: Record<CiudadanoCanalPreferido, string> = {
  presencial: 'Presencial',
  whatsapp: 'WhatsApp',
  web: 'Web',
  telefono: 'Telefono',
  email: 'Email',
};

function formatDate(value: unknown) {
  if (!value) return 'Sin fecha';

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Sin fecha'
      : new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format((value as { toDate: () => Date }).toDate());
  }

  return 'Sin fecha';
}

function toDateValue(value: unknown) {
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  return 0;
}

function getFullName(ciudadano: Ciudadano) {
  return `${ciudadano.nombre} ${ciudadano.apellido}`.trim();
}

export default function CiudadanoDetailPage() {
  const params = useParams<{ id: string }>();
  const ciudadanoId = params?.id;

  const [ciudadano, setCiudadano] = useState<Ciudadano | null>(null);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ciudadanoId) return;

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const [ciudadanoResponse, expedientesResponse] = await Promise.all([
          authFetch(`/api/ciudadanos/${ciudadanoId}`),
          authFetch(`/api/expedientes?ciudadano_id=${ciudadanoId}`),
        ]);

        const ciudadanoData = await ciudadanoResponse.json();
        const expedientesData = await expedientesResponse.json();

        if (!ciudadanoResponse.ok) {
          throw new Error(
            ciudadanoData?.error || 'No se pudo obtener el ciudadano'
          );
        }

        if (!expedientesResponse.ok) {
          throw new Error(
            expedientesData?.error || 'No se pudo obtener el historial'
          );
        }

        const expedientesList = Array.isArray(expedientesData?.data)
          ? expedientesData.data
          : [];

        if (!cancelled) {
          setCiudadano(ciudadanoData);
          setExpedientes(
            expedientesList.filter(
              (expediente: Expediente) => expediente.ciudadano_id === ciudadanoId
            )
          );
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo cargar el perfil del ciudadano'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [ciudadanoId]);

  const expedientesOrdenados = useMemo(
    () =>
      [...expedientes].sort(
        (a, b) => toDateValue(b.updated_at) - toDateValue(a.updated_at)
      ),
    [expedientes]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={ciudadano ? getFullName(ciudadano) : 'Perfil ciudadano'}
          description="Vista 360 con datos de contacto y trazabilidad de expedientes."
          breadcrumbs={[
            { label: 'Municipio' },
            { label: 'Ciudadanos', href: '/ciudadanos' },
            { label: ciudadano ? getFullName(ciudadano) : 'Detalle' },
          ]}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/ciudadanos">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Link>
              </Button>
              {ciudadano ? (
                <Button asChild>
                  <Link
                    href={`/expedientes/nuevo?ciudadano_id=${ciudadano.id}&ciudadano_nombre=${encodeURIComponent(getFullName(ciudadano))}`}
                  >
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Nuevo Expediente
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : ciudadano ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {getFullName(ciudadano)}
                    </CardTitle>
                    <CardDescription>
                      DNI {ciudadano.dni || 'sin registrar'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{tipoLabels[ciudadano.tipo]}</Badge>
                    <Badge variant="outline">
                      Canal {canalLabels[ciudadano.canal_preferido]}
                    </Badge>
                    <Badge variant={ciudadano.activo ? 'default' : 'secondary'}>
                      {ciudadano.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Datos de contacto</CardTitle>
                  <CardDescription>
                    Informacion principal del ciudadano.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">
                        {ciudadano.email || 'No informado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Telefono</p>
                      <p className="text-muted-foreground">
                        {ciudadano.telefono || 'No informado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Direccion</p>
                      <p className="text-muted-foreground">
                        {ciudadano.direccion || 'No informada'}
                      </p>
                      <p className="text-muted-foreground">
                        Barrio: {ciudadano.barrio || 'No informado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Historial de expedientes</CardTitle>
                  <CardDescription>
                    Seguimiento de tramites asociados al ciudadano.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numero</TableHead>
                          <TableHead>Titulo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Actualizado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expedientesOrdenados.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-10 text-center text-muted-foreground"
                            >
                              Este ciudadano todavia no tiene expedientes.
                            </TableCell>
                          </TableRow>
                        ) : (
                          expedientesOrdenados.map(expediente => (
                            <TableRow key={expediente.id}>
                              <TableCell className="font-medium">
                                {expediente.numero}
                              </TableCell>
                              <TableCell>{expediente.titulo}</TableCell>
                              <TableCell className="capitalize">
                                {expediente.estado.replaceAll('_', ' ')}
                              </TableCell>
                              <TableCell className="capitalize">
                                {expediente.prioridad}
                              </TableCell>
                              <TableCell>
                                {formatDate(expediente.updated_at)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {expedientesOrdenados.length > 0 ? (
                    <div className="mt-6 space-y-3">
                      <h3 className="text-sm font-medium">Ultimos movimientos</h3>
                      <div className="space-y-3">
                        {expedientesOrdenados.flatMap(expediente =>
                          (expediente.historial || [])
                            .slice(-2)
                            .reverse()
                            .map((item, index) => (
                              <div
                                key={`${expediente.id}-${index}-${item.estado}`}
                                className="rounded-lg border p-3"
                              >
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <p className="text-sm font-medium">
                                    {expediente.numero} ·{' '}
                                    {item.estado.replaceAll('_', ' ')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(item.fecha)}
                                  </p>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Responsable: {item.responsable_nombre}
                                </p>
                                {item.comentario ? (
                                  <p className="mt-1 text-sm">
                                    {item.comentario}
                                  </p>
                                ) : null}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No se encontro el ciudadano solicitado.
          </div>
        )}
      </div>
    </div>
  );
}
