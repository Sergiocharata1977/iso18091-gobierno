'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { InstalledPlugin, PluginManifest, PluginTier } from '@/types/plugins';
import { AlertTriangle, Loader2, RefreshCw, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PluginCard } from './_components/PluginCard';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
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

const TIER_LABELS: Record<PluginTier, string> = {
  base: 'Gratis',
  optional: 'Opcional',
  premium: 'Premium',
};

export default function AdminMarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [catalog, setCatalog] = useState<PluginManifest[]>([]);
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPluginId, setBusyPluginId] = useState<string | null>(null);
  const [syncingNav, setSyncingNav] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const organizationId = user?.organization_id || undefined;
  const canManage = user?.rol === 'admin' || user?.rol === 'super_admin';

  const loadData = async () => {
    if (!organizationId) {
      setCatalog([]);
      setInstalled([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const query = `organization_id=${encodeURIComponent(organizationId)}`;
      const [catalogRes, installedRes] = await Promise.all([
        fetch(`/api/admin/plugins?${query}`, { cache: 'no-store' }),
        fetch(`/api/admin/plugins/installed?${query}`, { cache: 'no-store' }),
      ]);

      const [catalogJson, installedJson] = (await Promise.all([
        catalogRes.json(),
        installedRes.json(),
      ])) as [
        ApiResponse<PluginManifest[]>,
        ApiResponse<InstalledPlugin[]>,
      ];

      if (!catalogRes.ok || !catalogJson.success) {
        throw new Error(catalogJson.error || 'No se pudo cargar el catalogo');
      }

      if (!installedRes.ok || !installedJson.success) {
        throw new Error(
          installedJson.error || 'No se pudo cargar los plugins instalados'
        );
      }

      setCatalog(Array.isArray(catalogJson.data) ? catalogJson.data : []);
      setInstalled(
        Array.isArray(installedJson.data)
          ? installedJson.data.filter(plugin => plugin.lifecycle !== 'removed')
          : []
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar el marketplace'
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

    void loadData();
  }, [authLoading, canManage, organizationId]);

  const installedMap = useMemo(
    () => new Map(installed.map(plugin => [plugin.plugin_id, plugin])),
    [installed]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(catalog.map(item => item.identity.category))).sort((a, b) =>
        CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b], 'es')
      ),
    [catalog]
  );

  const filteredCatalog = useMemo(() => {
    return catalog.filter(manifest => {
      const matchesCategory =
        categoryFilter === 'all' ||
        manifest.identity.category === categoryFilter;
      const matchesTier =
        tierFilter === 'all' || manifest.identity.tier === tierFilter;

      return matchesCategory && matchesTier;
    });
  }, [catalog, categoryFilter, tierFilter]);

  const bundleCatalog = useMemo(
    () => filteredCatalog.filter(manifest => manifest.type === 'bundle'),
    [filteredCatalog]
  );

  const pluginCatalog = useMemo(
    () => filteredCatalog.filter(manifest => manifest.type !== 'bundle'),
    [filteredCatalog]
  );

  const optionalCatalogCount = useMemo(
    () => catalog.filter(manifest => manifest.identity.tier === 'optional').length,
    [catalog]
  );

  const bundleCatalogCount = useMemo(
    () => catalog.filter(manifest => manifest.type === 'bundle').length,
    [catalog]
  );

  const handleInstall = async (pluginId: string) => {
    if (!organizationId) return;

    try {
      setBusyPluginId(pluginId);

      const response = await fetch(`/api/admin/plugins/${pluginId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      const json = (await response.json()) as ApiResponse<InstalledPlugin>;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo instalar el plugin');
      }

      toast({
        title: 'Plugin instalado',
        description: 'El plugin quedo disponible para configuracion.',
      });

      await loadData();
      // Sincronizar navegación automáticamente al instalar
      void fetch('/api/admin/sync-modules', { method: 'POST' });
    } catch (mutationError) {
      toast({
        title: 'Error',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'No se pudo instalar el plugin',
        variant: 'destructive',
      });
    } finally {
      setBusyPluginId(current => (current === pluginId ? null : current));
    }
  };

  const handleSyncModules = async () => {
    if (!organizationId) return;
    try {
      setSyncingNav(true);
      const response = await fetch('/api/admin/sync-modules', { method: 'POST' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Error al sincronizar');
      }
      toast({
        title: 'Navegación sincronizada',
        description: `${json.message}. Recargá la página para ver los cambios.`,
      });
    } catch (syncError) {
      toast({
        title: 'Error al sincronizar',
        description: syncError instanceof Error ? syncError.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setSyncingNav(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando marketplace...
          </div>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 md:p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>
            Esta pantalla solo esta disponible para administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Marketplace de capabilities"
        description="Explora el catalogo de plugins, activa plugins opcionales por organizacion y gestiona la instalacion desde administracion."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Resumen</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
              {catalog.length} en catalogo
            </Badge>
            <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
              {optionalCatalogCount} opcionales
            </Badge>
            <Badge className="border border-sky-200 bg-sky-50 text-sky-700">
              {bundleCatalogCount} bundles
            </Badge>
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
              {installed.length} instalados
            </Badge>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
              {filteredCatalog.length} visibles
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Categoria</p>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryOptions.map(category => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Tier</p>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TIER_LABELS).map(([tier, label]) => (
                <SelectItem key={tier} value={tier}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:justify-center">
            <Store className="mr-2 h-4 w-4 text-slate-500" />
            Admin marketplace
          </div>
          <button
            onClick={handleSyncModules}
            disabled={syncingNav}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
            title="Sincroniza el menú lateral con los plugins instalados"
          >
            {syncingNav ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sincronizar navegación
          </button>
        </div>
      </section>

      {filteredCatalog.length > 0 ? (
        <div className="space-y-8">
          {bundleCatalog.length > 0 ? (
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Bundles comerciales
                </h2>
                <p className="text-sm text-slate-600">
                  Packs que instalan y activan multiples plugins en una sola accion.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bundleCatalog.map(manifest => (
                  <PluginCard
                    key={manifest.identity.plugin_id}
                    manifest={manifest}
                    installedPlugin={installedMap.get(manifest.identity.plugin_id)}
                    busy={busyPluginId === manifest.identity.plugin_id}
                    onInstall={handleInstall}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {pluginCatalog.length > 0 ? (
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Plugins individuales
                </h2>
                <p className="text-sm text-slate-600">
                  Modulos que pueden activarse por separado segun la necesidad.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pluginCatalog.map(manifest => (
                  <PluginCard
                    key={manifest.identity.plugin_id}
                    manifest={manifest}
                    installedPlugin={installedMap.get(manifest.identity.plugin_id)}
                    busy={busyPluginId === manifest.identity.plugin_id}
                    onInstall={handleInstall}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
          No hay plugins que coincidan con los filtros seleccionados.
        </section>
      )}
    </div>
  );
}
