/**
 * Hub Unificado de Planificacion y Revision por la Direccion
 * Actua como Dashboard central sin romper la navegacion existente.
 */

'use client';

import { ModulePageShell, PageHeader, Section } from '@/components/design-system';
import { OnboardingStrategyBanner } from '@/components/onboarding/OnboardingStrategyBanner';
import { StrategyLaunchCard } from '@/components/onboarding/StrategyLaunchCard';
import { PlanificacionListing } from '@/components/planificacion/PlanificacionListing';
import { StrategicAnalysisSummaryCard } from '@/components/strategic-analysis/StrategicAnalysisSummaryCard';
import { StatusDonut } from '@/components/shared/StatusDonut';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { PlanBase, PlanCollectionType } from '@/types/planificacion';
import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Globe,
  History,
  Loader2,
  Plus,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface SectionStatus {
  id: string;
  hasVigente: boolean;
  hasBorrador: boolean;
  count: number;
  lastUpdate?: Date;
  versionVigente?: number;
}

const SECTIONS = [
  {
    id: 'identidad',
    title: 'Identidad Organizacional',
    description: 'Mision, vision, valores y objetivos estrategicos',
    icon: BookOpen,
    collection: 'plan_identidad',
    color: 'emerald',
  },
  {
    id: 'alcance',
    title: 'Alcance del SGC',
    description: 'Limites, productos/servicios, ubicaciones y exclusiones',
    icon: Target,
    collection: 'plan_alcance',
    color: 'blue',
  },
  {
    id: 'contexto',
    title: 'Contexto de la Organizacion',
    description: 'Analisis interno, externo y partes interesadas',
    icon: Globe,
    collection: 'plan_contexto',
    color: 'purple',
  },
  {
    id: 'estructura',
    title: 'Estructura Organizacional',
    description: 'Organigrama, roles y responsabilidades',
    icon: Users,
    collection: 'plan_estructura',
    color: 'orange',
  },
  {
    id: 'politicas',
    title: 'Politicas',
    description: 'Politica de calidad y otras politicas',
    icon: FileText,
    collection: 'plan_politicas',
    color: 'teal',
  },
];

const EXTRA_SECTIONS = [
  {
    id: 'amfe',
    title: 'AMFE - Riesgos',
    description: 'Analisis de riesgos y oportunidades',
    icon: AlertTriangle,
    href: '/planificacion-revision-direccion/amfe',
  },
  {
    id: 'reuniones',
    title: 'Reuniones de Revision',
    description: 'Actas y seguimiento de reuniones por la direccion',
    icon: Calendar,
    href: '/planificacion-revision-direccion/reuniones',
  },
  {
    id: 'historial',
    title: 'Auditoria de Cambios',
    description: 'Historico global de cambios en el modulo',
    icon: History,
    href: '/planificacion-revision-direccion/historial',
  },
];

const SECTION_COLOR_STYLES: Record<
  string,
  { iconBg: string; iconBgHover: string; iconText: string }
> = {
  emerald: {
    iconBg: 'bg-emerald-50',
    iconBgHover: 'group-hover:bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  blue: {
    iconBg: 'bg-blue-50',
    iconBgHover: 'group-hover:bg-blue-100',
    iconText: 'text-blue-600',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconBgHover: 'group-hover:bg-purple-100',
    iconText: 'text-purple-600',
  },
  orange: {
    iconBg: 'bg-orange-50',
    iconBgHover: 'group-hover:bg-orange-100',
    iconText: 'text-orange-600',
  },
  teal: {
    iconBg: 'bg-teal-50',
    iconBgHover: 'group-hover:bg-teal-100',
    iconText: 'text-teal-600',
  },
};

