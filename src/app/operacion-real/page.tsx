import { PublicMarketingLayout } from '@/components/marketing/public-marketing-layout';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BriefcaseBusiness, ClipboardCheck, Factory, ShieldCheck, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const flows = [
  {
    title: 'Gerencia',
    icon: BriefcaseBusiness,
    description:
      'Ve paneles, desvio, vencimientos y capacidad de respuesta. No recibe una ISO decorativa sino una lectura de gestion.',
  },
  {
    title: 'Calidad',
    icon: ClipboardCheck,
    description:
      'Centraliza documentos, revisiones, auditorias y seguimiento. El sistema deja rastros y reduce memoria informal.',
  },
  {
    title: 'Operacion',
    icon: Factory,
    description:
      'Trabaja con tableros, tareas y responsables definidos. Menos improvisacion y mas circuito visible.',
  },
  {
    title: 'HSE',
    icon: ShieldCheck,
    description:
      'Monitorea incidentes, peligros y requisitos legales con una lectura grafica apta para seguimiento continuo.',
  },
  {
    title: 'Compras y proveedores',
    icon: ShoppingBag,
    description:
      'Recibe altas desde un portal publico ordenado y las integra a un proceso formal de homologacion.',
  },
];

const sequence = [
  'Se detecta una necesidad o desvio.',
  'El sistema la ubica en un circuito con responsable y estado.',
  'Los widgets, kanbans y revisiones muestran que sigue pendiente.',
  'La gerencia y calidad ven el avance sin perseguir por afuera.',
];

export default function OperacionRealPage() {
  return (
    <PublicMarketingLayout>
      <section className="border-b border-slate-200 bg-white pb-16 pt-28 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-none">
            Operacion real
          </Badge>
          <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Como el sistema ordena seguimiento, evidencia y decision en la operacion diaria.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
            Gerencia, calidad, operacion, HSE y compras trabajan sobre el mismo circuito, con estados,
            responsables y trazabilidad compartida.
          </p>
        </div>
      </section>

      <section className="bg-[#fdfbf7] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {flows.map(flow => {
              const Icon = flow.icon;
              return (
                <article key={flow.title} className="border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{flow.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{flow.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Secuencia de trabajo
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                La capa ISO se vuelve un circuito visible.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                El valor no esta en guardar documentos. Esta en que el sistema sostenga el seguimiento diario
                y deje trazabilidad cuando algo avanza, se frena o vence.
              </p>
            </div>

            <div className="space-y-4">
              {sequence.map((step, index) => (
                <div key={step} className="flex gap-4 border border-slate-200 bg-slate-50 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-2 text-base text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border border-slate-200 bg-slate-900 p-8 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Novedades
              </p>
              <h2 className="mt-2 text-2xl font-bold">Ver las ultimas capacidades incorporadas al producto.</h2>
            </div>
            <Link href="/novedades" className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              Ir a novedades
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicMarketingLayout>
  );
}
