import { CapabilityService } from '@/services/plugins/CapabilityService';

export async function requireCapability(
  organizationId: string,
  capabilityId: string
): Promise<void> {
  if (!organizationId) {
    throw new Error('organization_id is required');
  }

  const enabled = await CapabilityService.isCapabilityEnabled(
    organizationId,
    capabilityId
  );

  if (!enabled) {
    throw new Error(`Capability "${capabilityId}" is not enabled`);
  }
}
