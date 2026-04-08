'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/design-system/layout/PageHeader';
import { Section } from '@/components/design-system/layout/Section';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { typography } from '@/components/design-system/tokens';
import { cn } from '@/lib/utils';
import CumplimientoTab from '../tabs/CumplimientoTab';
import GapsTab from '../tabs/GapsTab';
import MaturityTab from '../tabs/MaturityTab';
import MCPTab from '../tabs/MCPTab';
import RoadmapTab from '../tabs/RoadmapTab';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Calendar,
  CheckCircle,
  Compass,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

// ─── Banner educativo ──────────────────────────────────────────────────────────
type AccentColor = 'blue' | 'emerald' | 'amber' | 'violet' | 'slate';

const ACCENT_STYLES: Record<
  AccentColor,
  { wrapper: string; icon: string; title: string; body: string }
> = {
  slate: {
    wrapper:
      'bg-slate-50/80 border-slate-200/70 dark:bg-slate-900/40 dark:border-slate-700/50',
    icon: 'text-slate-400',
    title: 'text-slate-700 dark:text-slate-200',
    body: 'text-slate-600 dark:text-slate-300',
  },
  blue: {
    wrapper:
      'bg-blue-50/80 border-blue-200/70 dark:bg-blue-950/30 dark:border-blue-900/50',
    icon: 'text-blue-500',
    title: 'text-blue-900 dark:text-blue-100',
    body: 'text-blue-800/80 dark:text-blue-200/70',
  },
  emerald: {
    wrapper:
      'bg-emerald-50/80 border-emerald-200/70 dark:bg-emerald-950/30 dark:border-emerald-900/50',
    icon: 'text-emerald-500',
    title: 'text-emerald-900 dark:text-emerald-100',
    body: 'text-emerald-800/80 dark:text-emerald-200/70',
  },
  amber: {
    wrapper:
      'bg-amber-50/80 border-amber-200/70 dark:bg-amber-950/30 dark:border-amber-900/50',
    icon: 'text-amber-500',
    title: 'text-amber-900 dark:text-amber-100',
    body: 'text-amber-800/80 dark:text-amber-200/70',
  },
  violet: {
    wrapper:
      'bg-violet-50/80 border-violet-200/70 dark:bg-violet-950/30 dark:border-violet-900/50',
    icon: 'text-violet-500',
    title: 'text-violet-900 dark:text-violet-100',
    body: 'text-violet-800/80 dark:text-violet-200/70',
  },
};

function InfoBanner({
  icon: Icon,
  title,
  body,
  accent = 'slate',
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  accent?: AccentColor;
}) {
  const s = ACCENT_STYLES[accent];
  return (
    <BaseCard padding="sm" className={cn('border', s.wrapper, 'mb-5')}>
      <div className="flex gap-3">
        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', s.icon)} />
        <div>
          <p className={cn('text-sm font-semibold mb-1', s.title)}>{title}</p>
          <p className={cn('text-sm leading-relaxed', s.body)}>{body}</p>
        </div>
      </div>
    </BaseCard>
  );
}

// ─── Outer tabs coloreados (Sin IA / Con IA) ──────────────────────────────────
const OUTER_TAB_STYLES = {
  'sin-ia': {
    active:
      'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40 border-blue-600',
    inactive:
      'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-300',
    icon: <Layers className="w-4 h-4" />,
    label: 'Sin IA — Estado actual',
    sublabel: 'Métricas objetivas del SGC',
  },
  'con-ia': {
    active:
      'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 border-violet-600',
    inactive:
      'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:text-violet-700 dark:hover:text-violet-300',
    icon: <BrainCircuit className="w-4 h-4" />,
    label: 'Con IA — Análisis inteligente',
    sublabel: 'Don Cándido interpreta y actúa',
  },
} as const;

type OuterTabId = keyof typeof OUTER_TAB_STYLES;

