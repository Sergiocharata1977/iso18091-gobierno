import { PublicMarketingLayout } from '@/components/marketing/public-marketing-layout';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, KanbanSquare, LayoutGrid, ShieldPlus, UserRoundPlus } from 'lucide-react';
import Link from 'next/link';

const modules = [
  {
    title: 'Dashboard HSE con graficos',
    description:
      'Indicadores visibles y lectura rapida de incidentes, riesgos y requisitos legales sin depender de hojas dispersas.',
    icon: BarChart3,
    points: ['Incidentes por tipo', 'Peligros por nivel', 'Cumplimiento legal con tendencia'],
  },
  {
    title: 'Revisiones periodicas',
    description:
      'Calendario operativo para programar, ver pendientes, detectar vencidos y cerrar revisiones sin perseguir personas.',
    icon: ShieldPlus,
    points: ['Lista de pendientes', 'Alta y actualizacion', 'Proximas revisiones en Mi Panel'],
  },
  {
    title: 'Mi Panel adaptativo',
    description:
      'Acceso rapido a lo que cada usuario necesita segun capacidades instaladas y tareas proximas.',
    icon: LayoutGrid,
    points: ['Widget de revisiones', 'Accesos por capability', 'Lectura simple para cada rol'],
  },
  {
    title: 'Kanbans configurables',
    description:
      'Columnas dinamicas para auditorias, hallazgos, acciones, CRM, procesos y tareas, con fallback seguro.',
    icon: KanbanSquare,
    points: ['Menos hardcodeo', 'Mas adaptacion por organizacion', 'Misma logica operativa'],
  },
  {
    title: 'Portal Proveedor',
    description:
      'Registro publico por tenant para homologacion inicial, usando la identidad visual de cada organizacion.',
    icon: UserRoundPlus,
    points: ['Landing publica por slug', 'Formulario de alta', 'Entrada ordenada al circuito interno'],
  },
];

export default function ProductoPage() {
  return (
    <PublicMarketingLayout>
      <section className="border-b border-slate-200 bg-[#fdfbf7] pb-16 pt-28 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-none">
            Producto
          </Badge>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Modulos reales para operar calidad, HSE, revisiones y proveedores en un solo sistema.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
                Desde indicadores HSE hasta revisiones periodicas, panel adaptativo, kanbans configurables
                y portal proveedor: cada modulo suma control, trazabilidad y seguimiento visible.
              </p>
            </div>
            <div className="border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Vista general
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Cada capacidad esta pensada para bajar la norma a trabajo diario, responsables claros y
                decisiones con contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {modules.map(module => {
              const Icon = module.icon;
              return (
                <article key={module.title} className="border border-slate-200 bg-slate-50 p-8 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{module.title}</h2>
                      <p className="mt-3 text-base leading-relaxed text-slate-600">
                        {module.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {module.points.map(point => (
                      <span
                        key={point}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-14 flex flex-col gap-4 border border-slate-200 bg-slate-900 p-8 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Siguiente lectura
              </p>
              <h2 className="mt-2 text-2xl font-bold">Ver como estos modulos bajan a la operacion diaria.</h2>
            </div>
            <Link href="/operacion-real" className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              Ir a operacion real
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicMarketingLayout>
  );
}
