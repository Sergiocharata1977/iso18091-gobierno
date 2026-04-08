// Types for organizational configuration (ISO 9001 Clause 4.1)

export interface OrganizationalConfig {
  id: string;
  organization_name: string;
  mission?: string;
  vision?: string;
  values?: string[];
  objectives?: string[];
  policies?: string[];
  stakeholders?: string[];
  interested_parties?: Array<{
    name: string;
    requirements: string[];
    expectations: string[];
  }>;
  created_at: Date;
  updated_at: Date;
}
