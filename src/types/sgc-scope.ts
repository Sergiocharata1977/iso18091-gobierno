// Types for SGC (Sistema de Gestión de Calidad) scope (ISO 9001 Clause 4.3)

export interface SGCScope {
  id: string;
  scope_statement: string;
  exclusions?: Array<{
    clause: string;
    requirement: string;
    justification: string;
  }>;
  applicability_statement?: string;
  products_services?: string[];
  locations?: string[];
  processes?: string[];
  created_at: Date;
  updated_at: Date;
}
