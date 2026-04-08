// Types for Norm Points module

export type NormType =
  | 'iso_9001'
  | 'iso_14001'
  | 'iso_45001'
  | 'legal'
  | 'otra';

export type NormCategory =
  | 'contexto'
  | 'liderazgo'
  | 'planificacion'
  | 'soporte'
  | 'operacion'
  | 'evaluacion'
  | 'mejora';

export type ComplianceStatus =
  | 'completo'
  | 'parcial'
  | 'pendiente'
  | 'no_aplica';

export interface NormPoint {
  id: string;
  organization_id: string;

  // Identificación
  code: string;
  title: string;
  description: string;
  requirement: string;

  // Tipo de norma
  tipo_norma: NormType;
  nombre_norma?: string;

  // Clasificación ISO
  chapter?: number;
  category?: NormCategory;

  // Clasificación Legal
  jurisdiccion?: string;
  numero_ley?: string;
  articulo?: string;

  // Prioridad
  is_mandatory: boolean;
  priority: 'alta' | 'media' | 'baja';

  // Relaciones
  related_process_ids?: string[];
  related_document_ids?: string[];
  related_objective_ids?: string[];

  // Auditoría
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

export interface NormPointRelation {
  id: string;
  organization_id: string;

  // Relación principal
  norm_point_id: string;
  process_id: string;

  // Documentos asociados
  document_ids: string[];

  // Estado de cumplimiento
  compliance_status: ComplianceStatus;
  compliance_percentage: number;

  // Evidencias
  evidence_description?: string;
  evidence_files?: string[];

  // Fechas
  verification_date?: Date;
  next_review_date?: Date;

  // Auditoría
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

export type NormPointFormData = Omit<
  NormPoint,
  'id' | 'created_at' | 'updated_at'
>;

export type NormPointRelationFormData = Omit<
  NormPointRelation,
  'id' | 'created_at' | 'updated_at'
>;

export interface NormPointFilters {
  search?: string;
  tipo_norma?: NormType;
  chapter?: number;
  category?: NormCategory;
  priority?: 'alta' | 'media' | 'baja';
  is_mandatory?: boolean;
  process_id?: string;
}

export interface ComplianceStats {
  global_percentage: number;
  by_chapter: Record<number, number>;
  by_category: Record<NormCategory, number>;
  by_status: Record<ComplianceStatus, number>;
  mandatory_pending: number;
  high_priority_pending: number;
  upcoming_reviews: NormPointRelation[];
}

export interface ComplianceMatrix {
  norm_points: NormPoint[];
  processes: { id: string; nombre: string }[];
  relations: Map<string, { status: ComplianceStatus; percentage: number }>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
