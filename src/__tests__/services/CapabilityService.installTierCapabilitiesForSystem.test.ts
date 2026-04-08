jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

import { CapabilityService } from '@/services/plugins/CapabilityService';

describe('CapabilityService.installTierCapabilitiesForSystem', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('instala base habilitada, opcional deshabilitada y omite premium', async () => {
    jest.spyOn(CapabilityService, 'getPlatformCapabilities').mockResolvedValue([
      {
        id: 'mi-sgc',
        name: 'Mi SGC',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'base',
        icon: 'ShieldCheck',
        tags: [],
        manifest: {
          capability_id: 'mi-sgc',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
      {
        id: 'crm',
        name: 'CRM',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'opcional',
        icon: 'Briefcase',
        tags: [],
        manifest: {
          capability_id: 'crm',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
      {
        id: 'iso_design_development',
        name: 'Diseno y Desarrollo',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'premium',
        icon: 'Palette',
        tags: [],
        manifest: {
          capability_id: 'iso_design_development',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
    ]);

    jest
      .spyOn(CapabilityService, 'getInstalledCapabilities')
      .mockResolvedValue([]);

    const installSpy = jest
      .spyOn(CapabilityService, 'installCapability')
      .mockResolvedValue();

    const result = await CapabilityService.installTierCapabilitiesForSystem({
      organizationId: 'org-1',
      systemId: 'iso9001',
      userId: 'user-1',
    });

    expect(installSpy).toHaveBeenCalledTimes(2);
    expect(installSpy).toHaveBeenNthCalledWith(1, {
      organizationId: 'org-1',
      capabilityId: 'mi-sgc',
      systemId: 'iso9001',
      userId: 'user-1',
      enabled: true,
    });
    expect(installSpy).toHaveBeenNthCalledWith(2, {
      organizationId: 'org-1',
      capabilityId: 'crm',
      systemId: 'iso9001',
      userId: 'user-1',
      enabled: false,
    });
    expect(result).toEqual({
      installed: ['mi-sgc', 'crm'],
      alreadyInstalled: [],
      blockedByDependencies: [],
    });
  });

  it('reintenta dependencias internas y deja bloqueadas las irresolubles', async () => {
    jest.spyOn(CapabilityService, 'getPlatformCapabilities').mockResolvedValue([
      {
        id: 'crm-addon',
        name: 'CRM Addon',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'opcional',
        icon: 'Box',
        tags: [],
        dependencies: ['crm'],
        manifest: {
          capability_id: 'crm-addon',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
      {
        id: 'crm',
        name: 'CRM',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'opcional',
        icon: 'Briefcase',
        tags: [],
        manifest: {
          capability_id: 'crm',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
      {
        id: 'blocked-addon',
        name: 'Blocked',
        description: '',
        version: '1.0.0',
        system_ids: ['iso9001'],
        scope: 'system',
        status: 'active',
        tier: 'opcional',
        icon: 'Lock',
        tags: [],
        dependencies: ['missing-premium'],
        manifest: {
          capability_id: 'blocked-addon',
          version: '1.0.0',
          system_id: 'iso9001',
          navigation: [],
        },
      },
    ]);

    jest
      .spyOn(CapabilityService, 'getInstalledCapabilities')
      .mockResolvedValue([]);

    const installSpy = jest
      .spyOn(CapabilityService, 'installCapability')
      .mockImplementation(async ({ capabilityId }) => {
        if (capabilityId === 'crm-addon') {
          if (
            installSpy.mock.calls.some(([arg]) => arg.capabilityId === 'crm')
          ) {
            return;
          }
          throw new Error('Missing capability dependencies: crm');
        }

        if (capabilityId === 'blocked-addon') {
          throw new Error('Missing capability dependencies: missing-premium');
        }
      });

    const result = await CapabilityService.installTierCapabilitiesForSystem({
      organizationId: 'org-1',
      systemId: 'iso9001',
      userId: 'user-1',
    });

    expect(result).toEqual({
      installed: ['crm', 'crm-addon'],
      alreadyInstalled: [],
      blockedByDependencies: ['blocked-addon'],
    });
  });
});
