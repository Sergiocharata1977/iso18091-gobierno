'use client';

import {
  ModulePageShell,
  ModuleStatePanel,
  PageHeader,
} from '@/components/design-system';
import { EvaluationGapAnalysis } from '@/components/rrhh/EvaluationGapAnalysis';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PerformanceEvaluation, Personnel } from '@/types/rrhh';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

function formatDate(
  date?: Date | string | { seconds: number; nanoseconds: number } | null
) {
  if (!date) return 'N/A';
  if (typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000).toLocaleDateString('es-AR');
  }
  return new Date(date).toLocaleDateString('es-AR');
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'activo':
      return 'bg-emerald-100 text-emerald-800';
    case 'licencia':
      return 'bg-yellow-100 text-yellow-800';
    case 'inactivo':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getInitials(nombres?: string, apellidos?: string) {
  const firstInitial = nombres?.charAt(0) || '?';
  const lastInitial = apellidos?.charAt(0) || '?';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function AssignmentList({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items?: string[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map(item => (
              <Badge key={item} variant="secondary" className="mr-1 mb-1">
                {item}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PersonnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useCurrentUser();

  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  const fetchData = useCallback(async () => {
    if (!id || !usuario?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

      const personnelResponse = await fetch(
        `/api/rrhh/personnel/${id}?organization_id=${usuario.organization_id}`
      );

      if (!personnelResponse.ok) {
        if (personnelResponse.status === 404) {
          setError('Empleado no encontrado');
        } else {
          setError('Error al cargar los datos del empleado');
        }
        return;
      }

      const personnelData = await personnelResponse.json();
      setPersonnel(personnelData);

      const evaluationsResponse = await fetch(
        `/api/rrhh/evaluations?organization_id=${usuario.organization_id}&personnel_id=${id}`
      );

      if (!evaluationsResponse.ok) {
        throw new Error('No se pudo cargar el historial de evaluaciones');
      }

      const evaluationsData = await evaluationsResponse.json();
      setEvaluations(Array.isArray(evaluationsData) ? evaluationsData : []);
    } catch (err) {
      console.error('Error fetching personnel detail:', err);
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [id, usuario?.organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </ModulePageShell>
    );
  }

  if (error || !personnel) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <ModuleStatePanel
          icon={<User className="h-10 w-10 text-slate-300" />}
          title={error || 'Empleado no encontrado'}
          description="No se pudo cargar la informacion del empleado."
          actions={
            <Button onClick={() => router.push('/rrhh/personal')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al listado
            </Button>
          }
        />
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell maxWidthClassName="max-w-5xl">
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Perfil del Empleado"
          description="Ficha de referencia organizacional, trazabilidad y asignaciones ISO del colaborador."
          breadcrumbs={[
            { label: 'RRHH', href: '/rrhh' },
            { label: 'Personal', href: '/rrhh/personal' },
            { label: `${personnel.nombres} ${personnel.apellidos}` },
          ]}
          actions={
            <Link href="/rrhh/personal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          }
        />

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Modo referencia RRHH</AlertTitle>
          <AlertDescription>
            RRHH muestra la relacion organizacional, asignaciones ISO y
            trazabilidad. Las reasignaciones operativas se gestionan desde Mi
            Panel.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                  <AvatarImage
                    src={personnel.foto}
                    alt={`${personnel.nombres} ${personnel.apellidos}`}
                  />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-3xl font-bold">
                    {getInitials(personnel.nombres, personnel.apellidos)}
                  </AvatarFallback>
                </Avatar>
                <Badge className={getStatusColor(personnel.estado)}>
                  {personnel.estado || 'N/A'}
                </Badge>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {personnel.nombres} {personnel.apellidos}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {personnel.puesto || 'Puesto no definido'} ·{' '}
                      {personnel.departamento || 'Departamento no definido'}
                    </p>
                  </div>
                  {personnel.user_id ? (
                    <Link
                      href={`/mi-panel?modo=supervisor&userId=${personnel.user_id}`}
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Mi Panel
                      </Button>
                    </Link>
                  ) : (
                    <Badge variant="outline">
                      Sin acceso directo a Mi Panel
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {personnel.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a
                        href={`mailto:${personnel.email}`}
                        className="hover:text-emerald-600"
                      >
                        {personnel.email}
                      </a>
                    </div>
                  )}
                  {personnel.telefono && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {personnel.telefono}
                    </div>
                  )}
                  {personnel.direccion && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {personnel.direccion}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Ingreso: {formatDate(personnel.fecha_ingreso)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Puesto
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {personnel.puesto || 'Sin puesto'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Departamento
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {personnel.departamento || 'Sin departamento'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Supervisor
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {personnel.supervisor_nombre || 'Sin supervisor'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="asignaciones" className="space-y-4">
          <TabsList>
            <TabsTrigger value="asignaciones">Relacion operativa</TabsTrigger>
            <TabsTrigger value="trazabilidad">Trazabilidad</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="asignaciones" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AssignmentList
                title="Procesos Asignados"
                icon={<GitBranch className="w-4 h-4 text-emerald-600" />}
                items={personnel.procesos_asignados}
                emptyLabel="Sin procesos asignados"
              />
              <AssignmentList
                title="Objetivos Asignados"
                icon={<Target className="w-4 h-4 text-blue-600" />}
                items={personnel.objetivos_asignados}
                emptyLabel="Sin objetivos asignados"
              />
              <AssignmentList
                title="Indicadores Asignados"
                icon={<TrendingUp className="w-4 h-4 text-violet-600" />}
                items={personnel.indicadores_asignados}
                emptyLabel="Sin indicadores asignados"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-slate-600" />
                  Competencias y formacion registrada
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Competencias actuales
                  </div>
                  {personnel.competenciasActuales &&
                  personnel.competenciasActuales.length > 0 ? (
                    <div className="space-y-2">
                      {personnel.competenciasActuales.map(comp => (
                        <div
                          key={comp.competenciaId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{comp.competenciaId}</span>
                          <Badge variant="outline">
                            Nivel {comp.nivelAlcanzado}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Sin evaluaciones registradas
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    Capacitaciones realizadas
                  </div>
                  {personnel.capacitacionesRealizadas &&
                  personnel.capacitacionesRealizadas.length > 0 ? (
                    <div className="space-y-2">
                      {personnel.capacitacionesRealizadas.map(capId => (
                        <Badge key={capId} variant="secondary" className="mr-1">
                          {capId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Sin capacitaciones registradas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trazabilidad" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Alta del registro
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(personnel.created_at)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Ultima actualizacion
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(personnel.updated_at)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Ultima evaluacion
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(personnel.ultima_evaluacion)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <EvaluationGapAnalysis personnelId={personnel.id} />
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock3 className="w-4 h-4 text-slate-600" />
                  Historial de evaluaciones y seguimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evaluations.length > 0 ? (
                  <div className="space-y-3">
                    {evaluations.map(evaluation => (
                      <div
                        key={evaluation.id}
                        className="rounded-lg border p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-slate-900">
                            {evaluation.titulo ||
                              `Evaluacion ${evaluation.periodo || evaluation.id}`}
                          </p>
                          <p className="text-sm text-slate-600">
                            Fecha: {formatDate(evaluation.fecha_evaluacion)}
                          </p>
                          <p className="text-sm text-slate-600">
                            Resultado:{' '}
                            {evaluation.resultado_global || 'Sin resultado'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {evaluation.estado || 'Sin estado'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No hay historial de evaluaciones vinculado a este empleado.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModulePageShell>
  );
}
