jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

import { CapabilityService } from '@/services/plugins/CapabilityService';

describe('CapabilityService.updateInstalledCapability', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('revalida dependencias al reactivar una capability instalada', async () => {
    jest.spyOn(CapabilityService, 'getInstalledCapability').mockResolvedValue({
      id: 'crm_risk_scoring',
      capability_id: 'crm_risk_scoring',
      system_id: 'iso9001',
      version_installed: '1.0.0',
      industry_type: null,
      submodules_enabled: [],
      status: 'disabled',
      enabled: false,
      settings: {},
      installed_by: 'user-1',
      installed_at: new Date('2026-03-03T00:00:00.000Z'),
      enabled_at: null,
      disabled_at: new Date('2026-03-03T00:00:00.000Z'),
      updated_at: new Date('2026-03-03T00:00:00.000Z'),
    });

    jest
      .spyOn(CapabilityService, 'validateCapabilityDependencies')
      .mockRejectedValue(new Error('Missing capability dependencies: crm'));

    await expect(
      CapabilityService.updateInstalledCapability({
        organizationId: 'org-1',
        capabilityId: 'crm_risk_scoring',
        userId: 'user-1',
        enabled: true,
      })
    ).rejects.toThrow('Missing capability dependencies: crm');
  });
});
