'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  Pencil,
  Plus,
  Puzzle,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CapabilityTier,
  PlatformCapability,
  PlatformCapabilityStatus,
} from '@/types/plugins';

// ─── icon / color maps (same as client-side catalog) ─────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
  Puzzle,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  Wrench,
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
  base:       'Base',
  opcional:   'Opcional',
  premium:    'Premium',
  government: 'Gobierno',
};

const STATUS_META: Record<PlatformCapabilityStatus, { label: string; badge: string; dot: string }> = {
  active:     { label: 'Activo',     badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  available:  { label: 'Disponible', badge: 'border-teal-200   bg-teal-50   text-teal-700',     dot: 'bg-teal-500'    },
  beta:       { label: 'Beta',       badge: 'border-amber-200  bg-amber-50  text-amber-700',     dot: 'bg-amber-500'   },
  deprecated: { label: 'Deprecado',  badge: 'border-red-200    bg-red-50    text-red-700',       dot: 'bg-red-400'     },
};

// ─── tabs config ──────────────────────────────────────────────────────────────

type TabId = 'todos' | CapabilityTier;

const TABS: { id: TabId; label: string }[] = [
  { id: 'todos',      label: 'Todos'    },
  { id: 'base',       label: 'Base'     },
  { id: 'opcional',   label: 'Opcional' },
  { id: 'premium',    label: 'Premium'  },
  { id: 'government', label: 'Gobierno' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[name] ?? Puzzle;
}

// ─── card component ───────────────────────────────────────────────────────────

type CapabilityCardProps = {
  capability: PlatformCapability;
  deprecatingId: string | null;
  onDeprecate: (c: PlatformCapability) => void;
};

function CapabilityCard({ capability, deprecatingId, onDeprecate }: CapabilityCardProps) {
  const Icon  = getIcon(capability.icon ?? 'Puzzle');
  const color = COLOR_MAP[capability.color ?? 'slate'] ?? COLOR_MAP.slate;
  const sm    = STATUS_META[capability.status];
  const isBusy = deprecatingId === capability.id;
  const isDeprecated = capability.status === 'deprecated';

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
        isDeprecated
          ? 'border-red-100 opacity-70'
          : 'border-slate-200 hover:-translate-y-0.5 hover:shadow-md',
      ].join(' ')}
    >
      {/* clickable overlay → edit page */}
      <Link
        href={`/super-admin/capabilities/${capability.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Editar ${capability.name}`}
      />

      {/* header */}
      <div className="relative z-10 flex items-start gap-3 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg} ring-1 ${color.ring}`}
        >
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
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
            {capability.description}
          </p>
        </div>
      </div>

      {/* meta row */}
      <div className="relative z-10 mt-0 flex flex-wrap items-center gap-2 px-5 pb-2">
        <Badge variant="outline" className={sm.badge}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${sm.dot}`} />
          {sm.label}
        </Badge>
        <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
          {capability.id}
        </code>
        <span className="text-xs text-slate-400">v{capability.version}</span>
      </div>

      {/* deps */}
      {capability.dependencies && capability.dependencies.length > 0 && (
        <p className="relative z-10 mt-1 px-5 text-xs text-slate-400">
          Requiere:{' '}
          <span className="font-medium text-slate-600">
            {capability.dependencies.join(', ')}
          </span>
        </p>
      )}

      {/* actions footer */}
      <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/super-admin/capabilities/${capability.id}`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/super-admin/capabilities/${capability.id}/instalaciones`}>
              Ver instalaciones
            </Link>
          </Button>
        </div>

        {!isDeprecated && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={isBusy}
            onClick={() => onDeprecate(capability)}
          >
            {isBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Deprecar
          </Button>
        )}
      </div>
    </article>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminCapabilitiesPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const { toast } = useToast();

  const [capabilities,   setCapabilities]   = useState<PlatformCapability[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [search,         setSearch]         = useState('');
  const [activeTab,      setActiveTab]      = useState<TabId>('todos');
  const [statusFilter,   setStatusFilter]   = useState<'all' | PlatformCapabilityStatus>('all');
  const [deprecatingId,  setDeprecatingId]  = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.rol !== 'super_admin') { router.push('/dashboard'); return; }
    void fetchCapabilities();
  }, [user, router]);

  async function fetchCapabilities() {
    try {
      setLoading(true);
      setError(null);
      const res  = await fetch('/api/super-admin/capabilities', { cache: 'no-store' });
      const json = (await res.json()) as PlatformCapability[] | { data?: PlatformCapability[]; error?: string };

      if (!res.ok) {
        const msg = (!Array.isArray(json) && (json.error)) || 'No se pudo cargar el catalogo.';
        setError(msg);
        setCapabilities([]);
        return;
      }

      setCapabilities(Array.isArray(json) ? json : (json.data ?? []));
    } catch {
      setError('Error de conexion al cargar el catalogo de Powers.');
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeprecate(capability: PlatformCapability) {
    if (!window.confirm(`Deprecar "${capability.name}" (${capability.id})?`)) return;

    try {
      setDeprecatingId(capability.id);
      const res  = await fetch(`/api/super-admin/capabilities/${capability.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'deprecated' }),
      });
      const json = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        toast({ title: 'No se pudo deprecar', description: json.error || json.message, variant: 'destructive' });
        return;
      }

      setCapabilities(prev =>
        prev.map(item => item.id === capability.id ? { ...item, status: 'deprecated' } : item)
      );
      toast({ title: 'Power deprecado', description: `${capability.name} fue marcado como deprecado.` });
    } catch {
      toast({ title: 'Error de conexion', description: 'No se pudo deprecar el Power.', variant: 'destructive' });
    } finally {
      setDeprecatingId(null);
    }
  }

  // ── derived counts per tab ──────────────────────────────────────────────────
  const countByTier = useMemo(() => {
    const counts: Record<TabId, number> = { todos: 0, base: 0, opcional: 0, premium: 0, government: 0 };
    capabilities.forEach(c => {
      counts.todos++;
      counts[c.tier]++;
    });
    return counts;
  }, [capabilities]);

  // ── filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return capabilities.filter(c => {
      if (activeTab !== 'todos' && c.tier !== activeTab) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (q) return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      return true;
    });
  }, [capabilities, activeTab, statusFilter, search]);

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando catalogo de Powers...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Catalogo de Powers"
        description={`${capabilities.length} Powers en la plataforma`}
      />

      {/* error */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ID"
            className="pl-9"
          />
        </div>

        {/* status filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'available', 'beta', 'deprecated'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {s === 'all' ? 'Todos los estados' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        <Button asChild className="md:ml-auto shrink-0">
          <Link href="/super-admin/capabilities/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Power
          </Link>
        </Button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-xs',
                activeTab === tab.id
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-200/60 text-slate-500',
              ].join(' ')}
            >
              {countByTier[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
          No se encontraron Powers con los filtros actuales.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(capability => (
            <CapabilityCard
              key={capability.id}
              capability={capability}
              deprecatingId={deprecatingId}
              onDeprecate={handleDeprecate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
