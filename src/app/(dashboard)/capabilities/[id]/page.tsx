'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCapabilityInstall } from '@/hooks/useCapabilityInstall';
import { cn } from '@/lib/utils';
import type {
  CapabilityManifest,
  CapabilityTier,
  InstalledCapability,
  PlatformCapability,
} from '@/types/plugins';
import {
  AlertTriangle,
  ArchiveRestore,
  Award,
  BarChart,
  BarChart2,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Globe,
  Layers,
  Loader2,
  MessageSquare,
  Palette,
  Puzzle,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SYSTEM_ID = 'iso9001';

type IconComponent = React.ComponentType<{ className?: string }>;
type TabId =
  | 'descripcion'
  | 'funcionalidades'
  | 'dependencias'
  | 'configuracion';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type InstalledCapabilityWithPlatform = InstalledCapability & {
  platform_capability?: PlatformCapability | null;
};

type SimpleSettingsValue = string | number | boolean | null;
type SimpleSettingsSchema = Record<string, SimpleSettingsValue>;

const ICON_MAP: Record<string, IconComponent> = {
  AlertTriangle,
  ArchiveRestore,
  Award,
  BarChart,
  BarChart2,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Globe,
  Layers,
  MessageSquare,
  Palette,
  Puzzle,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wrench,
  Zap,
};

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
  },
  sky: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
  },
  slate: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-200',
  },
  zinc: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    ring: 'ring-zinc-200',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200',
  },
  rose: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    ring: 'ring-red-200',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    ring: 'ring-teal-200',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    ring: 'ring-purple-200',
  },
};

const TIER_STYLES: Record<CapabilityTier, string> = {
  base: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  opcional: 'border-amber-200 bg-amber-50 text-amber-700',
  premium: 'border-sky-200 bg-sky-50 text-sky-700',
  government: 'border-teal-200 bg-teal-50 text-teal-700',
};

const TIER_LABELS: Record<CapabilityTier, string> = {
  base: 'Base',
  opcional: 'Opcional',
  premium: 'Premium',
  government: 'Gobierno',
};

function resolveIcon(iconName?: string): IconComponent {
  if (!iconName) {
    return Puzzle;
  }

  return ICON_MAP[iconName] ?? Puzzle;
}

function resolveColor(color?: string) {
  if (!color) {
    return COLOR_MAP.slate;
  }

  return COLOR_MAP[color] ?? COLOR_MAP.slate;
}

function isSimpleSettingsSchema(
  schema: CapabilityManifest['settings_schema']
): schema is SimpleSettingsSchema {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  return Object.values(schema).every(value => {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  });
}

function normalizeSettingsDraft(
  schema: SimpleSettingsSchema,
  current: Record<string, unknown>
): SimpleSettingsSchema {
  return Object.fromEntries(
    Object.entries(schema).map(([key, fallbackValue]) => {
      const currentValue = current[key];

      if (
        currentValue === null ||
        typeof currentValue === 'string' ||
        typeof currentValue === 'number' ||
        typeof currentValue === 'boolean'
      ) {
        return [key, currentValue];
      }

      return [key, fallbackValue];
    })
  );
}

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, letter => letter.toUpperCase());
}

function mergeCatalog(
  available: PlatformCapability[],
  installed: InstalledCapabilityWithPlatform[]
) {
  const catalog = new Map<string, PlatformCapability>();

  available.forEach(capability => {
    catalog.set(capability.id, capability);
  });

  installed.forEach(capability => {
    if (capability.platform_capability) {
      catalog.set(capability.capability_id, capability.platform_capability);
    }
  });

  return catalog;
}

