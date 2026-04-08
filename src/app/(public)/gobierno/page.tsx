import {
  ArrowRight,
  Building2,
  Eye,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const differentiators = [
  {
    title: 'ISO 18091 nativo',
    description:
      'Diagnostico de madurez en 5 dimensiones, plan de mejora automatico y camino hacia la certificacion.',
    Icon: Shield,
  },
  {
    title: 'Ciudadano en el centro',
    description:
      'Expedientes digitales con SLA, carta de servicios, NPS ciudadano y WhatsApp para tramites.',
    Icon: Users,
  },
  {
    title: 'Transparencia activa',
    description:
      'Presupuesto, compras, actos administrativos y KPIs publicables en portal ciudadano.',
    Icon: Eye,
  },
];

const audiences = [
  'Municipios',
  'Secretarias',
  'Organismos descentralizados',
  'Entes publicos',
];

export default function GobiernoPage() {
  return (
    <div className="bg-[#f8fafc]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-[#2563eb]/20 bg-[#2563eb]/10 px-4 py-1 text-sm font-semibold text-[#1e3a5f]">
              ISO 18091 · Gobierno Local
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#1e3a5f] sm:text-5xl">
              Certifica la gestion de tu municipio
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Don Candido es el primer sistema de gestion de calidad disenado
              para organismos publicos y municipios argentinos. ISO 18091 +
              atencion ciudadana + transparencia, en una sola plataforma.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro?edition=government"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e3a5f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#16304f]"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contacto?tipo=gobierno"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2563eb]/40 hover:text-[#2563eb]"
              >
                Ver demo
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(160deg,rgba(30,58,95,0.08),rgba(37,99,235,0.14))] p-8 shadow-[0_32px_90px_-60px_rgba(30,58,95,0.45)]">
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#1e3a5f]/20 bg-white/80 p-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1e3a5f]/10">
                <Building2 className="h-10 w-10 text-[#1e3a5f]" />
              </div>
              <p className="mt-6 text-xl font-semibold text-[#1e3a5f]">
                Plataforma municipal unificada
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                Gestion, evidencia y publicacion de indicadores en una
                experiencia preparada para equipos de gobierno.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1e3a5f]">
            Una edicion pensada para gobierno local
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Desde el diagnostico institucional hasta la transparencia hacia la
            ciudadania, cada modulo responde a necesidades reales de gestion
            publica.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {differentiators.map(({ title, description, Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.6)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb]/10">
                <Icon className="h-6 w-6 text-[#1e3a5f]" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
            Para quien
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {audiences.map(audience => (
              <div
                key={audience}
                className="rounded-full border border-slate-200 bg-[#f8fafc] px-5 py-3 text-sm font-medium text-[#1e3a5f]"
              >
                {audience}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="rounded-[32px] bg-[#1e3a5f] px-8 py-10 text-white shadow-[0_32px_90px_-60px_rgba(30,58,95,0.8)] lg:px-12 lg:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
            CTA final
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Sos intendente o director de gestion?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            Agenda una demo personalizada y en 30 minutos te mostramos como
            funciona.
          </p>
          <div className="mt-8">
            <Link
              href="/contacto?tipo=gobierno&utm=landing"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-slate-100"
            >
              Agendar demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
