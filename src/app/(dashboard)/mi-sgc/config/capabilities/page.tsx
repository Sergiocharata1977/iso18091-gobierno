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
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import type {
  CapabilityManifest,
  CapabilityTier,
  InstalledCapability,
  PlatformCapabilityStatus,
  PlatformCapability,
} from '@/types/plugins';
import {
  AlertTriangle,
  Layers,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const SYSTEM_ID = 'iso9001';
const TIER_ORDER: CapabilityTier[] = [
  'base',
  'opcional',
  'premium',
  'government',
];

const TIER_META: Record<
  CapabilityTier,
  {
    title: string;
    description: string;
    badgeClass: string;
  }
> = {
  base: {
    title: 'Base',
    description:
      'Capabilities nucleares del sistema. Normalmente vienen instaladas.',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  opcional: {
    title: 'Opcionales',
    description: 'Se pueden instalar o activar segun la operacion del tenant.',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  premium: {
    title: 'Premium',
    description:
      'Extensiones avanzadas sujetas a licencia o decision comercial.',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  government: {
    title: 'Gobierno',
    description:
      'Capabilities orientadas a sector publico y operacion de gobierno local.',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-700',
  },
};

type InstalledCapabilityWithPlatform = InstalledCapability & {
  platform_capability?: PlatformCapability | null;
};

type CapabilityResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type CapabilityUiStatus = 'available' | 'enabled' | 'disabled' | 'installed';

type CapabilityCardModel = {
  id: string;
  name: string;
  description: string;
  tier: CapabilityTier;
  platformStatus: PlatformCapabilityStatus;
  status: CapabilityUiStatus;
  enabled: boolean;
  installed: boolean;
  installedAt?: Date | null;
  updatedAt?: Date | null;
  tags: string[];
  dependencies: string[];
  dependents: string[];
  datasets: string[];
  settingsSchema?: Record<string, unknown>;
  settings: Record<string, unknown>;
};

const GOV_EDITION_IDS = [
  'gov_ciudadano_360',
  'gov_expedientes',
  'gov_service_catalog',
  'gov_transparencia',
  'gov_participacion',
  'gov_maturity_18091',
] as const;

const GOV_EDITION_FALLBACK: Record<
  (typeof GOV_EDITION_IDS)[number],
  { name: string; description: string; status: 'disponible' | 'proximamente' }
> = {
  gov_ciudadano_360: {
    name: 'Ciudadano 360',
    description: 'Vista integral del ciudadano, tramites, interacciones y contexto.',
    status: 'disponible',
  },
  gov_expedientes: {
    name: 'Expedientes',
    description: 'Gestion de expedientes, estados, responsables y seguimiento.',
    status: 'disponible',
  },
  gov_service_catalog: {
    name: 'Catalogo de Servicios',
    description: 'Catalogo municipal de servicios, requisitos, tiempos y canales.',
    status: 'disponible',
  },
  gov_transparencia: {
    name: 'Transparencia',
    description: 'Publicacion y control de informacion para transparencia activa.',
    status: 'proximamente',
  },
  gov_participacion: {
    name: 'Participacion',
    description: 'Gestion de iniciativas, consultas y participacion ciudadana.',
    status: 'proximamente',
  },
  gov_maturity_18091: {
    name: 'Madurez ISO 18091',
    description: 'Evaluacion de madurez institucional con enfoque ISO 18091.',
    status: 'disponible',
  },
};

function isSimpleSettingsSchema(
  schema: CapabilityManifest['settings_schema']
): schema is Record<string, string | number | boolean | null> {
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
  schema: Record<string, string | number | boolean | null>,
  current: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => {
      const currentValue = current[key];
      if (
        currentValue === null ||
        typeof currentValue === 'string' ||
        typeof currentValue === 'number' ||
        typeof currentValue === 'boolean'
      ) {
        return [key, currentValue];
      }

      return [key, value];
    })
  );
}

function getStatusBadgeVariant(capability: CapabilityCardModel) {
  if (!capability.installed) return 'outline' as const;
  if (capability.enabled) return 'success' as const;
  if (capability.status === 'installed' || capability.status === 'disabled') {
    return 'secondary' as const;
  }

  return 'outline' as const;
}

function getStatusLabel(capability: CapabilityCardModel) {
  if (!capability.installed) return 'Disponible';
  if (capability.enabled) return 'Activa';
  if (capability.status === 'installed') return 'Instalada';
  return 'Desactivada';
}

function getGovEditionStatus(
  capability?: CapabilityCardModel | null,
  fallbackStatus: 'disponible' | 'proximamente' = 'disponible'
) {
  if (!capability) {
    return {
      label: fallbackStatus === 'proximamente' ? 'Proximamente' : 'Disponible',
      className:
        fallbackStatus === 'proximamente'
          ? 'border-slate-200 bg-slate-50 text-slate-600'
          : 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (capability.enabled) {
    return {
      label: 'Activo',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (capability.platformStatus === 'beta') {
    return {
      label: 'Proximamente',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  }

  return {
    label: 'Disponible',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  };
}

function mergeCapabilityData(
  installed: InstalledCapabilityWithPlatform[],
  available: PlatformCapability[]
): CapabilityCardModel[] {
  const installedById = new Map(
    installed.map(item => [item.capability_id, item])
  );
  const catalog = new Map<string, PlatformCapability>();

  available.forEach(item => {
    catalog.set(item.id, item);
  });

  installed.forEach(item => {
    if (item.platform_capability) {
      catalog.set(item.capability_id, item.platform_capability);
    }
  });

  return Array.from(catalog.values())
    .map(platformCapability => {
      const installedCapability = installedById.get(platformCapability.id);
      return {
        id: platformCapability.id,
        name: platformCapability.name,
        description: platformCapability.description,
        tier: platformCapability.tier,
        platformStatus: platformCapability.status,
        status: (installedCapability?.status ||
          'available') as CapabilityUiStatus,
        enabled: Boolean(installedCapability?.enabled),
        installed: Boolean(installedCapability),
        installedAt: installedCapability?.installed_at
          ? new Date(installedCapability.installed_at)
          : null,
        updatedAt: installedCapability?.updated_at
          ? new Date(installedCapability.updated_at)
          : null,
        tags: platformCapability.tags || [],
        dependencies: platformCapability.dependencies || [],
        dependents: [],
        datasets: platformCapability.manifest?.datasets || [],
        settingsSchema: platformCapability.manifest?.settings_schema,
        settings: installedCapability?.settings || {},
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export default function CapabilityAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [savingSettingsId, setSavingSettingsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<InstalledCapabilityWithPlatform[]>(
    []
  );
  const [available, setAvailable] = useState<PlatformCapability[]>([]);
  const [settingsDrafts, setSettingsDrafts] = useState<
    Record<string, Record<string, string | number | boolean | null>>
  >({});

  const canManage = ['admin', 'super_admin'].includes(user?.rol || '');

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [installedRes, availableRes] = await Promise.all([
        fetch(`/api/capabilities/installed?system_id=${SYSTEM_ID}`, {
          cache: 'no-store',
        }),
        fetch(`/api/capabilities/available?system_id=${SYSTEM_ID}`, {
          cache: 'no-store',
        }),
      ]);

      const [installedJson, availableJson] = (await Promise.all([
        installedRes.json(),
        availableRes.json(),
      ])) as [
        CapabilityResponse<InstalledCapabilityWithPlatform[]>,
        CapabilityResponse<PlatformCapability[]>,
      ];

      if (!installedRes.ok || !installedJson.success) {
        throw new Error(
          installedJson.error ||
            'No se pudieron obtener las capabilities instaladas'
        );
      }

      if (!availableRes.ok || !availableJson.success) {
        throw new Error(
          availableJson.error ||
            'No se pudieron obtener las capabilities disponibles'
        );
      }

      setInstalled(Array.isArray(installedJson.data) ? installedJson.data : []);
      setAvailable(Array.isArray(availableJson.data) ? availableJson.data : []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar la administracion de capabilities'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) {
      setLoading(false);
      return;
    }

    void refreshData();
  }, [authLoading, canManage]);

  const capabilities = useMemo(() => {
    const merged = mergeCapabilityData(installed, available);
    const dependentById = new Map<string, string[]>();

    merged.forEach(capability => {
      if (!capability.installed) {
        return;
      }

      capability.dependencies.forEach(dependencyId => {
        const dependents = dependentById.get(dependencyId) || [];
        dependents.push(capability.id);
        dependentById.set(dependencyId, dependents);
      });
    });

    return merged.map(capability => ({
      ...capability,
      dependents: dependentById.get(capability.id) || [],
    }));
  }, [installed, available]);

  useEffect(() => {
    const nextDrafts: Record<
      string,
      Record<string, string | number | boolean | null>
    > = {};

    capabilities.forEach(capability => {
      if (isSimpleSettingsSchema(capability.settingsSchema)) {
        nextDrafts[capability.id] = normalizeSettingsDraft(
          capability.settingsSchema,
          capability.settings
        );
      }
    });

    setSettingsDrafts(current => ({ ...nextDrafts, ...current }));
  }, [capabilities]);

  const groupedCapabilities = useMemo(() => {
    return TIER_ORDER.map(tier => ({
      tier,
      items: capabilities.filter(capability => capability.tier === tier),
    }));
  }, [capabilities]);

  const stats = useMemo(() => {
    return {
      installed: capabilities.filter(item => item.installed).length,
      enabled: capabilities.filter(item => item.enabled).length,
      available: capabilities.filter(item => !item.installed).length,
      configurable: capabilities.filter(item =>
        isSimpleSettingsSchema(item.settingsSchema)
      ).length,
    };
  }, [capabilities]);

  const installedCapabilityIds = useMemo(
    () =>
      new Set(capabilities.filter(item => item.installed).map(item => item.id)),
    [capabilities]
  );

  const enabledCapabilityIds = useMemo(
    () =>
      new Set(capabilities.filter(item => item.enabled).map(item => item.id)),
    [capabilities]
  );

  const govEditionCapabilities = useMemo(() => {
    return GOV_EDITION_IDS.map(id => {
      const capability = capabilities.find(item => item.id === id);
      const fallback = GOV_EDITION_FALLBACK[id];
      const status = getGovEditionStatus(capability, fallback.status);

      return {
        id,
        name: capability?.name || fallback.name,
        description: capability?.description || fallback.description,
        status,
      };
    });
  }, [capabilities]);

  const updateDraft = (
    capabilityId: string,
    key: string,
    value: string | number | boolean | null
  ) => {
    setSettingsDrafts(current => ({
      ...current,
      [capabilityId]: {
        ...current[capabilityId],
        [key]: value,
      },
    }));
  };

  const runMutation = async (
    capabilityId: string,
    config: {
      url: string;
      method: 'POST' | 'PUT' | 'DELETE';
      body?: Record<string, unknown>;
      loadingTarget: 'submit' | 'settings';
      successTitle: string;
      successDescription: string;
      fallbackError: string;
    }
  ) => {
    try {
      if (config.loadingTarget === 'settings') {
        setSavingSettingsId(capabilityId);
      } else {
        setSubmittingId(capabilityId);
      }

      const response = await fetch(config.url, {
        method: config.method,
        headers: { 'Content-Type': 'application/json' },
        body:
          config.method === 'DELETE' || config.body
            ? JSON.stringify(config.body || {})
            : undefined,
      });
      const json = (await response.json()) as CapabilityResponse<unknown>;

      if (!response.ok || !json.success) {
        throw new Error(json.error || config.fallbackError);
      }

      toast({
        title: config.successTitle,
        description: config.successDescription,
      });
      await refreshData();
    } catch (mutationError) {
      toast({
        title: 'Error',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : config.fallbackError,
        variant: 'destructive',
      });
    } finally {
      setSubmittingId(current => (current === capabilityId ? null : current));
      setSavingSettingsId(current =>
        current === capabilityId ? null : current
      );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed bg-white">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando capabilities...
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
            Esta pantalla solo esta disponible para roles admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Capabilities"
        description="Administra instalacion, activacion y configuracion operativa de capabilities del tenant."
        breadcrumbs={[
          { label: 'Mi SGC' },
          { label: 'Configuracion' },
          { label: 'Capabilities' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/capabilities">
                <Layers className="h-4 w-4" />
                Marketplace de Powers
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void refreshData()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Instaladas</CardDescription>
            <CardTitle className="text-3xl">{stats.installed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activas</CardDescription>
            <CardTitle className="text-3xl">{stats.enabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disponibles</CardDescription>
            <CardTitle className="text-3xl">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Con settings simples</CardDescription>
            <CardTitle className="text-3xl">{stats.configurable}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <Settings2 className="h-4 w-4" />
        <AlertTitle>Decision operativa</AlertTitle>
        <AlertDescription>
          La pagina usa `GET /api/capabilities/installed`, `GET
          /api/capabilities/available`, `POST /api/capabilities/install`, `PUT
          /api/capabilities/[id]/toggle`, `PUT /api/capabilities/[id]/settings`
          y `DELETE /api/capabilities/[id]`.
        </AlertDescription>
      </Alert>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Edicion Gobierno Local
          </h2>
          <Badge className="border border-teal-200 bg-teal-50 text-teal-700">
            {govEditionCapabilities.length}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Registro curado de capabilities `gov_*` para operacion municipal.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {govEditionCapabilities.map(item => (
            <Card key={item.id} className="border-teal-100 bg-gradient-to-br from-teal-50/70 to-white">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge className={cn('border', item.status.className)}>
                    {item.status.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{item.id}</Badge>
                  <Badge className="border border-teal-200 bg-white text-teal-700">
                    Gobierno local
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {groupedCapabilities.map(group => (
        <section key={group.tier} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {TIER_META[group.tier].title}
            </h2>
            <Badge className={cn('border', TIER_META[group.tier].badgeClass)}>
              {group.items.length}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {TIER_META[group.tier].description}
            </p>
          </div>

          {group.items.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No hay capabilities registradas en este tier.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {group.items.map(capability => {
                const dependencyState = capability.dependencies.map(
                  dependencyId => ({
                    id: dependencyId,
                    installed: installedCapabilityIds.has(dependencyId),
                    enabled: enabledCapabilityIds.has(dependencyId),
                  })
                );
                const missingDependencies = dependencyState.filter(
                  dependency => !dependency.installed || !dependency.enabled
                );
                const settingsSchema = isSimpleSettingsSchema(
                  capability.settingsSchema
                )
                  ? capability.settingsSchema
                  : null;
                const draft = settingsDrafts[capability.id] || {};
                const isBusy =
                  submittingId === capability.id ||
                  savingSettingsId === capability.id;

                return (
                  <Card key={capability.id} className="border-slate-200">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {capability.name}
                          </CardTitle>
                          <CardDescription>
                            {capability.description}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(capability)}>
                            {getStatusLabel(capability)}
                          </Badge>
                          <Badge
                            className={cn(
                              'border',
                              TIER_META[capability.tier].badgeClass
                            )}
                          >
                            {TIER_META[capability.tier].title}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{capability.id}</Badge>
                        {capability.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                        <div>
                          <span className="font-medium text-slate-700">
                            Datasets:
                          </span>{' '}
                          {capability.datasets.length > 0
                            ? capability.datasets.join(', ')
                            : 'Sin declarar'}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Ultima actualizacion:
                          </span>{' '}
                          {capability.updatedAt
                            ? formatDate(capability.updatedAt)
                            : 'Sin cambios locales'}
                        </div>
                      </div>

                      {capability.dependencies.length > 0 ? (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-medium text-slate-800">
                            Dependencias
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {dependencyState.map(dependency => (
                              <Badge
                                key={dependency.id}
                                variant={
                                  dependency.installed && dependency.enabled
                                    ? 'success'
                                    : 'outline'
                                }
                              >
                                {dependency.id}
                              </Badge>
                            ))}
                          </div>
                          {missingDependencies.length > 0 ? (
                            <p className="text-xs text-amber-700">
                              Requiere activar o instalar:{' '}
                              {missingDependencies
                                .map(item => item.id)
                                .join(', ')}
                              .
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {capability.dependents.length > 0 ? (
                        <div className="rounded-lg border border-slate-200 p-3 text-xs text-muted-foreground">
                          Dependen de esta capability:{' '}
                          {capability.dependents.join(', ')}.
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={capability.enabled}
                            disabled={!capability.installed || isBusy}
                            onCheckedChange={checked =>
                              void runMutation(capability.id, {
                                url: `/api/capabilities/${capability.id}/toggle`,
                                method: 'PUT',
                                body: { enabled: checked },
                                loadingTarget: 'submit',
                                successTitle: checked
                                  ? 'Capability activada'
                                  : 'Capability desactivada',
                                successDescription: checked
                                  ? 'La capability vuelve a estar operativa.'
                                  : 'La capability queda instalada pero fuera de operacion.',
                                fallbackError:
                                  'No se pudo actualizar la capability',
                              })
                            }
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {capability.installed
                                ? capability.enabled
                                  ? 'Capability activa'
                                  : 'Capability desactivada'
                                : 'Instalar para habilitar operaciones'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {capability.installedAt
                                ? `Instalada ${formatDate(capability.installedAt)}`
                                : 'Aun no instalada en esta organizacion'}
                            </p>
                          </div>
                        </div>

                        <div className="ml-auto flex flex-wrap gap-2">
                          {!capability.installed ? (
                            <Button
                              onClick={() =>
                                void runMutation(capability.id, {
                                  url: '/api/capabilities/install',
                                  method: 'POST',
                                  body: {
                                    capability_id: capability.id,
                                    system_id: SYSTEM_ID,
                                    enabled: true,
                                  },
                                  loadingTarget: 'submit',
                                  successTitle: 'Capability instalada',
                                  successDescription:
                                    'La capability quedo disponible para operar en el tenant.',
                                  fallbackError:
                                    'No se pudo instalar la capability',
                                })
                              }
                              disabled={
                                isBusy || missingDependencies.length > 0
                              }
                            >
                              {submittingId === capability.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Instalar
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  void runMutation(capability.id, {
                                    url: `/api/capabilities/${capability.id}/toggle`,
                                    method: 'PUT',
                                    body: { enabled: !capability.enabled },
                                    loadingTarget: 'submit',
                                    successTitle: capability.enabled
                                      ? 'Capability desactivada'
                                      : 'Capability activada',
                                    successDescription: capability.enabled
                                      ? 'La capability queda instalada pero fuera de operacion.'
                                      : 'La capability vuelve a estar operativa.',
                                    fallbackError:
                                      'No se pudo actualizar la capability',
                                  })
                                }
                                disabled={isBusy}
                              >
                                {submittingId === capability.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {capability.enabled ? 'Desactivar' : 'Activar'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  void runMutation(capability.id, {
                                    url: `/api/capabilities/${capability.id}`,
                                    method: 'DELETE',
                                    body: {},
                                    loadingTarget: 'submit',
                                    successTitle: 'Capability desinstalada',
                                    successDescription:
                                      'La capability fue removida del tenant.',
                                    fallbackError:
                                      'No se pudo desinstalar la capability',
                                  })
                                }
                                disabled={
                                  isBusy || capability.dependents.length > 0
                                }
                              >
                                Desinstalar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {settingsSchema ? (
                        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              Settings simples
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Se edita schema llano de strings, numeros y
                              booleanos.
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {Object.entries(settingsSchema).map(
                              ([key, value]) => {
                                const currentValue = draft[key];

                                if (typeof value === 'boolean') {
                                  return (
                                    <div
                                      key={key}
                                      className="flex items-center justify-between rounded-md border p-3"
                                    >
                                      <div>
                                        <Label>{key}</Label>
                                        <p className="text-xs text-muted-foreground">
                                          Booleano
                                        </p>
                                      </div>
                                      <Switch
                                        checked={Boolean(currentValue)}
                                        disabled={
                                          !capability.installed || isBusy
                                        }
                                        onCheckedChange={checked =>
                                          updateDraft(
                                            capability.id,
                                            key,
                                            checked
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                }

                                return (
                                  <div key={key} className="space-y-2">
                                    <Label htmlFor={`${capability.id}-${key}`}>
                                      {key}
                                    </Label>
                                    <Input
                                      id={`${capability.id}-${key}`}
                                      type={
                                        typeof value === 'number'
                                          ? 'number'
                                          : 'text'
                                      }
                                      disabled={!capability.installed || isBusy}
                                      value={
                                        currentValue === null ||
                                        currentValue === undefined
                                          ? ''
                                          : String(currentValue)
                                      }
                                      onChange={event => {
                                        const nextValue =
                                          typeof value === 'number'
                                            ? Number(event.target.value)
                                            : event.target.value;

                                        updateDraft(
                                          capability.id,
                                          key,
                                          event.target.value === ''
                                            ? null
                                            : nextValue
                                        );
                                      }}
                                    />
                                  </div>
                                );
                              }
                            )}
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              onClick={() =>
                                void runMutation(capability.id, {
                                  url: `/api/capabilities/${capability.id}/settings`,
                                  method: 'PUT',
                                  body: {
                                    settings:
                                      settingsDrafts[capability.id] || {},
                                  },
                                  loadingTarget: 'settings',
                                  successTitle: 'Configuracion guardada',
                                  successDescription:
                                    'Los settings de la capability fueron actualizados.',
                                  fallbackError:
                                    'No se pudo guardar la configuracion',
                                })
                              }
                              disabled={!capability.installed || isBusy}
                            >
                              {savingSettingsId === capability.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Guardar settings
                            </Button>
                          </div>
                        </div>
                      ) : capability.settingsSchema ? (
                        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-muted-foreground">
                          El schema existe pero no es simple. La pagina no
                          intenta renderizar estructuras complejas.
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
