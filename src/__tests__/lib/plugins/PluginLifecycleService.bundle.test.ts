jest.mock('@/lib/accounting/rules/crmRules', () => ({
  ensureCrmAccountingRules: jest.fn(),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { InstalledPlugin, PluginManifest } from '@/types/plugins';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import { CapabilityService } from '@/services/plugins/CapabilityService';

describe('PluginLifecycleService bundle installation', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('instala plugins faltantes y habilita todos los miembros del bundle', async () => {
    const service = PluginLifecycleService as any;
    const store = new Map<string, Record<string, unknown>>();

    const buildDocRef = (path: string) => ({
      collection: (name: string) => buildCollectionRef(`${path}/${name}`),
      doc: (id: string) => buildDocRef(`${path}/${id}`),
      get: jest.fn(async () => ({
        exists: store.has(path),
        data: () => store.get(path) || {},
      })),
      set: jest.fn(async (value: Record<string, unknown>, options?: { merge?: boolean }) => {
        const current = store.get(path) || {};
        store.set(path, options?.merge ? { ...current, ...value } : value);
      }),
    });

    const buildCollectionRef = (path: string) => ({
      doc: (id: string) => buildDocRef(`${path}/${id}`),
      get: jest.fn(async () => ({
        docs: Array.from(store.entries())
          .filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
          .map(([key, value]) => ({
            id: key.split('/').pop(),
            data: () => value,
          })),
      })),
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: (name: string) => buildCollectionRef(name),
    });

    const bundleManifest = {
      manifest_version: '1.0',
      type: 'bundle',
      bundle_plugins: ['iso_sgsi_27001', 'iso_audit_19011'],
      versioning: {
        plugin_version: '1.0.0',
      },
      billing: {
        price_code: 'bundle.pack_sig_integrado',
      },
      tenant_settings: {
        defaults: {},
        schema: {},
      },
      compatibility: {
        incompatible_plugins: [],
        required_capabilities: [],
      },
    } as PluginManifest;

    const disabledChild = {
      plugin_id: 'iso_audit_19011',
      organization_id: 'org-1',
      version_installed: '1.0.0',
      lifecycle: 'installed',
      enabled: false,
      settings_effective: {},
      billing: { status: 'active' },
      health: { status: 'healthy', checks: [] },
      audit_summary: {},
      install_blockers: [],
      pending_jobs: [],
      installed_by: 'user-1',
      installed_at: new Date('2026-03-26T00:00:00.000Z'),
      updated_at: new Date('2026-03-26T00:00:00.000Z'),
      enabled_at: null,
      disabled_at: new Date('2026-03-26T00:00:00.000Z'),
      removed_at: null,
    } as InstalledPlugin;

    store.set(
      'organizations/org-1/installed_plugins/iso_audit_19011',
      disabledChild as unknown as Record<string, unknown>
    );

    jest.spyOn(service, 'validateCompatibility').mockResolvedValue(undefined);
    jest.spyOn(service, 'validateSettings').mockImplementation(() => undefined);
    jest.spyOn(service, 'getCatalogManifest').mockImplementation(async (pluginId: string) => {
      if (pluginId === 'iso_sgsi_27001' || pluginId === 'iso_audit_19011') {
        return {
          manifest_version: '1.0',
          versioning: {
            plugin_version: '1.0.0',
          },
          billing: {
            price_code: `plugin.${pluginId}`,
          },
          tenant_settings: {
            defaults: {},
            schema: {},
          },
          compatibility: {
            incompatible_plugins: [],
            required_capabilities: [],
          },
          identity: { plugin_id: pluginId },
        } as PluginManifest;
      }

      return null;
    });

    jest.spyOn(CapabilityService, 'getPlatformCapability').mockResolvedValue(null);
    jest.spyOn(CapabilityService, 'installCapability').mockResolvedValue();
    jest.spyOn(CapabilityService, 'updateInstalledCapability').mockResolvedValue({
      ...disabledChild,
      enabled: true,
      status: 'enabled',
    } as never);

    const installPluginSpy = jest.spyOn(service, 'installPlugin');
    const enablePluginSpy = jest.spyOn(service, 'enablePlugin');
    const persistSpy = jest.spyOn(service, 'persistInstalledPlugin');

    const result = await service.installBundle({
      organizationId: 'org-1',
      pluginId: 'pack_sig_integrado',
      userId: 'user-1',
      manifest: bundleManifest,
      settings: {},
    });

    expect(installPluginSpy).toHaveBeenCalledTimes(1);
    expect(installPluginSpy).toHaveBeenCalledWith({
      organizationId: 'org-1',
      pluginId: 'iso_sgsi_27001',
      userId: 'user-1',
    });
    expect(enablePluginSpy).toHaveBeenCalledTimes(2);
    expect(enablePluginSpy).toHaveBeenNthCalledWith(1, {
      organizationId: 'org-1',
      pluginId: 'iso_sgsi_27001',
      userId: 'user-1',
    });
    expect(enablePluginSpy).toHaveBeenNthCalledWith(2, {
      organizationId: 'org-1',
      pluginId: 'iso_audit_19011',
      userId: 'user-1',
    });
    expect(persistSpy).toHaveBeenCalledWith({
      organizationId: 'org-1',
      pluginId: 'pack_sig_integrado',
      userId: 'user-1',
      manifest: bundleManifest,
      effectiveSettings: {},
      enabled: true,
    });
    expect(result.plugin_id).toBe('pack_sig_integrado');
    expect(result.enabled).toBe(true);

    const installedSgsi = store.get(
      'organizations/org-1/installed_plugins/iso_sgsi_27001'
    ) as Record<string, unknown>;
    const installedAudit = store.get(
      'organizations/org-1/installed_plugins/iso_audit_19011'
    ) as Record<string, unknown>;

    expect(installedSgsi?.enabled).toBe(true);
    expect(installedAudit?.enabled).toBe(true);
  });
});
