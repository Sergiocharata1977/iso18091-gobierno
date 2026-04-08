import type { OrganizationAIPlanOverride } from '@/types/ai-pricing';
import type { Edition } from '@/types/edition';

export interface OrganizationAIConfig {
  ai_plan_id?: string;
  ai_plan_override?: OrganizationAIPlanOverride;
}

export interface OrganizationRecord extends OrganizationAIConfig {
  id: string;
  name: string;
  edition?: Edition;
  plan: 'free' | 'professional' | 'enterprise' | string;
  tenant_type?: string | null;
  tenantType?: string | null;
  settings: {
    timezone: string;
    currency: string;
    language: string;
  };
  features: {
    private_sections: boolean;
    ai_assistant: boolean;
    max_users: number;
  };
  created_at: Date | unknown;
  updated_at: Date | unknown;
}
