import { PublicMarketingLayout } from '@/components/marketing/public-marketing-layout';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, CalendarClock, KanbanSquare, LayoutPanelTop, UserRoundPlus } from 'lucide-react';
import Link from 'next/link';

const updates = [
  {
    title: 'Dashboard HSE con Recharts',
    description:
      'Los KPI estaticos pasan a convivir con graficos para leer incidentes, peligros y cumplimiento legal con mas contexto.',
    icon: BarChart3,
  },
  {
    title: 'Motor de revisiones periodicas',
    description:
      'Nuevo backend y pagina dedicada para planificar revisiones programadas, marcar completadas y detectar vencidos.',
    icon: CalendarClock,
  },
  {
    title: 'Mi Panel con proximas revisiones',
    description:
      'El home interno suma widgets utiles y accesos rapidos segun las capabilities instaladas en cada organizacion.',
    icon: LayoutPanelTop,
  },
  {
    title: 'Kanbans configurables por modulo',
    description:
      'Acciones, hallazgos, auditorias, CRM, procesos y tareas pueden leer columnas desde esquema dinamico.',
    icon: KanbanSquare,
  },
  {
    title: 'Portal Proveedor publico por slug',
    description:
      'Cada tenant puede tener una pagina propia de alta de proveedores con branding y API publica controlada.',
    icon: UserRoundPlus,
  },
];

export default function NovedadesPage() {
  return (
    <PublicMarketingLayout>
      <section className="border-b border-slate-200 bg-slate-950 pb-16 pt-28 text-white lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 shadow-none">
            Novedades 2026
          </Badge>
          <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl">
            Ultimas capacidades incorporadas al producto para una operacion mas visible y trazable.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Estas actualizaciones muestran como evoluciona la plataforma en tableros, revisiones, widgets,
            configuracion y circuitos de proveedores.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-5">
            {updates.map((update, index) => {
              const Icon = update.icon;
              return (
                <article
                  key={update.title}
                  className="grid gap-6 border border-slate-200 bg-slate-50 p-6 shadow-sm lg:grid-cols-[80px_1fr_40px] lg:items-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Actualizacion {index + 1}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{update.title}</h2>
                    <p className="mt-3 text-base leading-relaxed text-slate-600">
                      {update.description}
                    </p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 text-slate-400 lg:block" />
                </article>
              );
            })}
          </div>

          <div className="mt-14 border border-slate-200 bg-[#fdfbf7] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ver recorrido completo
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Si queres el panorama general, volve a producto o miralo desde la operacion.
              </h2>
              <div className="flex gap-6 text-sm font-semibold text-slate-900">
                <Link href="/producto">Producto</Link>
                <Link href="/operacion-real">Operacion real</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicMarketingLayout>
  );
}
