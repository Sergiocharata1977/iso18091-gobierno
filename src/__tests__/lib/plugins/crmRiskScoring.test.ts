import {
  CRM_RISK_SCORING_CAPABILITY_ID,
  CRM_RISK_SCORING_DISABLED_MESSAGE,
  hasCrmRiskScoringCapability,
  isInstalledCapabilityEnabled,
  requireCrmRiskScoringCapability,
} from '@/lib/plugins/crmRiskScoring';
import { CapabilityService } from '@/services/plugins/CapabilityService';

jest.mock('@/services/plugins/CapabilityService', () => ({
  CapabilityService: {
    isCapabilityEnabled: jest.fn(),
  },
}));

describe('crmRiskScoring capability helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detecta capability instalada y habilitada', () => {
    expect(
      isInstalledCapabilityEnabled({
        capability_id: CRM_RISK_SCORING_CAPABILITY_ID,
        enabled: true,
        status: 'enabled',
      })
    ).toBe(true);
  });

  it('rechaza capabilities deshabilitadas o distintas', () => {
    expect(
      isInstalledCapabilityEnabled({
        capability_id: CRM_RISK_SCORING_CAPABILITY_ID,
        enabled: false,
        status: 'disabled',
      })
    ).toBe(false);
    expect(
      isInstalledCapabilityEnabled({
        capability_id: 'crm',
        enabled: true,
        status: 'enabled',
      })
    ).toBe(false);
  });

  it('consulta el estado habilitado contra CapabilityService', async () => {
    const isCapabilityEnabledMock = jest.mocked(
      CapabilityService.isCapabilityEnabled
    );
    isCapabilityEnabledMock.mockResolvedValue(true);

    await expect(hasCrmRiskScoringCapability('org-1')).resolves.toBe(true);
    expect(isCapabilityEnabledMock).toHaveBeenCalledWith(
      'org-1',
      CRM_RISK_SCORING_CAPABILITY_ID
    );
  });

  it('lanza error coherente cuando la capability no esta habilitada', async () => {
    const isCapabilityEnabledMock = jest.mocked(
      CapabilityService.isCapabilityEnabled
    );
    isCapabilityEnabledMock.mockResolvedValue(false);

    await expect(requireCrmRiskScoringCapability('org-1')).rejects.toThrow(
      CRM_RISK_SCORING_DISABLED_MESSAGE
    );
  });
});
