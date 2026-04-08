import { getAdminFirestore } from '@/lib/firebase/admin';
import type { OpenClawTenantConfig } from '@/types/openclaw';

const OPENCLAW_SETTINGS_COLLECTION = 'settings';
const OPENCLAW_SETTINGS_DOC = 'openclaw';

function normalizeEnabledSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export async function getOpenClawTenantConfig(
  organizationId: string
): Promise<OpenClawTenantConfig | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('organizations')
    .doc(organizationId)
    .collection(OPENCLAW_SETTINGS_COLLECTION)
    .doc(OPENCLAW_SETTINGS_DOC)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() || {};

  return {
    organization_id: organizationId,
    tenant_key:
      typeof data.tenant_key === 'string' ? data.tenant_key : organizationId,
    enabled_skills: normalizeEnabledSkills(data.enabled_skills),
    write_skills_require_otp:
      typeof data.write_skills_require_otp === 'boolean'
        ? data.write_skills_require_otp
        : true,
  };
}

export function isOpenClawSkillEnabled(
  config: OpenClawTenantConfig | null,
  skillId: string
): boolean {
  if (!config) {
    return true;
  }

  if (config.enabled_skills.length === 0) {
    return false;
  }

  return config.enabled_skills.includes(skillId);
}