export default function PlanificacionDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});
  const [latestStrategicReport, setLatestStrategicReport] =
    useState<StrategicAnalysisReport | null>(null);
  const [creatingFromStrategic, setCreatingFromStrategic] = useState(false);

  const isOnboardingMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      new URLSearchParams(window.location.search).get('onboarding') === '1'
    );
  }, []);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    completitud: 0,
    cumplimiento: 0,
  });

  // Modal control para acciones rapidas desde el Hub
  const [activeModal, setActiveModal] = useState<{
    type: PlanCollectionType;
    icon: any;
    mode: 'create' | 'list';
  } | null>(null);

  useEffect(() => {
    if (user?.organization_id) {
      loadStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organization_id]);

  useEffect(() => {
    let mounted = true;
    const loadLatestStrategicReport = async () => {
      try {
        const res = await fetch('/api/strategic-analysis/reports?limit=1');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) {
          const reports = Array.isArray(json.reports) ? json.reports : [];
          setLatestStrategicReport(reports[0] ?? null);
        }
      } catch {
        if (mounted) setLatestStrategicReport(null);
      }
    };
    void loadLatestStrategicReport();
    return () => {
      mounted = false;
    };
  }, []);

  const loadStatuses = async () => {
    if (!user?.organization_id) return;

    try {
      setLoading(true);
      const statusMap: Record<string, SectionStatus> = {};
      const totalSections = SECTIONS.length;
      let sectionsWithVigente = 0;
      let sectionsWithData = 0;

      for (const section of SECTIONS) {
        // Obtenemos un poco mas de info para el dashboard
        const q = query(
          collection(db, section.collection),
          where('organization_id', '==', user.organization_id)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data() as PlanBase);

        // Ordenar en memoria para evitar requerir indice compuesto
        docs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const vigente = docs.find(d => d.estado === 'vigente');
        const count = docs.length;

        statusMap[section.id] = {
          id: section.id,
          hasVigente: !!vigente,
          hasBorrador: docs.some(d => d.estado === 'borrador'),
          count,
          lastUpdate: docs[0] ? new Date(docs[0].created_at) : undefined,
          versionVigente: vigente?.version_numero,
        };

        if (vigente) sectionsWithVigente++;
        if (count > 0) sectionsWithData++;
      }

      setStatuses(statusMap);
      setGlobalStats({
        completitud: Math.round((sectionsWithData / totalSections) * 100),
        cumplimiento: Math.round((sectionsWithVigente / totalSections) * 100),
      });
    } catch (error) {
      console.error('Error cargando estados:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRevisionFromStrategicReport = async () => {
    if (!latestStrategicReport) return;
    try {
      setCreatingFromStrategic(true);
      const res = await fetch(
        `/api/strategic-analysis/reports/${latestStrategicReport.id}/management-review-base`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear la base');
      window.location.href = '/planificacion-revision-direccion';
    } catch (error) {
      console.error('Error creando base desde analisis estrategico:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la base desde analisis estrategico'
      );
    } finally {
      setCreatingFromStrategic(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-gray-500">Analizando el Sistema de Gestion...</p>
        </div>
      </div>
    );
  }

  return (
    <ModulePageShell>
      <div className="space-y-8">
        <PageHeader
          title="Planificacion y Contexto"
          description="Hub centralizado para definir el ADN de la organizacion. Desde aqui puede gestionar identidad, contexto, riesgos y estructura."
          breadcrumbs={[
            { label: 'Planificacion y Revision por Direccion' },
            { label: 'Hub' },
          ]}
          actions={
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              ISO 9001:2015
            </Badge>
          }
        />

        <Card className="border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <StatusDonut
                completitud={globalStats.completitud}
                cumplimiento={globalStats.cumplimiento}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Base ejecutiva desde analisis estrategico
              </CardTitle>
              <CardDescription>
                Convierta el ultimo informe del Centro de Inteligencia Gerencial
                en borrador de revision por la direccion.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={createRevisionFromStrategicReport}
              disabled={!latestStrategicReport || creatingFromStrategic}
            >
              {creatingFromStrategic
                ? 'Creando base...'
                : 'Usar como base de revision'}
            </Button>
          </CardHeader>
          <CardContent>
            <StrategicAnalysisSummaryCard report={latestStrategicReport} compact />
          </CardContent>
        </Card>

        {isOnboardingMode && (
          <OnboardingStrategyBanner
            progressPercent={globalStats.completitud}
            completedSections={Math.round(
              (globalStats.completitud / 100) * SECTIONS.length
            )}
            totalSections={SECTIONS.length}
          />
        )}

        <div id="strategy-launch-card">
          <StrategyLaunchCard organizationId={user?.organization_id} />
        </div>

        <Section
          title="Definiciones Estrategicas"
          description="Gestione el contenido principal del sistema de gestion."
        >
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {SECTIONS.map(section => {
              const status = statuses[section.id];
              const Icon = section.icon;
              const colorStyles =
                SECTION_COLOR_STYLES[section.color] ??
                SECTION_COLOR_STYLES.emerald;
              // Calculo de estado visual
              const isComplete = status?.hasVigente;
              const isInProgress = !isComplete && status?.count > 0;
              const borderColor = isComplete
                ? 'border-l-4 border-l-emerald-500'
                : isInProgress
                  ? 'border-l-4 border-l-yellow-500'
                  : 'border-l-4 border-l-gray-300';

              return (
                <Card
                  key={section.id}
                  className={`overflow-hidden border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-200 group hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] ${borderColor}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div
                        className={`p-2.5 rounded-lg transition-colors ${colorStyles.iconBg} ${colorStyles.iconBgHover}`}
                      >
                        <Icon className={`w-6 h-6 ${colorStyles.iconText}`} />
                      </div>
                      {status?.hasVigente ? (
                        <Badge className="bg-green-100 text-green-800 shadow-sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Vigente v{status.versionVigente}
                        </Badge>
                      ) : status?.hasBorrador ? (
                        <Badge className="bg-yellow-100 text-yellow-800 shadow-sm">
                          En Borrador
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4 text-lg">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {section.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      {status?.count || 0} versiones registradas
                    </div>
                    {status?.lastUpdate && (
                      <div className="text-xs text-gray-400 mt-1 ml-6">
                        Actualizado: {status.lastUpdate.toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 flex gap-2 border-t mt-2 bg-slate-50/60 p-3">
                    {/* Boton: Ir a Seccion (Navegacion tradicional) */}
                    <Button
                      variant="ghost"
                      className="flex-1 text-xs h-8"
                      asChild
                    >
                      <Link
                        href={`/planificacion-revision-direccion/${section.id}`}
                      >
                        Ir a Seccion
                      </Link>
                    </Button>

                    {/* Boton: Ver Historial (Modal Rapido) */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 bg-white"
                      onClick={() =>
                        setActiveModal({
                          type: section.id as any,
                          icon: Icon,
                          mode: 'list',
                        })
                      }
                    >
                      Historial
                    </Button>

                    {/* Boton: Nueva Version (Accion Directa) */}
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs h-8 bg-slate-900 hover:bg-slate-800"
                      onClick={() =>
                        setActiveModal({
                          type: section.id as any,
                          icon: Icon,
                          mode: 'create',
                        })
                      }
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Nueva
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </Section>

        <Section
          title="Herramientas de Gestion"
          description="Accesos complementarios para riesgos, reuniones y auditoria de cambios."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {EXTRA_SECTIONS.map(section => {
              const Icon = section.icon;

              return (
                <Link key={section.id} href={section.href}>
                  <Card className="h-full cursor-pointer border border-dashed border-slate-200 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all hover:border-solid hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="p-3 rounded-full bg-blue-50 mt-1">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Section>

        {/* Modal Generico para Acciones Rapidas del Hub */}
        {activeModal && user?.organization_id && (
          <Dialog
            open={!!activeModal}
            onOpenChange={open => !open && setActiveModal(null)}
          >
            <DialogContent className="max-w-[80vw] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
              {/* El propio componente PlanificacionListing maneja su UI interna de modal si quiere,
                 pero aqui lo usamos en modo 'list' o 'create' que ya incluye su layout.
                 Para que se vea bien dentro del Dialog de Shadcn, podemos envolverlo en un div blanco.
             */}
              <div className="bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-end p-2 bg-slate-50 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveModal(null)}
                  >
                    Cerrar
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PlanificacionListing
                    tipo={activeModal.type}
                    organizationId={user.organization_id}
                    userEmail={user.email || ''}
                    icon={activeModal.icon}
                    initialMode={activeModal.mode}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ModulePageShell>
  );
}
