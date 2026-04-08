'use client';

import { useProcessMetrics } from '@/hooks/useProcessMetrics';
import { DEFAULT_PROCESS_MAP_CONFIG } from '@/lib/processMap/defaultConfig';
import { Activity, Network, Sparkles } from 'lucide-react';
import { ProcessLevelRow } from './ProcessLevelRow';

export function ProcessMapPanel() {
  const { metrics } = useProcessMetrics();
  const levels = [...DEFAULT_PROCESS_MAP_CONFIG.levels].sort(
    (a, b) => a.level - b.level
  );

  const totalProcesses = levels.reduce(
    (acc, level) => acc + level.items.filter(item => item.visible).length,
    0
  );
  const activeProcesses = levels.reduce(
    (acc, level) => acc + level.items.filter(item => item.visible && item.applies).length,
    0
  );
  const pendingProcesses = Object.values(metrics ?? {}).filter(
    metric => (metric.pending ?? 0) > 0
  ).length;

  return (
    <section className="relative isolate overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.14),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.98)_100%)] px-4 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6 sm:py-8 lg:px-10 lg:py-10 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.98)_100%)]">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent dark:via-emerald-800" />

      <div className="relative mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-8 dark:border-slate-800/80 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Super Menu - Arquitectura Operativa
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3 shadow-[0_12px_40px_rgba(16,185,129,0.10)] dark:border-emerald-900/60 dark:bg-slate-900/80">
              <Network className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                Mapa de Procesos
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Vista jerarquica del sistema de gestion alineada al lenguaje visual del
                producto. Cada bloque mantiene acceso directo al modulo correspondiente y
                conserva sus metricas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Niveles
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
              {levels.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Capas del mapa visual
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Procesos activos
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
              {activeProcesses}/{totalProcesses}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bloques operativos habilitados
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Alertas
              </p>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
              {pendingProcesses}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Procesos con pendientes
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          ISO 9001:2015 - Clausula 4.4
        </span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          Jerarquia centrada
        </span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          Navegacion por modulos
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {levels.map((level, idx) => (
          <ProcessLevelRow
            key={level.level}
            level={level}
            isLast={idx === levels.length - 1}
            metrics={metrics}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        Los procesos marcados como &quot;No aplica&quot; permanecen visibles como referencia
        de arquitectura, pero quedan deshabilitados para la organizacion actual.
      </p>
    </section>
  );
}
