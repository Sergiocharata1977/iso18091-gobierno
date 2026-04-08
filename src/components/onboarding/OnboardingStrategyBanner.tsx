'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Circle, Rocket } from 'lucide-react';
import Link from 'next/link';

interface OnboardingStrategyBannerProps {
  progressPercent?: number;
  completedSections?: number;
  totalSections?: number;
}

const PASOS = [
  { label: 'Selección de sistema y provisión', done: true },
  { label: 'Completar estrategia (esta pantalla)', done: false, active: true },
  { label: 'Generar documentos y activar roadmap', done: false },
];

export function OnboardingStrategyBanner({
  progressPercent = 0,
  completedSections = 0,
  totalSections = 5,
}: OnboardingStrategyBannerProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
              Setup inicial del SGC — Paso 2 de 3
            </p>
            <h2 className="mt-0.5 text-lg font-bold">
              Completá la base estratégica de tu organización
            </h2>
            <p className="mt-1 text-sm text-emerald-100">
              Completá las 5 secciones de planificación para que Don Cándido
              genere automáticamente los procesos base y modelos de documentos.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          <Button
            size="sm"
            className="bg-white text-emerald-800 hover:bg-emerald-50"
            asChild
          >
            <Link href="#strategy-launch-card">
              Ver checklist
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stepper de 3 pasos */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto">
        {PASOS.map((paso, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                paso.done
                  ? 'bg-white/20 text-white'
                  : paso.active
                    ? 'bg-white text-emerald-800'
                    : 'bg-white/10 text-emerald-200'
              }`}
            >
              {paso.done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {paso.label}
            </div>
            {idx < PASOS.length - 1 && (
              <ArrowRight className="h-3 w-3 flex-shrink-0 text-emerald-300" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {progressPercent > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-emerald-100 mb-1">
            <span>
              {completedSections}/{totalSections} secciones completadas
            </span>
            <span className="font-bold text-white">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
