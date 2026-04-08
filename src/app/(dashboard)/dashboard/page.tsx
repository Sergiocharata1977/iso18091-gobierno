'use client';

import { HealthSummaryCard } from '@/components/dashboard/HealthSummaryCard';
import { OperationalHighlights } from '@/components/dashboard/OperationalHighlights';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { ModulePageShell } from '@/components/design-system';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Activity,
  AlertTriangle,
  BarChart,
  BarChart3,
  Briefcase,
  CheckCheck,
  CheckCircle,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';

type DashboardMetric = {
  title: string;
  value: string;
  change: string;
  trend: TrendDirection;
  subtext: string;
  icon: React.ReactNode;
};

type DashboardAction = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  meta: string;
  badge?: string;
};

type DashboardHighlight = {
  title: string;
  description: string;
  owner: string;
  dueLabel: string;
  priority: string;
  href: string;
  ctaLabel: string;
  tone: 'critical' | 'attention' | 'stable';
};

const metrics: DashboardMetric[] = [
  {
    title: 'OBJETIVOS',
    value: '85%',
    change: '+5%',
    trend: 'up',
    subtext: 'actualizado respecto del ultimo cierre',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    title: 'PERSONAL',
    value: '24',
    change: '+2',
    trend: 'up',
    subtext: 'dotacion activa con asignaciones vigentes',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'DOCUMENTOS',
    value: '42',
    change: '+8',
    trend: 'up',
    subtext: 'documentos vigentes bajo control',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: 'CONFORMIDAD',
    value: '92%',
    change: '+3%',
    trend: 'up',
    subtext: 'cumplimiento global del sistema',
    icon: <CheckCircle className="h-5 w-5" />,
  },
];

const quickActions: DashboardAction[] = [
  {
    title: 'Actualizar indicadores de calidad',
    description:
      'Entrar al tablero de objetivos y mediciones para cargar el cierre operativo.',
    icon: BarChart3,
    href: '/procesos/objetivos',
    meta: 'Impacta seguimiento y revision de direccion',
    badge: 'KPIs',
  },
  {
    title: 'Revisar procesos y registros',
    description:
      'Entrar al mapa operativo para validar responsables, tareas y vencimientos.',
    icon: Briefcase,
    href: '/procesos',
    meta: '12 procesos mapeados, 8 activos',
    badge: 'Operacion',
  },
  {
    title: 'Validar documentacion vigente',
    description:
      'Ir a control documental para revisar versiones, aprobaciones y publicaciones.',
    icon: FolderOpen,
    href: '/documentos',
    meta: '42 documentos vigentes',
    badge: 'Control',
  },
  {
    title: 'Preparar auditorias internas',
    description:
      'Abrir auditorias para ordenar plan, evidencias y proximos hitos.',
    icon: Shield,
    href: '/mejoras/auditorias',
    meta: 'Sostiene cumplimiento y trazabilidad',
    badge: 'Riesgo',
  },
  {
    title: 'Mover acciones correctivas',
    description:
      'Ir a hallazgos y seguimiento de acciones para cerrar desvios abiertos.',
    icon: ClipboardList,
    href: '/mejoras/acciones',
    meta: 'Reduce carga operativa pendiente',
    badge: 'Accion',
  },
  {
    title: 'Abrir reportes ejecutivos',
    description:
      'Consultar KPIs y comparativos para la toma de decision de hoy.',
    icon: BarChart,
    href: '/reportes',
    meta: 'Vista para direccion y seguimiento',
    badge: 'Insight',
  },
];

const highlights: DashboardHighlight[] = [
  {
    title: 'Mediciones pendientes de consolidacion',
    description:
      'Tres indicadores siguen sin cierre del periodo y afectan la lectura real del cumplimiento.',
    owner: 'Responsables de proceso',
    dueLabel: 'Resolver hoy',
    priority: 'Alta',
    href: '/procesos/mediciones',
    ctaLabel: 'Ver mediciones',
    tone: 'critical',
  },
  {
    title: 'Auditoria interna proxima',
    description:
      'La agenda de auditoria necesita evidencias y responsables confirmados para evitar reprocesos.',
    owner: 'Equipo auditor',
    dueLabel: '48 horas',
    priority: 'Media',
    href: '/mejoras/auditorias',
    ctaLabel: 'Preparar auditoria',
    tone: 'attention',
  },
  {
    title: 'Control documental estable',
    description:
      'Las ultimas actualizaciones quedaron publicadas y no hay cambios criticos bloqueando operacion.',
    owner: 'Calidad',
    dueLabel: 'Seguimiento semanal',
    priority: 'Estable',
    href: '/documentos',
    ctaLabel: 'Revisar documentos',
    tone: 'stable',
  },
];

export default function Dashboard() {
  return (
    <ModulePageShell
      contentClassName="space-y-8 py-8"
      maxWidthClassName="max-w-7xl"
    >
      <PageHeader
        eyebrow="Dashboard general"
        title="Panel de decision y operacion"
        description="Primero el estado del sistema, despues las prioridades que exigen criterio y finalmente las acciones que mueven el trabajo."
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <>
            <Badge variant="success" className="gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              Sistema estable
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Beta 2.0
            </Badge>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
        <HealthSummaryCard
          title="Sistema de Gestion de Calidad"
          status="Estable con focos puntuales"
          score="92%"
          summary="La operacion general se mantiene controlada, pero hay cierres de medicion y preparacion de auditoria que conviene resolver antes de la siguiente revision."
          focusLabel="Foco inmediato"
          focusValue="Cerrar mediciones pendientes"
          tone="healthy"
          metrics={[
            {
              label: 'Cumplimiento',
              value: '15/18',
              detail: 'objetivos en zona esperada',
            },
            {
              label: 'Cobertura',
              value: '24',
              detail: 'personas activas con estructura visible',
            },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <KPIStatCard
            label="Prioridades"
            value="3"
            icon={<ShieldAlert className="h-5 w-5" />}
            trend={{ value: '1 critica', direction: 'down' }}
            subtext="frentes que requieren seguimiento hoy"
            className="border-amber-200/70 bg-white/90"
          />
          <KPIStatCard
            label="Alertas"
            value="2"
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={{ value: 'sin bloqueo total', direction: 'neutral' }}
            subtext="desvios operativos visibles"
            className="border-slate-200 bg-white/90"
          />
          <KPIStatCard
            label="Ritmo"
            value="Activo"
            icon={<Activity className="h-5 w-5" />}
            trend={{ value: 'flujo sostenido', direction: 'up' }}
            subtext="el tablero esta listo para ejecutar"
            className="border-emerald-200/70 bg-white/90"
          />
        </div>
      </section>

      <OperationalHighlights items={highlights} />

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              KPIs operativos
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Indicadores para leer la situacion antes de actuar
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Senales cortas para control diario y seguimiento ejecutivo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => (
            <KPIStatCard
              key={metric.title}
              label={metric.title}
              value={metric.value}
              icon={metric.icon}
              trend={{ value: metric.change, direction: metric.trend }}
              subtext={metric.subtext}
              className="border-white/70 bg-white/90 shadow-sm"
            />
          ))}
        </div>
      </section>

      <QuickActionsPanel
        actions={quickActions.map(action => ({
          ...action,
          icon: <action.icon className="h-5 w-5" />,
        }))}
      />
    </ModulePageShell>
  );
}
