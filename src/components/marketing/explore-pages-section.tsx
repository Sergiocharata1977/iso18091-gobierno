'use client';

import { ArrowRight, FolderKanban, Layers3, Sparkles } from 'lucide-react';
import Link from 'next/link';

const pages = [
  {
    href: '/producto',
    icon: Layers3,
    title: 'Producto y modulos',
    description:
      'Una vista ordenada de lo que ya hace la plataforma: HSE, revisiones, panel adaptativo, proveedor y mas.',
  },
  {
    href: '/operacion-real',
    icon: FolderKanban,
    title: 'Operacion real',
    description:
      'Como se usa en gerencia, calidad, operacion, compras y seguimiento diario sin caer en ISO de carpeta.',
  },
  {
    href: '/novedades',
    icon: Sparkles,
    title: 'Novedades 2026',
    description:
      'Las ultimas capacidades incorporadas para mostrar evolucion real del producto sin inflar la home.',
  },
];

export function ExplorePagesSection() {
  return (
    <section className="border-t border-slate-200 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Mapa del sitio comercial
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            La home explica la promesa. Estas paginas muestran el sistema en serio.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            En lugar de seguir agregando bloques abajo, separamos producto, operacion
            y novedades en recorridos mas claros para demo, ventas y decision.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {pages.map(page => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group flex h-full flex-col justify-between border border-slate-200 bg-slate-50 p-8 transition-all hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-lg"
              >
                <div>
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{page.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    {page.description}
                  </p>
                </div>

                <div className="mt-10 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Ver pagina
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