export default function CapabilityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { install, uninstall, toggle, loading: actionLoading } =
    useCapabilityInstall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformCap, setPlatformCap] = useState<PlatformCapability | null>(null);
  const [installedCap, setInstalledCap] = useState<InstalledCapability | null>(
    null
  );
  const [installedList, setInstalledList] = useState<
    InstalledCapabilityWithPlatform[]
  >([]);
  const [catalog, setCatalog] = useState<PlatformCapability[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('descripcion');
  const [settingsDraft, setSettingsDraft] = useState<SimpleSettingsSchema>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const canManage = ['admin', 'super_admin'].includes(user?.rol ?? '');

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [availableRes, installedRes] = await Promise.all([
        fetch(`/api/capabilities/available?system_id=${SYSTEM_ID}`, {
          cache: 'no-store',
        }),
        fetch(`/api/capabilities/installed?system_id=${SYSTEM_ID}`, {
          cache: 'no-store',
        }),
      ]);

      const [availableJson, installedJson] = (await Promise.all([
        availableRes.json(),
        installedRes.json(),
      ])) as [
        ApiResponse<PlatformCapability[]>,
        ApiResponse<InstalledCapabilityWithPlatform[]>,
      ];

      if (!availableRes.ok || !availableJson.success) {
        throw new Error(
          availableJson.error || 'No se pudieron obtener los Powers disponibles'
        );
      }

      if (!installedRes.ok || !installedJson.success) {
        throw new Error(
          installedJson.error || 'No se pudieron obtener los Powers instalados'
        );
      }

      const available = Array.isArray(availableJson.data) ? availableJson.data : [];
      const installed = Array.isArray(installedJson.data) ? installedJson.data : [];
      const mergedCatalog = mergeCatalog(available, installed);
      const matchedInstalled =
        installed.find(item => item.capability_id === params.id) ?? null;
      const matchedPlatform =
        mergedCatalog.get(params.id) ?? matchedInstalled?.platform_capability ?? null;

      setInstalledList(installed);
      setCatalog(Array.from(mergedCatalog.values()));
      setInstalledCap(matchedInstalled);
      setPlatformCap(matchedPlatform);

      if (!matchedPlatform) {
        setError('Power no encontrado');
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar la ficha del Power'
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!canManage) {
      setLoading(false);
      return;
    }

    void refreshData();
  }, [authLoading, canManage, refreshData]);

  const settingsSchema = useMemo(() => {
    return isSimpleSettingsSchema(platformCap?.manifest?.settings_schema)
      ? platformCap.manifest.settings_schema
      : null;
  }, [platformCap]);

  useEffect(() => {
    if (!installedCap || !settingsSchema) {
      setSettingsDraft({});
      return;
    }

    setSettingsDraft(normalizeSettingsDraft(settingsSchema, installedCap.settings));
  }, [installedCap, settingsSchema]);

  const tabs = useMemo<{ id: TabId; label: string }[]>(() => {
    const base: Array<{ id: TabId; label: string }> = [
      { id: 'descripcion' as const, label: 'Descripcion' },
      { id: 'funcionalidades' as const, label: 'Funcionalidades' },
      { id: 'dependencias' as const, label: 'Dependencias' },
    ];

    if (installedCap && platformCap?.manifest?.settings_schema) {
      base.push({ id: 'configuracion' as const, label: 'Configuracion' });
    }

    return base;
  }, [installedCap, platformCap]);

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) {
      setActiveTab('descripcion');
    }
  }, [activeTab, tabs]);

  const dependencyState = useMemo(() => {
    const installedMap = new Map<string, InstalledCapabilityWithPlatform>();

    installedList.forEach(capability => {
      installedMap.set(capability.capability_id, capability);
    });

    return (platformCap?.dependencies || []).map(dependencyId => {
      const installed = installedMap.get(dependencyId);
      return {
        id: dependencyId,
        installed: Boolean(installed),
        enabled: Boolean(installed?.enabled),
      };
    });
  }, [installedList, platformCap]);

  const dependents = useMemo(() => {
    if (!platformCap) {
      return [];
    }

    return catalog
      .filter(capability => capability.dependencies?.includes(platformCap.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog, platformCap]);

  const handleSaveSettings = async () => {
    if (!installedCap) {
      return;
    }

    try {
      setSavingSettings(true);

      const response = await fetch(
        `/api/capabilities/${installedCap.capability_id}/settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: settingsDraft }),
        }
      );

      const json = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar la configuracion');
      }

      toast({
        title: 'Configuracion guardada',
        description: 'Los settings del Power fueron actualizados.',
      });

      await refreshData();
    } catch (saveError) {
      toast({
        title: 'Error',
        description:
          saveError instanceof Error
            ? saveError.message
            : 'No se pudo guardar la configuracion',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando Power...
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
          <AlertDescription>
            Esta pantalla solo esta disponible para roles admin y super_admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error || !platformCap) {
    return (
      <div className="space-y-4 p-6 md:p-8">
        <Button variant="ghost" className="w-fit px-0 text-slate-600" asChild>
          <Link href="/capabilities">← Volver a Powers</Link>
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Power no encontrado'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const Icon = resolveIcon(platformCap.icon);
  const color = resolveColor(platformCap.color);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Button variant="ghost" className="w-fit px-0 text-slate-600" asChild>
        <Link href="/capabilities">← Volver a Powers</Link>
      </Button>

      <Card className="overflow-hidden border border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1',
                  color.bg,
                  color.ring
                )}
              >
                <Icon className={cn('h-8 w-8', color.text)} />
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold text-slate-900">
                    {platformCap.name}
                  </h1>
                  <Badge className={cn('border', TIER_STYLES[platformCap.tier])}>
                    {TIER_LABELS[platformCap.tier]}
                  </Badge>
                  {installedCap ? (
                    <Badge
                      className={cn(
                        'border',
                        installedCap.enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      )}
                    >
                      {installedCap.enabled ? 'Activo' : 'Inactivo'}
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-slate-600">{platformCap.description}</p>

                {platformCap.long_description ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {platformCap.long_description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {!installedCap ? (
                  <Button
                    disabled={actionLoading}
                    onClick={() => void install(platformCap.id).then(() => refreshData())}
                  >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Instalar Power
                </Button>
              ) : installedCap.enabled ? (
                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() =>
                    void toggle(installedCap.capability_id, true).then(() =>
                      refreshData()
                    )
                  }
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Desactivar
                </Button>
              ) : (
                <>
                  <Button
                    disabled={actionLoading}
                    onClick={() =>
                      void toggle(installedCap.capability_id, false).then(() =>
                        refreshData()
                      )
                    }
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Activar Power
                  </Button>
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() =>
                      void uninstall(installedCap.capability_id).then(() =>
                        refreshData()
                      )
                    }
                  >
                    Desinstalar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabId)}>
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-xl bg-slate-100 p-2">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-lg px-4 py-2 data-[state=active]:bg-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="descripcion" className="mt-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl">Descripcion</CardTitle>
              <CardDescription>
                Contexto operativo y forma de uso del Power.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Para quien
                </h2>
                <p className="text-sm leading-6 text-slate-700">
                  {platformCap.target_audience ||
                    'No hay informacion cargada sobre el publico objetivo.'}
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Como funciona
                </h2>
                <p className="text-sm leading-6 text-slate-700">
                  {platformCap.how_it_works ||
                    'No hay informacion cargada sobre el flujo operativo.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcionalidades" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Funcionalidades</CardTitle>
              </CardHeader>
              <CardContent>
                {platformCap.features && platformCap.features.length > 0 ? (
                  <ul className="space-y-3">
                    {platformCap.features.map(feature => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-slate-700"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay funcionalidades listadas para este Power.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Beneficios</CardTitle>
              </CardHeader>
              <CardContent>
                {platformCap.benefits && platformCap.benefits.length > 0 ? (
                  <ul className="space-y-3">
                    {platformCap.benefits.map(benefit => (
                      <li
                        key={benefit}
                        className="flex items-start gap-3 text-sm text-slate-700"
                      >
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay beneficios listados para este Power.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencias" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Requiere</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dependencyState.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {dependencyState.map(dependency => (
                        <Badge
                          key={dependency.id}
                          className={cn(
                            'border',
                            dependency.installed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          )}
                        >
                          {dependency.id}
                        </Badge>
                      ))}
                    </div>
                    {dependencyState.some(dependency => !dependency.installed) ? (
                      <p className="text-xs text-amber-700">
                        Instala las dependencias faltantes antes de activar este
                        Power.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Este Power no declara dependencias.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Requerido por</CardTitle>
              </CardHeader>
              <CardContent>
                {dependents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dependents.map(capability => (
                      <Badge key={capability.id} variant="outline">
                        {capability.id}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Ningun otro Power depende de este.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Industrias compatibles</CardTitle>
              </CardHeader>
              <CardContent>
                {platformCap.industries && platformCap.industries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {platformCap.industries.map(industry => (
                      <Badge key={industry.type} variant="outline">
                        {industry.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay industrias declaradas para este Power.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {installedCap && platformCap.manifest?.settings_schema ? (
          <TabsContent value="configuracion" className="mt-4">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Configuracion</CardTitle>
                <CardDescription>
                  Edita los settings operativos del Power.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsSchema ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(settingsSchema).map(([key, schemaValue]) => {
                        const currentValue = settingsDraft[key];

                        if (typeof schemaValue === 'boolean') {
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                            >
                              <div className="space-y-1">
                                <Label>{prettifyKey(key)}</Label>
                                <p className="text-xs text-slate-500">
                                  Valor booleano
                                </p>
                              </div>
                              <Switch
                                checked={Boolean(currentValue)}
                                disabled={savingSettings}
                                onCheckedChange={checked => {
                                  setSettingsDraft(current => ({
                                    ...current,
                                    [key]: checked,
                                  }));
                                }}
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key}>{prettifyKey(key)}</Label>
                            <Input
                              id={key}
                              type={typeof schemaValue === 'number' ? 'number' : 'text'}
                              value={
                                currentValue === null || currentValue === undefined
                                  ? ''
                                  : String(currentValue)
                              }
                              disabled={savingSettings}
                              onChange={event => {
                                const rawValue = event.target.value;
                                const nextValue =
                                  rawValue === ''
                                    ? null
                                    : typeof schemaValue === 'number'
                                      ? Number(rawValue)
                                      : rawValue;

                                setSettingsDraft(current => ({
                                  ...current,
                                  [key]: nextValue,
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                      <Button disabled={savingSettings} onClick={() => void handleSaveSettings()}>
                        {savingSettings ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                    El `settings_schema` existe pero no es un objeto plano de
                    strings, numeros o booleanos. Esta vista no intenta
                    renderizar estructuras complejas.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
