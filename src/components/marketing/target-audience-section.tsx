'use client';

import { useLanguage } from '@/components/marketing/language-context';
import Image from 'next/image';
import { Building2, Factory, ShieldCheck, TrendingUp } from 'lucide-react';

const icons = [TrendingUp, ShieldCheck, Factory, Building2];
const screenshotLabels = [
  'Procesos en marcha',
  'Operacion centralizada',
  'Documentos y control',
  'Trazabilidad activa',
];

export function TargetAudienceSection() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-slate-100 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t.targetAudience.title}
            </h2>
            <p className="mb-8 text-xl text-slate-600">
              {t.targetAudience.subtitle}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {t.targetAudience.items.map((item, index) => {
                const Icon = icons[index % icons.length];
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                      <h3 className="font-semibold text-slate-900">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <div className="absolute inset-0 grid grid-cols-2 gap-3 p-3">
              {[
                {
                  src: '/images/Screenshot_1.png',
                  alt: 'Vista general del sistema Don Candido IA',
                },
                {
                  src: '/images/Screenshot_2.png',
                  alt: 'Modulo operativo de Don Candido IA',
                },
                {
                  src: '/images/Screenshot_3.png',
                  alt: 'Gestion documental y tableros',
                },
                {
                  src: '/images/Screenshot_4.png',
                  alt: 'Seguimiento y trazabilidad del sistema',
                },
              ].map((shot, index) => (
                <div
                  key={shot.src}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    className="object-cover object-top"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    {screenshotLabels[index]}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 text-white">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Producto real
              </p>
              <p className="text-base font-semibold">
                Modulos 100% operativos: Procesos, Documentos, Auditorias,
                Hallazgos y RRHH.
              </p>
            </div>
          </div>
        </div>

        {/* Normas cubiertas por la plataforma */}
        <div className="mt-12 border-t border-slate-100 pt-8">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            Normas cubiertas por la plataforma
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'ISO 9001 · Calidad',
              'ISO 14001 · Medio Ambiente',
              'ISO 45001 · Seguridad y Salud',
              'ISO 27001/27002 · Seguridad Info',
              'ISO 18091 · Gobierno Local',
            ].map(norma => (
              <span
                key={norma}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-600"
              >
                {norma}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
