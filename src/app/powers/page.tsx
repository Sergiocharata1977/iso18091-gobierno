import Link from 'next/link';
import { headers } from 'next/headers';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Layers,
  MessageSquare,
  Palette,
  Puzzle,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CapabilityTier, PlatformCapability } from '@/types/plugins';

export const revalidate = 300;

type PublicCapabilitiesResponse = {
  success: boolean;
  data?: PlatformCapability[];
};

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  ClipboardCheck,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Layers,
  MessageSquare,
  Palette,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Zap,
};

const TIER_SECTIONS: Array<{
  tier: CapabilityTier;
  title: string;
  description: string;
}> = [
  {
    tier: 'base',
    title: 'Gestion y Calidad',
    description: 'Base operativa para ordenar el sistema, los documentos y la mejora continua.',
  },
  {
    tier: 'opcional',
    title: 'Comercial y CRM',
    description: 'Powers para ventas, seguimiento comercial y relacion con clientes.',
  },
  {
    tier: 'premium',
    title: 'Avanzado',
    description: 'Capacidades de mayor profundidad operativa, automatizacion y analitica.',
  },
  {
    tier: 'government',
    title: 'Gobierno Local',
    description: 'Powers orientados a gestion municipal, ciudadania y operacion territorial.',
  },
];

function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_9001APP_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const requestHeaders = headers();
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  if (!host) {
    throw new Error('No se pudo resolver la URL base publica para consultar capabilities');
  }

  return `${protocol}://${host}`;
}

async function getCapabilities() {
  const response = await fetch(`${getApiBaseUrl()}/api/public/capabilities`, {
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener el catalogo publico de Powers');
  }

  const payload = (await response.json()) as PublicCapabilitiesResponse;

  return Array.isArray(payload.data) ? payload.data : [];
}

function getTierBadgeClasses(tier: CapabilityTier) {
  switch (tier) {
    case 'base':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'opcional':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'premium':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'government':
      return 'border-teal-200 bg-teal-50 text-teal-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getTierLabel(tier: CapabilityTier) {
  switch (tier) {
    case 'base':
      return 'Base';
    case 'opcional':
      return 'Opcional';
    case 'premium':
      return 'Premium';
    case 'government':
      return 'Gobierno';
    default:
      return tier;
  }
}

function resolveIcon(iconName?: string) {
  if (!iconName) {
    return Puzzle;
  }

  return ICON_MAP[iconName] ?? Puzzle;
}

function PowerPreviewCard({ capability }: { capability: PlatformCapability }) {
  const Icon = resolveIcon(capability.icon);
  const marketingCopy =
    capability.long_description?.trim() || capability.description?.trim() || 'Power disponible';

  return (
    <Link
      href={`/powers/${encodeURIComponent(capability.id)}`}
      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-900 ring-1 ring-slate-200">
          <Icon className="h-6 w-6" />
        </div>
        <Badge className={cn('border', getTierBadgeClasses(capability.tier))}>
          {getTierLabel(capability.tier)}
        </Badge>
      </div>

      <div className="mt-5 space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">
          {capability.name}
        </h3>
        <p className="text-sm leading-6 text-slate-600">{marketingCopy}</p>
      </div>

      {capability.tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {capability.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-700">
        Ver Power
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default async function PowersPage() {
  const capabilities = await getCapabilities();

  const capabilitiesByTier = capabilities.reduce<Record<CapabilityTier, PlatformCapability[]>>(
    (accumulator, capability) => {
      accumulator[capability.tier].push(capability);
      return accumulator;
    },
    { base: [], opcional: [], premium: [], government: [] }
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8fafc_28%,#ffffff_100%)] text-slate-900">
      <section className="border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="max-w-3xl">
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
              Catalogo de Powers
            </Badge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Powers - Potencia tu sistema con Don Candido IA
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Activa solo lo que necesitas. Cada Power agrega un modulo especializado
              para extender tu operacion sin cargar el sistema con funciones que no usas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold">Activa por etapas</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Empeza por la base y suma capacidades cuando el proceso lo requiera.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span className="font-semibold">Especializados por necesidad</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Calidad, CRM, automatizacion y analitica en modulos independientes.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-sky-600" />
                <span className="font-semibold">Listos para activar</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El catalogo muestra unicamente Powers activos disponibles en la plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-14">
          {TIER_SECTIONS.map(section => {
            const items = capabilitiesByTier[section.tier];

            if (items.length === 0) {
              return null;
            }

            return (
              <section key={section.tier} className="space-y-6">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                      {section.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {section.description}
                    </p>
                  </div>
                  <Badge className={cn('w-fit border', getTierBadgeClasses(section.tier))}>
                    {items.length} {items.length === 1 ? 'Power' : 'Powers'}
                  </Badge>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(capability => (
                    <PowerPreviewCard key={capability.id} capability={capability} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-950/10 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Siguiente paso
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Necesitas algo especifico?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Hablemos de la combinacion de Powers que mejor encaja con tu sistema
                y tu ritmo de implementacion.
              </p>
            </div>
            <Link
              href="/#demo"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-50"
            >
              Habla con nosotros
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
