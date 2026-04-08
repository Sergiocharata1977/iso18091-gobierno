// Types for organizational context (ISO 9001 Clause 4.1)

export interface OrganizationalContext {
  id: string;
  internal_issues?: string[];
  external_issues?: string[];
  interested_parties?: Array<{
    name: string;
    type: 'internal' | 'external';
    requirements: string[];
    expectations: string[];
    influence: 'alta' | 'media' | 'baja';
  }>;
  swot_analysis?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  created_at: Date;
  updated_at: Date;
}
