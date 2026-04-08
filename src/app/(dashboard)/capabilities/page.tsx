'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CapabilityTier,
  InstalledCapability,
  PlatformCapability,
} from '@/types/plugins';
import {
  BarChart2,
  Bot,
  Brain,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe,
  Layers,
  Loader2,
  Lock,
  Puzzle,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const SYSTEM_ID = 'iso9001';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart2, Bot, Brain, Building2, Calendar, CheckCircle2, ClipboardCheck,
  FileText, Globe, Layers, Puzzle, Search, Settings, Shield, ShoppingCart, Users, Wrench,
};

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-700',     ring: 'ring-sky-200'     },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200'   },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-200'     },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-200'  },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-200'  },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-200'    },
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200'   },
};

const TIER_BADGE: Record<CapabilityTier, string> = {
  base:       'border-emerald-200 bg-emerald-50 text-emerald-700',
  opcional:   'border-amber-200   bg-amber-50   text-amber-700',
  premium:    'border-sky-200     bg-sky-50     text-sky-700',
  government: 'border-teal-200   bg-teal-50    text-teal-700',
};

const TIER_LABEL: Record<CapabilityTier, string> = {
  base: 'Base', opcional: 'Opcional', premium: 'Premium', government: 'Gobierno',
};

const STATUS_META = {
  active:    { label: 'Activo',           badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', dotClass: 'bg-emerald-500' },
  inactive:  { label: 'Inactivo',         badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',       dotClass: 'bg-slate-400'   },
  available: { label: 'Disponible',       badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',        dotClass: 'bg-amber-500'   },
  premium:   { label: 'Requiere upgrade', badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',              dotClass: 'bg-sky-500'     },
} as const;

// ─── vertical tabs ───────────────────────────────────────────────────────────

type VerticalId = 'todos' | 'iso_core' | 'comercial' | 'normas' | 'gobierno' | 'otros';

const VERTICAL_TABS: { id: VerticalId; label: string; description: string }[] = [
  { id: 'todos',     label: 'Todos',             description: 'Todos los Powers disponibles' },
  { id: 'iso_core',  label: 'ISO 9001',          description: 'Calidad y mejora continua' },
  { id: 'comercial', label: 'Comercial & CRM',   description: 'Gestión comercial, clientes y ventas' },
  { id: 'normas',    label: 'Normas Adicionales', description: 'HSE, SGSI, ISO 14001 / 45001 / 27001' },
  { id: 'gobierno',  label: 'Gobierno Local',    description: 'ISO 18091 y gestión pública' },
  { id: 'otros',     label: 'Otros',             description: 'IA, integraciones y análisis' },
];

/** Infers vertical from capability ID and category field */
function inferVertical(cap: PlatformCapability): VerticalId {
  // Use explicit category if available
  if (cap.category) {
    if (cap.category === 'iso_government') return 'gobierno';
    if (['crm', 'dealer', 'finance'].includes(cap.category)) return 'comercial';
    if (['iso_environment', 'iso_hse', 'iso_sgsi'].includes(cap.category)) return 'normas';
    if (cap.category === 'iso_quality') return 'iso_core';
    if (['analytics', 'integration', 'security', 'hr', 'registry'].includes(cap.category)) return 'otros';
  }

  // Fallback: infer from ID pattern
  const id = cap.id.toLowerCase();
  if (id.startsWith('gov_') || id.includes('18091')) return 'gobierno';
  if (id.startsWith('crm') || id.startsWith('dealer') || id.includes('scoring') || id.includes('whatsapp')) return 'comercial';
  if (id.includes('hse') || id.includes('14001') || id.includes('45001') || id.includes('sgsi') || id.includes('27001')) return 'normas';
  if (id.includes('iso_design') || id.includes('iso_infrastructure')) return 'iso_core';
  if (id.includes('ai') || id.includes('analytics') || id.includes('integration')) return 'otros';
  return 'iso_core';
}

// ─── types ────────────────────────────────────────────────────────────────────

type InstalledCapabilityWithPlatform = InstalledCapability & {
  platform_capability?: PlatformCapability | null;
};

type CapabilityResponse<T> = { success: boolean; data?: T; error?: string };

type CapabilityCardModel = {
  id: string;
  name: string;
  description: string;
  tier: CapabilityTier;
  icon: string;
  color: string;
  installed: boolean;
  enabled: boolean;
  locked: boolean;
  vertical: VerticalId;
};

const GOV_EDITION_IDS = [
  'gov_ciudadano_360', 'gov_expedientes', 'gov_service_catalog',
  'gov_transparencia', 'gov_participacion', 'gov_maturity_18091',
] as const;

const GOV_EDITION_FALLBACK: Record<
  (typeof GOV_EDITION_IDS)[number],
  { name: string; description: string; status: 'disponible' | 'proximamente' }
> = {
  gov_ciudadano_360:  { name: 'Ciudadano 360',       description: 'Vista integral del ciudadano, tramites, interacciones y contexto.',   status: 'disponible' },
  gov_expedientes:    { name: 'Expedientes',          description: 'Gestion de expedientes, estados, responsables y seguimiento.',        status: 'disponible' },
  gov_service_catalog:{ name: 'Catalogo de Servicios', description: 'Catalogo municipal de servicios, requisitos, tiempos y canales.',   status: 'disponible' },
  gov_transparencia:  { name: 'Transparencia',        description: 'Publicacion y control de informacion para transparencia activa.',     status: 'disponible' },
  gov_participacion:  { name: 'Participacion',        description: 'Gestion de iniciativas, consultas y participacion ciudadana.',        status: 'disponible' },
  gov_maturity_18091: { name: 'Madurez ISO 18091',   description: 'Evaluacion de madurez institucional con enfoque ISO 18091.',          status: 'disponible' },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] ?? Puzzle;
}

function mergeCapabilities(
  installed: InstalledCapabilityWithPlatform[],
  available: PlatformCapability[]
): CapabilityCardModel[] {
  const installedById = new Map(installed.map(item => [item.capability_id, item]));
  const catalog = new Map<string, PlatformCapability>();

  available.forEach(item => catalog.set(item.id, item));
  installed.forEach(item => {
    if (item.platform_capability) catalog.set(item.capability_id, item.platform_capability);
  });

  return Array.from(catalog.values())
    .map(platform => {
      const installedCapability = installedById.get(platform.id);
      const isPremiumLocked = platform.tier === 'premium' && !installedCapability;
      return {
        id: platform.id,
        name: platform.name,
        description: platform.description,
        tier: platform.tier,
        icon: platform.icon ?? 'Puzzle',
        color: platform.color ?? 'slate',
        installed: Boolean(installedCapability),
        enabled: Boolean(installedCapability?.enabled),
        locked: isPremiumLocked,
        vertical: inferVertical(platform),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// ─── card component ───────────────────────────────────────────────────────────

type CapabilityCardProps = {
  capability: CapabilityCardModel;
  submittingId: string | null;
  onInstall: (id: string) => void;
  onToggle: (id: string, enable: boolean) => void;
};

function CapabilityCard({ capability, submittingId, onInstall, onToggle }: CapabilityCardProps) {
  const isBusy = submittingId === capability.id;
  const Icon   = getIcon(capability.icon);
  const color  = COLOR_MAP[capability.color] ?? COLOR_MAP.slate;
  const status = capability.locked
    ? STATUS_META.premium
    : capability.installed && capability.enabled
      ? STATUS_META.active
      : capability.installed
        ? STATUS_META.inactive
        : STATUS_META.available;

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
        capability.locked
          ? 'border-sky-200/80'
          : 'border-slate-200 hover:-translate-y-0.5 hover:shadow-md',
      ].join(' ')}
    >
      {/* ── clickable overlay → detail page ── */}
      <Link
        href={`/capabilities/${capability.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Ver ficha de ${capability.name}`}
      />

      {capability.locked ? (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-sky-200 bg-sky-50 p-2 text-sky-700">
          <Lock className="h-4 w-4" />
        </div>
      ) : null}

      {/* body — relative z-10 so text is selectable / readable above the link */}
      <div className="relative z-10 flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg} ring-1 ${color.ring}`}>
            <Icon className={`h-5 w-5 ${color.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                {capability.name}
              </h2>
              <Badge variant="outline" className={TIER_BADGE[capability.tier]}>
                {TIER_LABEL[capability.tier]}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{capability.description}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline" className={status.badgeClass}>
            <span className={`mr-1.5 h-2 w-2 rounded-full ${status.dotClass}`} />
            {status.label}
          </Badge>
        </div>
      </div>

      {/* footer actions — z-10 and e.stopPropagation to not trigger card link */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {capability.locked ? (
            <Button size="sm" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50" asChild>
              <Link href="/contacto" onClick={e => e.stopPropagation()}>Ver plan Premium</Link>
            </Button>
          ) : capability.installed ? (
            <Button
              size="sm"
              variant={capability.enabled ? 'outline' : 'default'}
              disabled={isBusy}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(capability.id, !capability.enabled); }}
            >
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {capability.enabled ? 'Desactivar' : 'Activar'}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isBusy}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onInstall(capability.id); }}
            >
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Instalar
            </Button>
          )}
        </div>

        <span className="text-sm font-medium text-sky-700 group-hover:underline">
          Ver ficha →
        </span>
      </div>
    </article>
  );
}

// ─── section component ────────────────────────────────────────────────────────

function CapabilitySection({
  title, count, items, emptyLabel, submittingId, onInstall, onToggle,
}: {
  title: string; count: number; items: CapabilityCardModel[]; emptyLabel: string;
  submittingId: string | null; onInstall: (id: string) => void; onToggle: (id: string, enable: boolean) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Badge variant="outline" className="border-slate-200 bg-slate-50">{count}</Badge>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(item => (
            <CapabilityCard
              key={item.id} capability={item} submittingId={submittingId}
              onInstall={onInstall} onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

// ─── gov edition helpers ──────────────────────────────────────────────────────

function getGovEditionStatus(
  capability?: CapabilityCardModel,
  fallbackStatus: 'disponible' | 'proximamente' = 'disponible'
) {
  if (capability?.installed && capability.enabled)
    return { label: 'Activo',     className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (capability)
    return { label: 'Disponible', className: 'border-sky-200 bg-sky-50 text-sky-700' };
  if (fallbackStatus === 'proximamente')
    return { label: 'Proximamente', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { label: 'Disponible', className: 'border-sky-200 bg-sky-50 text-sky-700' };
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default function CapabilitiesMarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [installed,     setInstalled]     = useState<InstalledCapabilityWithPlatform[]>([]);
  const [available,     setAvailable]     = useState<PlatformCapability[]>([]);
  const [search,        setSearch]        = useState('');
  const [activeVertical, setActiveVertical] = useState<VerticalId>('todos');
  const [submittingId,  setSubmittingId]  = useState<string | null>(null);

  const canManage = ['admin', 'super_admin'].includes(user?.rol ?? '');

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [installedRes, availableRes] = await Promise.all([
        fetch(`/api/capabilities/installed?system_id=${SYSTEM_ID}`, { cache: 'no-store' }),
        fetch(`/api/capabilities/available?system_id=${SYSTEM_ID}`,  { cache: 'no-store' }),
      ]);

      const [installedJson, availableJson] = (await Promise.all([
        installedRes.json(), availableRes.json(),
      ])) as [
        CapabilityResponse<InstalledCapabilityWithPlatform[]>,
        CapabilityResponse<PlatformCapability[]>,
      ];

      if (!installedRes.ok || !installedJson.success) throw new Error(installedJson.error || 'No se pudieron obtener las capabilities instaladas');
      if (!availableRes.ok || !availableJson.success) throw new Error(availableJson.error || 'No se pudieron obtener las capabilities disponibles');

      setInstalled(Array.isArray(installedJson.data) ? installedJson.data : []);
      setAvailable(Array.isArray(availableJson.data) ? availableJson.data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el marketplace de Powers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) { setLoading(false); return; }
    void refreshData();
  }, [authLoading, canManage]);

  const runMutation = async (
    capabilityId: string,
    config: { url: string; method: 'POST' | 'PUT'; body: Record<string, unknown>; successTitle: string; successDescription: string; fallbackError: string }
  ) => {
    try {
      setSubmittingId(capabilityId);
      const response = await fetch(config.url, { method: config.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.body) });
      const json = (await response.json()) as CapabilityResponse<unknown>;
      if (!response.ok || !json.success) throw new Error(json.error || config.fallbackError);
      toast({ title: config.successTitle, description: config.successDescription });
      await refreshData();
    } catch (mutationError) {
      toast({ title: 'Error', description: mutationError instanceof Error ? mutationError.message : config.fallbackError, variant: 'destructive' });
    } finally {
      setSubmittingId(current => current === capabilityId ? null : current);
    }
  };

  const handleInstall = (capabilityId: string) => {
    void runMutation(capabilityId, {
      url: '/api/capabilities/install', method: 'POST',
      body: { capability_id: capabilityId, system_id: SYSTEM_ID, enabled: true },
      successTitle: 'Power instalado', successDescription: 'El Power quedó activo en el tenant.',
      fallbackError: 'No se pudo instalar el Power',
    });
  };

  const handleToggle = (capabilityId: string, enable: boolean) => {
    void runMutation(capabilityId, {
      url: `/api/capabilities/${capabilityId}/toggle`, method: 'PUT',
      body: { enabled: enable },
      successTitle: enable ? 'Power activado' : 'Power desactivado',
      successDescription: enable ? 'El Power vuelve a estar operativo.' : 'El Power quedó instalado pero inactivo.',
      fallbackError: 'No se pudo actualizar el Power',
    });
  };

  const allCapabilities = useMemo(() => mergeCapabilities(installed, available), [installed, available]);

  const filteredCapabilities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allCapabilities.filter(capability => {
      if (activeVertical !== 'todos' && capability.vertical !== activeVertical) return false;
      if (!query) return true;
      return capability.name.toLowerCase().includes(query);
    });
  }, [allCapabilities, search, activeVertical]);

  const countByVertical = useMemo(() => {
    const counts: Record<VerticalId, number> = { todos: 0, iso_core: 0, comercial: 0, normas: 0, gobierno: 0, otros: 0 };
    allCapabilities.forEach(c => { counts.todos++; counts[c.vertical]++; });
    return counts;
  }, [allCapabilities]);

  const activeCapabilities    = useMemo(() => filteredCapabilities.filter(c => c.installed && c.enabled), [filteredCapabilities]);
  const availableCapabilities = useMemo(() => filteredCapabilities.filter(c => !c.locked && ((c.installed && !c.enabled) || !c.installed)), [filteredCapabilities]);
  const premiumCapabilities   = useMemo(() => filteredCapabilities.filter(c => c.locked), [filteredCapabilities]);

  const govEditionCapabilities = useMemo(() => {
    return GOV_EDITION_IDS.map(id => {
      const capability = allCapabilities.find(item => item.id === id);
      const fallback   = GOV_EDITION_FALLBACK[id];
      return { id, name: capability?.name || fallback.name, description: capability?.description || fallback.description, status: getGovEditionStatus(capability, fallback.status) };
    });
  }, [allCapabilities]);

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando Powers...
          </div>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 md:p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>Esta pantalla solo está disponible para roles admin y super_admin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader title="Powers" description="Potenciá tu sistema con módulos adicionales" />

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre" className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              {activeCapabilities.length} activos
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
              {availableCapabilities.length} disponibles
            </Badge>
          </div>
        </div>
      </section>

      {/* vertical tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {VERTICAL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveVertical(tab.id)}
            className={[
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeVertical === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
            <span className={['rounded-full px-1.5 py-0.5 text-xs', activeVertical === tab.id ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-500'].join(' ')}>
              {countByVertical[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* vertical description */}
      {activeVertical !== 'todos' && (
        <p className="text-sm text-slate-500">
          {VERTICAL_TABS.find(t => t.id === activeVertical)?.description}
        </p>
      )}

      {/* sections por estado */}
      <CapabilitySection
        title={`Activos (${activeCapabilities.length})`} count={activeCapabilities.length}
        items={activeCapabilities} emptyLabel="No hay Powers activos para la búsqueda actual."
        submittingId={submittingId} onInstall={handleInstall} onToggle={handleToggle}
      />
      <CapabilitySection
        title={`Disponibles para activar (${availableCapabilities.length})`} count={availableCapabilities.length}
        items={availableCapabilities} emptyLabel="No hay Powers disponibles para activar en este momento."
        submittingId={submittingId} onInstall={handleInstall} onToggle={handleToggle}
      />
      <CapabilitySection
        title={`Premium (${premiumCapabilities.length})`} count={premiumCapabilities.length}
        items={premiumCapabilities} emptyLabel="No hay Powers premium pendientes de upgrade."
        submittingId={submittingId} onInstall={handleInstall} onToggle={handleToggle}
      />

      {/* gobierno edition — only show in "todos" or "gobierno" tab */}
      {(activeVertical === 'todos' || activeVertical === 'gobierno') && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Edicion Gobierno Local</h2>
            <Badge className="border border-teal-200 bg-teal-50 text-teal-700">{govEditionCapabilities.length}</Badge>
            <p className="text-sm text-slate-500">Registro curado de capabilities gov_* para operacion municipal.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {govEditionCapabilities.map(item => (
              <Link key={item.id} href={`/capabilities/${item.id}`} className="block">
                <article className="h-full rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    </div>
                    <Badge className={item.status.className}>{item.status.label}</Badge>
                  </div>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-teal-700">{item.id}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
