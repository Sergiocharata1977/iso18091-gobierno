import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
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
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CapabilityTier, PlatformCapability } from '@/types/plugins';

export const revalidate = 300;

type CapabilityResponse = {
  success: boolean;
  data?: PlatformCapability;
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

async function getCapability(slug: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/public/capabilities/${encodeURIComponent(slug)}`,
    {
      next: { revalidate },
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`No se pudo obtener el Power ${slug}`);
  }

  const payload = (await response.json()) as CapabilityResponse;

  if (!payload.data) {
    notFound();
  }

  return payload.data;
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
      return 'base';
    case 'opcional':
      return 'opcional';
    case 'premium':
      return 'premium';
    case 'government':
      return 'gobierno';
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

function getPanelHref() {
  return `${getApiBaseUrl()}/capabilities`;
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 text-slate-600">{children}</div>
    </section>
  );
}

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const capability = await getCapability(params.slug);

  return {
    title: `${capability.name} | Powers | Don Candido IA`,
    description:
      capability.long_description?.slice(0, 160) ||
      capability.description ||
      'Power de Don Candido IA',
    alternates: {
      canonical: `/powers/${params.slug}`,
    },
  };
}

export default async function PowerDetailPage({ params }: PageProps) {
  const capability = await getCapability(params.slug);
  const Icon = resolveIcon(capability.icon);
  const summary =
    capability.long_description?.trim() || capability.description?.trim() || capability.name;
  const features = capability.features ?? [];
  const benefits = capability.benefits ?? [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8fafc_28%,#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
        >
          <Link href="/" className="transition-colors hover:text-slate-900">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <Link href="/powers" className="transition-colors hover:text-slate-900">
            Powers
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="font-medium text-slate-900">{capability.name}</span>
        </nav>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_24%)] px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
                    <Icon className="h-8 w-8" />
                  </div>
                  <Badge className={cn('border', getTierBadgeClasses(capability.tier))}>
                    {getTierLabel(capability.tier)}
                  </Badge>
                </div>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  {capability.name}
                </h1>
                <p className="mt-5 text-lg leading-8 text-slate-600">{summary}</p>
              </div>

              <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-lg shadow-slate-950/10">
                <p className="text-sm font-medium text-emerald-300">Activacion inmediata</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Disponible para equipos que ya operan con Don Candido IA y quieren
                  extender el sistema con un modulo puntual.
                </p>
                <Link
                  href={getPanelHref()}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-50"
                >
                  Activalo desde tu panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-8">
            <InfoSection title="Para quien es">
              <p className="text-base leading-7">
                {capability.target_audience?.trim() ||
                  'Ideal para organizaciones que quieren incorporar esta capacidad en su operacion diaria sin complejidad adicional.'}
              </p>
            </InfoSection>

            <InfoSection title="Que incluye">
              {features.length > 0 ? (
                <ul className="space-y-3">
                  {features.map(feature => (
                    <li key={feature} className="flex items-start gap-3 text-base leading-7">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-7">
                  Este Power suma herramientas operativas listas para activarse desde el
                  panel.
                </p>
              )}
            </InfoSection>

            <InfoSection title="Beneficios">
              {benefits.length > 0 ? (
                <ul className="space-y-3">
                  {benefits.map(benefit => (
                    <li key={benefit} className="flex items-start gap-3 text-base leading-7">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-7">
                  Mejora la trazabilidad, reduce tareas manuales y acelera decisiones en el
                  proceso donde se activa.
                </p>
              )}
            </InfoSection>

            <InfoSection title="Como funciona">
              <p className="text-base leading-7">
                {capability.how_it_works?.trim() ||
                  'Se habilita como un modulo adicional dentro del ecosistema y aprovecha la configuracion existente del sistema.'}
              </p>
            </InfoSection>
          </div>

          <aside className="space-y-8">
            <InfoSection title="Disponibilidad">
              <div className="space-y-4 text-base leading-7">
                <p>
                  Este Power esta disponible en el plan{' '}
                  <span className="font-semibold capitalize text-slate-900">
                    {getTierLabel(capability.tier)}
                  </span>
                  .
                </p>
                {capability.dependencies && capability.dependencies.length > 0 ? (
                  <p>
                    Requiere{' '}
                    <span className="font-medium text-slate-900">
                      {capability.dependencies.join(', ')}
                    </span>{' '}
                    activos.
                  </p>
                ) : (
                  <p>No requiere dependencias previas para activarse.</p>
                )}
              </div>
            </InfoSection>

            {capability.tags.length > 0 ? (
              <InfoSection title="Etiquetas">
                <div className="flex flex-wrap gap-2">
                  {capability.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </InfoSection>
            ) : null}

            <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-xl shadow-slate-950/10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                CTA final
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                Activalo desde tu panel de control
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Si este Power encaja con tu operacion, podes habilitarlo desde el panel
                y seguir escalando el sistema sin friccion.
              </p>
              <Link
                href={getPanelHref()}
                className="mt-6 inline-flex items-center text-sm font-semibold text-white transition-colors hover:text-emerald-300"
              >
                Activalo desde tu panel de control
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
