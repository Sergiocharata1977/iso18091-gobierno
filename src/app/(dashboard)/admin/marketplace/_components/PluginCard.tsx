'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InstalledPlugin, PluginManifest, PluginTier } from '@/types/plugins';
import { Loader2, Puzzle, Settings, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

type PluginCardProps = {
  manifest: PluginManifest;
  installedPlugin?: InstalledPlugin | null;
  busy?: boolean;
  onInstall: (pluginId: string) => void;
};

const TIER_META: Record<
  PluginTier,
  { label: string; className: string }
> = {
  base: {
    label: 'Gratis',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  optional: {
    label: 'Plugin opcional',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  premium: {
    label: 'Premium',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
};

const CATEGORY_LABELS: Record<PluginManifest['identity']['category'], string> = {
  iso_quality: 'ISO 9001',
  iso_environment: 'ISO 14001',
  iso_hse: 'HSE',
  iso_sgsi: 'SGSI',
  iso_government: 'Gobierno',
  registry: 'Registros',
  finance: 'Finance',
  crm: 'CRM',
  dealer: 'Dealer',
  hr: 'RRHH',
  analytics: 'Analytics',
  integration: 'Integracion',
  security: 'Security',
};

function getPricingLabel(manifest: PluginManifest): string | null {
  if (manifest.identity.tier !== 'premium') {
    return null;
  }

  if (manifest.billing.price_code) {
    return `Plan ${manifest.billing.price_code}`;
  }

  switch (manifest.billing.model) {
    case 'subscription':
      return 'Suscripcion recurrente';
    case 'usage':
      return 'Precio por uso';
    case 'one_time':
      return 'Pago unico';
    default:
      return 'Requiere plan premium';
  }
}

export function PluginCard({
  manifest,
  installedPlugin,
  busy = false,
  onInstall,
}: PluginCardProps) {
  const router = useRouter();
  const isInstalled =
    Boolean(installedPlugin) && installedPlugin?.lifecycle !== 'removed';
  const priceLabel = getPricingLabel(manifest);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() =>
        router.push(`/admin/marketplace/${manifest.identity.plugin_id}`)
      }
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/admin/marketplace/${manifest.identity.plugin_id}`);
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            <Puzzle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                {manifest.identity.display_name}
              </h2>
              <Badge variant="outline" className="border-slate-200 bg-slate-50">
                {CATEGORY_LABELS[manifest.identity.category]}
              </Badge>
              <Badge
                variant="outline"
                className={TIER_META[manifest.identity.tier].className}
              >
                {TIER_META[manifest.identity.tier].label}
              </Badge>
            </div>
            <p className="line-clamp-3 text-sm text-slate-600">
              {manifest.identity.summary}
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={
            isInstalled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }
        >
          {isInstalled ? 'Instalado' : 'No instalado'}
        </Badge>
      </div>

      {priceLabel ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-sky-800">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{priceLabel}</span>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          v{manifest.versioning.plugin_version}
        </p>

        {isInstalled ? (
          <Button
            size="sm"
            variant="outline"
            onClick={event => {
              event.stopPropagation();
              router.push(`/admin/marketplace/${manifest.identity.plugin_id}`);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={event => {
              event.stopPropagation();
              onInstall(manifest.identity.plugin_id);
            }}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Instalar
          </Button>
        )}
      </div>
    </article>
  );
}
