'use client';

import Link from 'next/link';
import type React from 'react';
import {
  AlertTriangle,
  ArchiveRestore,
  Award,
  BarChart,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Palette,
  Puzzle,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  CapabilityTier,
  InstalledCapability,
  PlatformCapability,
} from '@/types/plugins';

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  ShieldCheck,
  DatabaseBackup,
  ArchiveRestore,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Layers,
  Settings,
  Calendar,
  MessageSquare,
  Award,
  Zap,
  BookOpen,
  Briefcase,
  Users,
  Bot,
  BarChart,
  BarChart3,
  CheckCircle,
  Compass,
  Palette,
  Server,
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  sky: 'bg-sky-100 text-sky-600',
  amber: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
  zinc: 'bg-zinc-100 text-zinc-600',
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  rose: 'bg-rose-100 text-rose-600',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  teal: 'bg-teal-100 text-teal-600',
};

const TIER_STYLES: Record<CapabilityTier, string> = {
  base: 'bg-emerald-100 text-emerald-700',
  opcional: 'bg-amber-100 text-amber-700',
  premium: 'bg-sky-100 text-sky-700',
  government: 'bg-teal-100 text-teal-700',
};

const TIER_LABELS: Record<CapabilityTier, string> = {
  base: 'Base',
  opcional: 'Opcional',
  premium: 'Premium',
  government: 'Gobierno',
};

export interface PowerCardProps {
  platform: PlatformCapability;
  installed?: InstalledCapability | null;
  onInstall: (capabilityId: string) => void;
  onToggle: (installedId: string, enabled: boolean) => void;
  onUninstall: (installedId: string) => void;
  loading?: boolean;
}

function resolveIcon(iconName: string): IconComponent {
  return ICON_MAP[iconName] || Puzzle;
}

function resolveColor(color?: string): string {
  if (!color) {
    return COLOR_MAP.slate;
  }

  return COLOR_MAP[color] || COLOR_MAP.slate;
}

function resolveMissingDependencies(
  platform: PlatformCapability,
  installed?: InstalledCapability | null
): string[] {
  if (installed || !platform.dependencies?.length) {
    return [];
  }

  return platform.dependencies;
}

export function PowerCard({
  platform,
  installed = null,
  onInstall,
  onToggle,
  onUninstall,
  loading = false,
}: PowerCardProps) {
  const Icon = resolveIcon(platform.icon);
  const iconColorClass = resolveColor(platform.color);
  const missingDependencies = resolveMissingDependencies(platform, installed);
  const isInstalled = Boolean(installed);
  const isEnabled = Boolean(installed?.enabled);
  const installedId = installed?.id;

  return (
    <Card className="h-full border-slate-200 shadow-sm transition-colors hover:border-slate-300">
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              iconColorClass
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base text-slate-900">
                {platform.name}
              </CardTitle>
              <Badge className={TIER_STYLES[platform.tier]}>
                {TIER_LABELS[platform.tier]}
              </Badge>
            </div>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              {platform.description}
            </p>
          </div>
        </div>

        {platform.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {platform.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {missingDependencies.length > 0 ? (
          <Badge className="w-fit bg-amber-100 text-amber-800">
            Requiere: {missingDependencies.join(', ')}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {!isInstalled ? (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="text-slate-500">Disponible</span>
              </>
            ) : isEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600">Inactivo</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isInstalled ? (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || missingDependencies.length > 0}
                onClick={() => onInstall(platform.id)}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Instalar
              </Button>
            ) : (
              <>
                <Button
                  variant={isEnabled ? 'ghost' : 'outline'}
                  size="sm"
                  disabled={loading}
                  onClick={() => installedId && onToggle(installedId, isEnabled)}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isEnabled ? 'Desactivar' : 'Activar'}
                </Button>

                {!isEnabled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={loading}
                    onClick={() => installedId && onUninstall(installedId)}
                  >
                    Desinstalar
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <Link
          href={`/capabilities/${platform.id}`}
          className="inline-flex text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Ver mas -&gt;
        </Link>
      </CardContent>
    </Card>
  );
}
