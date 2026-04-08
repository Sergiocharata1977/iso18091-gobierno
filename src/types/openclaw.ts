export type OpenClawSkillMode = 'read' | 'write';
export type OpenClawSkillStatus = 'active' | 'disabled';
export type OpenClawSkillParamType = 'string' | 'number' | 'boolean';

export interface OpenClawSkillParamDefinition {
  type: OpenClawSkillParamType;
  required: boolean;
  description: string;
}

export interface OpenClawSkillManifest {
  skill_id: string;
  display_name: string;
  description: string;
  capability_required: string;
  mode: OpenClawSkillMode;
  params_schema: Record<string, OpenClawSkillParamDefinition>;
  example_query: string;
  api_endpoint: string;
  api_method: 'GET' | 'POST' | 'PATCH';
  status: OpenClawSkillStatus;
}

export interface OpenClawExecuteRequest {
  skill_id: string;
  tenant_key: string;
  user_id?: string;
  params: Record<string, unknown>;
  confirmation_token?: string;
}

export interface OpenClawExecuteResponse {
  success: boolean;
  skill_id: string;
  data?: unknown;
  message: string;
  requires_confirmation?: boolean;
  confirmation_token?: string;
  confirmation_prompt?: string;
  error?: string;
}

export interface OpenClawTenantConfig {
  organization_id: string;
  tenant_key: string;
  enabled_skills: string[];
  write_skills_require_otp: boolean;
}