// ─── Inner tabs coloreados (Cumplimiento / Madurez / Gaps / Roadmap) ─────────
const INNER_TAB_STYLES = {
  cumplimiento: {
    active:
      'border-b-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30',
    inactive:
      'border-b-2 border-transparent text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-emerald-400',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: 'Cumplimiento',
    dot: 'bg-emerald-500',
  },
  madurez: {
    active:
      'border-b-2 border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30',
    inactive:
      'border-b-2 border-transparent text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    label: 'Madurez',
    dot: 'bg-blue-500',
  },
  gaps: {
    active:
      'border-b-2 border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30',
    inactive:
      'border-b-2 border-transparent text-slate-500 hover:text-amber-600 hover:border-amber-300 dark:hover:text-amber-400',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Gaps',
    dot: 'bg-amber-500',
  },
  roadmap: {
    active:
      'border-b-2 border-teal-500 text-teal-700 dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/30',
    inactive:
      'border-b-2 border-transparent text-slate-500 hover:text-teal-600 hover:border-teal-300 dark:hover:text-teal-400',
    icon: <Compass className="w-3.5 h-3.5" />,
    label: 'Roadmap',
    dot: 'bg-teal-500',
  },
} as const;

type InnerTabId = keyof typeof INNER_TAB_STYLES;

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MonitorISOPage() {
  const [outerTab, setOuterTab] = useState<OuterTabId>('sin-ia');
  const [innerTab, setInnerTab] = useState<InnerTabId>('cumplimiento');

  return (
    <div className="space-y-6">
      {/* Header con breadcrumbs + botón Manual del DS */}
      <PageHeader
        eyebrow="Mi SGC"
        title="Monitor ISO 9001"
        subtitle="Centro unificado de seguimiento normativo — todo el estado de tu SGC en un solo lugar."
        breadcrumbs={[
          { label: 'Mi SGC', href: '/mi-sgc' },
          { label: 'Monitor ISO' },
        ]}
        manualRoute="/mi-sgc/monitor"
      />

      {/* ─── Intro educativa ─────────────────────────────────────────────────── */}
      <BaseCard className="bg-slate-50/80 border-slate-200/70 dark:bg-slate-900/40 dark:border-slate-700/50">
        <div className="flex gap-3">
          <BookOpen className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              ¿Para qué sirve este panel?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Este es tu centro de control para verificar el avance de tu
              Sistema de Gestión de Calidad. Encontrarás dos grupos:{' '}
              <strong>Sin IA</strong> muestra datos reales que tu equipo cargó
              en el sistema; <strong>Con IA</strong> usa inteligencia artificial
              para cruzar esos datos, detectar patrones y proponerte acciones
              concretas. Ambas vistas se complementan: primero mirás los datos,
              después la IA te dice qué hacer con ellos.
            </p>
          </div>
        </div>
      </BaseCard>

      {/* ─── Outer tabs coloreados ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(OUTER_TAB_STYLES) as OuterTabId[]).map(id => {
          const s = OUTER_TAB_STYLES[id];
          const isActive = outerTab === id;
          return (
            <button
              key={id}
              onClick={() => setOuterTab(id)}
              className={cn(
                'flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all duration-200',
                isActive ? s.active : s.inactive
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  isActive
                    ? 'bg-white/20'
                    : id === 'sin-ia'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                      : 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
                )}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{s.label}</p>
                <p
                  className={cn(
                    'text-xs mt-0.5 leading-tight',
                    isActive ? 'opacity-80' : 'opacity-60'
                  )}
                >
                  {s.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SIN IA
      ═══════════════════════════════════════════════════════════════════════ */}
      {outerTab === 'sin-ia' && (
        <div className="space-y-5">
          <InfoBanner
            icon={Layers}
            accent="blue"
            title="Monitores de estado — sin inteligencia artificial"
            body="Estos cuatro paneles muestran métricas calculadas directamente a partir de los datos que vos y tu equipo cargaron en el sistema. No hay interpretación ni sugerencias automáticas — solo datos objetivos. Son la base de cualquier Revisión por la Dirección y del proceso de certificación ISO 9001."
          />

          {/* Inner tabs coloreados */}
          <div className="border-b border-border">
            <div className="flex items-end gap-1 -mb-px">
              {(Object.keys(INNER_TAB_STYLES) as InnerTabId[]).map(id => {
                const s = INNER_TAB_STYLES[id];
                const isActive = innerTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setInnerTab(id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap rounded-t-lg',
                      isActive ? s.active : s.inactive
                    )}
                  >
                    {isActive && (
                      <span
                        className={cn('w-2 h-2 rounded-full shrink-0', s.dot)}
                      />
                    )}
                    {s.icon}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido por sub-tab */}
          <div className="pt-1">
            {innerTab === 'cumplimiento' && (
              <div className="space-y-4">
                <InfoBanner
                  icon={CheckCircle}
                  accent="emerald"
                  title="¿Qué mide el Cumplimiento?"
                  body="Aquí ves el estado de cumplimiento de tu SGC punto por punto. La norma ISO 9001 tiene 7 capítulos obligatorios (del 4 al 10). Por cada capítulo, el sistema evalúa cuántos requisitos tenés implementados con evidencia. Un proceso sin registros no cuenta como cumplido — la norma exige demostrarlo. Usá esta vista antes de una auditoría interna para identificar qué capítulos necesitás reforzar."
                />
                <CumplimientoTab />
              </div>
            )}

            {innerTab === 'madurez' && (
              <div className="space-y-4">
                <InfoBanner
                  icon={BarChart3}
                  accent="blue"
                  title="¿Qué mide la Madurez?"
                  body="La madurez va más allá del cumplimiento: mide la solidez y robustez de tu sistema. Un proceso puede estar 'implementado' pero ser frágil. La madurez evalúa tres dimensiones: que el proceso exista (30%), que tenga evidencias y auditorías (50%) y que tenga actividad reciente (20%). Organizaciones con alta madurez no solo cumplen la norma — tienen sistemas que funcionan solos, sin depender de que alguien recuerde hacerlo."
                />
                <MaturityTab />
              </div>
            )}

            {innerTab === 'gaps' && (
              <div className="space-y-4">
                <InfoBanner
                  icon={AlertTriangle}
                  accent="amber"
                  title="¿Qué son los Gaps?"
                  body="Un gap es una brecha entre lo que la norma ISO 9001 exige y lo que tu organización tiene implementado hoy. Por ejemplo: la norma requiere que definas indicadores de proceso (cláusula 9.1) pero si no tenés ninguno cargado, eso es un gap. Este panel los lista por prioridad — alta, media y baja — para que sepas exactamente qué resolver primero. Cerrar gaps de prioridad alta es el camino más directo hacia la certificación."
                />
                <GapsTab />
              </div>
            )}

            {innerTab === 'roadmap' && (
              <div className="space-y-4">
                <InfoBanner
                  icon={Compass}
                  accent="emerald"
                  title="¿Qué es el Roadmap?"
                  body="El camino hacia la certificación ISO 9001 tiene 6 fases ordenadas lógicamente: desde la base documental hasta la auditoría de certificación. El Roadmap es tu guía paso a paso: te muestra en qué fase estás, qué tareas tenés completadas y cuáles están pendientes. Cada tarea requerida debe completarse para desbloquear la siguiente fase. Don Cándido puede ayudarte a completar muchas de ellas de forma automática."
                />
                <RoadmapTab />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: CON IA
      ═══════════════════════════════════════════════════════════════════════ */}
      {outerTab === 'con-ia' && (
        <div className="space-y-6">
          <InfoBanner
            icon={BrainCircuit}
            accent="violet"
            title="Análisis inteligente — con inteligencia artificial"
            body="Don Cándido puede ir más allá de los números: cruza toda la información de tu SGC, detecta patrones, prioriza riesgos y propone acciones concretas. A diferencia de los monitores de estado (que solo muestran lo que pasó), estas herramientas te dicen qué deberías hacer — y en muchos casos, pueden hacerlo por vos."
          />

          {/* ─── Cards de herramientas IA ────────────────────────────────────── */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Evaluación IA */}
              <DomainCard
                title="Lanzar Evaluación IA"
                subtitle="Análisis completo on-demand"
                leading={
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                }
                status={{ label: 'Disponible', variant: 'success' }}
                footer={
                  <Link
                    href="/conocimientos"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Abrir Don Cándido
                  </Link>
                }
              >
                <p className={typography.p}>
                  Don Cándido analiza todos los datos de tu SGC en segundos y
                  genera un diagnóstico completo: qué procesos están en riesgo,
                  qué cláusulas necesitan atención urgente y cuáles son las tres
                  acciones más importantes que deberías tomar esta semana. Usalo
                  cuando necesitás una foto rápida y objetiva del estado de tu
                  sistema, o antes de una reunión de dirección.
                </p>
              </DomainCard>

              {/* Evaluaciones Periódicas */}
              <DomainCard
                title="Evaluaciones Periódicas"
                subtitle="Análisis automático programado"
                leading={
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                }
                status={{ label: 'Programable', variant: 'secondary' }}
                footer={
                  <Link
                    href="/revisiones-programadas"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Configurar revisiones
                  </Link>
                }
              >
                <p className={typography.p}>
                  En lugar de acordarte de analizar el SGC manualmente, podés
                  programar evaluaciones automáticas: mensual, trimestral o en
                  fechas específicas. El sistema ejecuta el análisis IA de forma
                  autónoma y te envía un reporte con hallazgos y alertas. Ideal
                  para organizaciones que quieren mantener el pulso del sistema
                  sin carga administrativa adicional.
                </p>
              </DomainCard>

              {/* Centro Agéntico */}
              <DomainCard
                title="Centro Agéntico + Alertas"
                subtitle="Tablero de control de la IA"
                leading={
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                }
                status={{ label: 'En vivo', variant: 'success' }}
                footer={
                  <Link
                    href="/centro-agentico"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Bot className="w-4 h-4" />
                    Ver Centro Agéntico
                  </Link>
                }
              >
                <p className={typography.p}>
                  Cuando Don Cándido detecta un problema (por ejemplo: una no
                  conformidad sin cerrar hace 30 días), puede actuar por vos:
                  crear una acción correctiva, asignarla a un responsable,
                  enviarle un recordatorio por WhatsApp. El Centro Agéntico es
                  donde ves todo eso: qué está haciendo la IA, qué está
                  esperando tu aprobación y qué alertas generó. Nunca perdés el
                  control de las acciones automáticas.
                </p>
              </DomainCard>

              {/* Panel MCP */}
              <DomainCard
                title="Automatizaciones MCP"
                subtitle="Tareas automatizadas en segundo plano"
                leading={
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                }
                status={{ label: 'Avanzado', variant: 'outline' }}
                footer={
                  <Link
                    href="/mi-sgc/automatizacion"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Ver Panel MCP
                  </Link>
                }
              >
                <p className={typography.p}>
                  Las automatizaciones MCP son tareas predefinidas que la IA
                  puede ejecutar de forma autónoma: exportar reportes a Google
                  Sheets, sincronizar datos entre módulos, enviar notificaciones
                  masivas. A diferencia del Centro Agéntico (decisiones de alto
                  nivel), el Panel MCP muestra el detalle técnico de cada
                  ejecución: duración, tasa de éxito, errores. Es para usuarios
                  avanzados que quieren monitorear la salud de las
                  automatizaciones.
                </p>
              </DomainCard>
            </div>
          </Section>

          {/* ─── Panel MCP en vivo ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px bg-border flex-1" />
              <span className={cn(typography.label, 'px-2')}>
                Panel MCP en vivo
              </span>
              <div className="h-px bg-border flex-1" />
            </div>
            <MCPTab />
          </div>
        </div>
      )}
    </div>
  );
}
