import 'server-only';

import { CapabilityService } from '@/services/plugins/CapabilityService';
import {
  CRM_RISK_SCORING_CAPABILITY_ID,
  CRM_RISK_SCORING_DISABLED_MESSAGE,
} from '@/lib/plugins/crmRiskScoringShared';
import type { InstalledCapability } from '@/types/plugins';

export { CRM_RISK_SCORING_CAPABILITY_ID, CRM_RISK_SCORING_DISABLED_MESSAGE } from '@/lib/plugins/crmRiskScoringShared';

export function isInstalledCapabilityEnabled(
  capability:
    | Pick<InstalledCapability, 'capability_id' | 'enabled' | 'status'>
    | null
    | undefined
): boolean {
  return Boolean(
    capability?.capability_id === CRM_RISK_SCORING_CAPABILITY_ID &&
      capability.enabled &&
      capability.status === 'enabled'
  );
}

export async function hasCrmRiskScoringCapability(
  organizationId: string
): Promise<boolean> {
  if (!organizationId) {
    return false;
  }

  return CapabilityService.isCapabilityEnabled(
    organizationId,
    CRM_RISK_SCORING_CAPABILITY_ID
  );
}

export async function requireCrmRiskScoringCapability(
  organizationId: string
): Promise<void> {
  const enabled = await hasCrmRiskScoringCapability(organizationId);

  if (!enabled) {
    throw new Error(CRM_RISK_SCORING_DISABLED_MESSAGE);
  }
}
