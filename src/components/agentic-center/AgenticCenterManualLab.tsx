'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FlaskConical, Radar, ShieldCheck, Workflow } from 'lucide-react';

const quickTests = [
  {
    title: 'Lineal',
    description: 'Crea una saga simple de 3 pasos para validar dependencias basicas.',
    outcome: 'Debes ver como un paso habilita al siguiente.',
  },
  {
    title: 'Human loop',
    description: 'Fuerza una pausa y prueba aprobacion o rechazo manual.',
    outcome: 'Debes ver la saga pasar a paused y luego continuar o fallar.',
  },
  {
    title: 'Compensacion',
    description: 'Provoca un fallo tardio para observar compensaciones pendientes.',
    outcome: 'Debes ver el error global y los pasos a deshacer.',
  },
] as const;

const manualSteps = [
  'Entrar a /dev/saga-playground y crear un escenario.',
  'Completar o fallar pasos manualmente desde los botones del playground.',
  'Volver al Centro Agentico y refrescar la vista para contrastar la capa ejecutiva con el motor.',
] as const;

export default function AgenticCenterManualLab() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_48%,_#eff6ff_100%)] shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">
                Laboratorio manual
              </Badge>
              <CardTitle className="mt-2 text-2xl text-slate-950">
                Probar la orquestacion a mano desde frontend
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          {quickTests.map(test => (
            <div
              key={test.title}
              className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{test.title}</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{test.description}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{test.outcome}</p>
            </div>
          ))}
          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Usa la UI existente
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                El playground ya crea sagas reales en Firestore para tu organizacion y permite
                simular `complete`, `fail`, `approve` y `reject` sin tocar Postman.
              </p>
            </div>
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/dev/saga-playground">
                Abrir Saga Playground
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-slate-200 bg-white/90 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-sky-600" />
            <CardTitle className="text-lg">Recorrido sugerido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {manualSteps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950 shadow-sm">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
            <div className="flex items-center gap-2 text-emerald-700">
              <Radar className="h-4 w-4" />
              <span className="font-medium">Que valida esta prueba</span>
            </div>
            <p className="mt-2">
              Deteccion, secuencia de pasos, pausa por aprobacion humana y evidencia de error o
              compensacion.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
            <div className="flex items-center gap-2 text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Importante</span>
            </div>
            <p className="mt-2">
              El Centro Agentico es una capa ejecutiva. Para operar el motor hoy, el punto manual
              correcto es el playground de sagas.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
