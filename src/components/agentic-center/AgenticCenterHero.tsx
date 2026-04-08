'use client';

import type { AgenticCenterDemoScenario } from '../../../content/agentic-center/demo-scenarios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AgenticCenterCase, AgenticCenterSummary } from '@/types/agentic-center';
import { Activity, ArrowRight, Bot, Radar, ShieldCheck } from 'lucide-react';

interface AgenticCenterHeroProps {
  cases: AgenticCenterCase[];
  demoScenarios: AgenticCenterDemoScenario[];
  selectedCaseId: string | null;
  onSelectCase: (value: string) => void;
  summary: AgenticCenterSummary | null;
  generatedAtLabel: string;
}

export default function AgenticCenterHero({
  cases,
  demoScenarios,
  selectedCaseId,
  onSelectCase,
  summary,
  generatedAtLabel,
}: AgenticCenterHeroProps) {
  const selectedCase = cases.find(item => item.id === selectedCaseId) ?? cases[0];
  const selectedScenario = demoScenarios.find(item => item.id === selectedCase?.id) ?? null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.20),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_45%,_#ecfeff_100%)] shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
      <div className="grid gap-10 px-6 py-8 md:px-8 lg:grid-cols-[1.4fr_0.95fr] lg:px-10 lg:py-10">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Centro Agentico
            </Badge>
            <Badge className="border-slate-200 bg-white/80 text-slate-600" variant="outline">
              {generatedAtLabel}
            </Badge>
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              IA accionable para operar mas rapido, con control humano en cada decision.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              El Centro Agentico resume lo que importa: una senal detectada, la accion recomendada
              y la aprobacion final antes de ejecutar sobre personas, terminales y procesos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                <Radar className="h-4 w-4 text-emerald-600" />
                Deteccion
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {summary?.jobs_activos ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-600">senales activas monitoreadas</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                <Bot className="h-4 w-4 text-sky-600" />
                Orquestacion
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {summary?.sagas_pausadas ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-600">flujos esperando decision humana</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                Ejecucion
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {summary?.terminales_con_aprobacion ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-600">terminales con accion en espera</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Escenario destacado
              </p>
              <p className="mt-2 text-xl font-semibold">
                {selectedScenario?.stageLabel ?? 'Vista operativa'}
              </p>
            </div>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="mt-6 space-y-3">
            <label className="text-sm text-slate-300">Cambiar escenario</label>
            <Select value={selectedCaseId ?? undefined} onValueChange={onSelectCase}>
              <SelectTrigger className="border-slate-700 bg-slate-900 text-left text-white">
                <SelectValue placeholder="Seleccionar caso visible" />
              </SelectTrigger>
              <SelectContent>
                {cases.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {demoScenarios.find(scenario => scenario.id === item.id)?.selectorLabel ?? item.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCase ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-200">
                  {selectedScenario?.selectorLabel ?? selectedCase.titulo}
                </p>
                <Badge className="border-white/10 bg-white/10 text-white" variant="outline">
                  {selectedCase.estado}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {selectedScenario?.heroTitle ?? selectedCase.descripcion}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {selectedScenario?.heroBody ??
                  'Cada escenario deja una accion concreta lista para aprobar y evidenciar.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>{selectedCase.evento_detectado.tipo}</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>{selectedCase.persona_target?.nombre ?? 'Proceso sin responsable visible'}</span>
              </div>
              {selectedScenario ? (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                    Valor para negocio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {selectedScenario.businessImpact}
                  </p>
                </div>
              ) : null}
              <Button
                className="mt-6 w-full justify-between bg-white text-slate-950 hover:bg-slate-100"
                type="button"
              >
                Ver decision guiada
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
