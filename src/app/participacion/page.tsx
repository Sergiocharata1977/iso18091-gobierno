'use client';

import { PublicSurveyExperience } from '@/components/surveys/PublicSurveyExperience';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BarChart3, Building2, ClipboardList, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const PARTICIPATION_LINES = [
  {
    title: 'Encuestas de satisfaccion',
    description:
      'Activa campañas para medir calidad percibida, experiencia de atencion y prioridades de mejora.',
    href: '/mejoras/encuestas',
    icon: BarChart3,
  },
  {
    title: 'Consultas publicas',
    description:
      'Publica formularios abiertos para recibir opiniones ciudadanas sobre normativas, obras o servicios.',
    href: '/mejoras/encuestas',
    icon: MessageSquare,
  },
  {
    title: 'Presupuesto participativo',
    description:
      'Recoge propuestas y preferencias vecinales para priorizar inversiones con trazabilidad.',
    href: '/mejoras/encuestas',
    icon: ClipboardList,
  },
];

function ParticipacionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return (
      <PublicSurveyExperience
        token={token}
        endpointBase="/api/public/cliente/encuesta"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_42%,_#f8fafc_100%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-100 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Gobierno local
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
                  Participacion ciudadana para encuestas, consultas publicas y presupuesto participativo
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  Este hub concentra la escucha ciudadana en un canal publico trazable.
                  Desde aqui podes lanzar encuestas, abrir consultas y vincular resultados con mejoras municipales.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-cyan-700 hover:bg-cyan-800">
                  <Link href="/mejoras/encuestas">
                    Gestionar encuestas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/ciudadanos">Ver ciudadanos</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/expedientes">Ir a expedientes</Link>
                </Button>
              </div>
            </div>

            <Card className="border-0 bg-slate-950 text-white shadow-none">
              <CardHeader>
                <CardDescription className="text-cyan-200">
                  Operacion recomendada
                </CardDescription>
                <CardTitle className="text-2xl">Circuito de escucha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                    <Users className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p>Defini el universo convocado y el tipo de encuesta ciudadana.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                    <MessageSquare className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p>Publica el link y recepciona respuestas desde un canal abierto.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                    <Building2 className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p>Convierte hallazgos en decisiones, backlog o acciones de mejora.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {PARTICIPATION_LINES.map(item => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="border-cyan-100 bg-white/90">
                <CardHeader className="space-y-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-slate-900">{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-600">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link
                    href={item.href}
                    className="inline-flex items-center text-sm font-medium text-cyan-800 hover:text-cyan-950"
                  >
                    Abrir modulo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default function ParticipacionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" /></div>}>
      <ParticipacionContent />
    </Suspense>
  );
}
