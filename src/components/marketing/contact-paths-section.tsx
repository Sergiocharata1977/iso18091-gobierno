'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, CalendarClock, MessagesSquare } from 'lucide-react';

const paths = [
  {
    icon: Bot,
    title: 'Explora con IA',
    description:
      'Recorre casos de uso, automatizaciones y flujos reales para entender donde Don Candido genera impacto.',
  },
  {
    icon: MessagesSquare,
    title: 'Conversa primero',
    description:
      'Empieza por el chat del sitio si quieres una primera orientacion sin pasar por un formulario clasico.',
  },
  {
    icon: CalendarClock,
    title: 'Coordina una demo',
    description:
      'Cuando ya tengas contexto, solicita una demo guiada para revisar tu operacion y prioridades.',
  },
];

export function ContactPathsSection() {
  return (
    <section className="border-t border-slate-200 bg-[#f5f1e8] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-slate-300 bg-white/80 px-4 py-1 text-sm font-semibold text-slate-700">
              Primer contacto
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Empecemos por una conversacion, no por un formulario frio
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              La landing de Don Candido tiene que abrir una conversacion y
              mostrar criterio. Primero entiendes lo que resuelve, luego decides
              si quieres una demo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                <a href="#demo">
                  Ver demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-300 bg-white/80 text-slate-700 hover:bg-white"
              >
                <a href="#top">Seguir explorando</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {paths.map(path => {
              const Icon = path.icon;

              return (
                <article
                  key={path.title}
                  className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {path.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {path.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
