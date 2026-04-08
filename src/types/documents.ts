// Types for Documents module

export type DocumentType =
  | 'manual'
  | 'procedimiento'
  | 'instruccion'
  | 'formato'
  | 'registro'
  | 'politica'
  | 'otro';

export type DocumentStatus =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'publicado'
  | 'obsoleto';

export interface Document {
  id: string;

  // Identificación
  organization_id: string; // MULTI-TENANT
  code: string;
  title: string;
  description?: string;
  keywords?: string[];

  // Clasificación
  type: DocumentType;
  category?: string;

  // Estado y versión
  status: DocumentStatus;
  version: string;

  // Responsabilidad
  responsible_user_id: string;
  distribution_list?: string[];

  // Relaciones
  iso_clause?: string;
  process_id?: string;
  norm_point_ids?: string[];

  // Archivo
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  download_url?: string; // URL de descarga de Firebase Storage

  // Fechas
  effective_date?: Date;
  review_date?: Date;
  approved_at?: Date;
  approved_by?: string;

  // Auditoría
  download_count: number;
  is_archived: boolean;

  // Gestión de referencias (Document Integration Service)
  reference_count: number; // Cantidad de referencias activas
  is_orphan: boolean; // Si no tiene referencias

  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  change_reason: string;
  changed_by: string;
  changed_at: Date;
  snapshot: Partial<Document>;
}

export type DocumentFormData = Omit<
  Document,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'download_count'
  | 'is_archived'
  | 'reference_count'
  | 'is_orphan'
>;

export type DocumentCreateData = Omit<
  Document,
  | 'id'
  | 'code'
  | 'created_at'
  | 'updated_at'
  | 'download_count'
  | 'is_archived'
  | 'reference_count'
  | 'is_orphan'
>;

export interface DocumentFilters {
  organization_id?: string;
  search?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  category?: string;
  responsible_user_id?: string;
  iso_clause?: string;
  process_id?: string;
  is_archived?: boolean;
}

export interface DocumentStats {
  total: number;
  by_status: Record<DocumentStatus, number>;
  by_type: Record<DocumentType, number>;
  expiring_soon: number;
  expired: number;
  most_downloaded: Document[];
  recent: Document[];
}

// Pagination types (reuse from rrhh)
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

// ============================================
// DOCUMENT INTEGRATION SERVICE TYPES
// ============================================

/**
 * Módulos que pueden vincular documentos
 */
export type DocumentModule =
  | 'audits'
  | 'findings'
  | 'actions'
  | 'rrhh'
  | 'crm'
  | 'processes'
  | 'quality'
  | 'mcp'
  | 'vendedor'
  | 'documents' // Módulo de documentos standalone
  | 'other';

/**
 * Tipos de vinculación de documentos
 */
export type DocumentLinkType =
  | 'evidence' // Evidencia (fotos, capturas)
  | 'report' // Informe (PDF, Word)
  | 'attachment' // Adjunto genérico
  | 'certificate' // Certificado
  | 'contract' // Contrato
  | 'invoice' // Factura
  | 'photo' // Foto
  | 'audio' // Audio
  | 'video' // Video
  | 'other';

/**
 * Contexto de vinculación de un documento
 */
export interface DocumentLinkContext {
  /** Módulo de origen (audits, findings, actions, rrhh, crm, etc.) */
  module: DocumentModule;

  /** ID del registro al que se vincula */
  recordId: string;

  /** Tipo de vinculación (evidencia, informe, adjunto, etc.) */
  linkType: DocumentLinkType;

  /** Etiqueta descriptiva opcional */
  tag?: string;

  /** Metadata adicional específica del módulo */
  metadata?: Record<string, any>;
}

/**
 * Snapshot denormalizado de documento
 * (Gemini 3 - Performance: evita N+1 queries)
 */
export interface DocumentSnapshot {
  title: string;
  mime_type: string;
  file_extension: string;
  download_url: string;
  size_bytes: number;
  thumbnail_url?: string;
}

/**
 * Referencia de documento vinculado a una entidad
 * (Nueva colección: document_references)
 *
 * @version 2.0 - Con mejoras de Gemini 3
 */
export interface DocumentReference {
  id: string;

  // Documento base
  document_id: string; // FK a documents
  organization_id: string; // MULTI-TENANT

  // Contexto de vinculación
  source_module: DocumentModule;
  linked_record_id: string;
  link_type: DocumentLinkType;
  tag?: string;

  // ✅ DENORMALIZACIÓN (Gemini 3 - Performance)
  snapshot: DocumentSnapshot;

  // ✅ CONTROL ISO 9001 (Gemini 3 - Compliance)
  is_locked: boolean;
  lock_reason?: string;
  locked_at?: Date;
  locked_by?: string;

  // ✅ VERSIONADO (Gemini 3 - Trazabilidad)
  fixed_version?: string; // Si null, apunta a última versión

  // Metadata específica del módulo
  metadata?: {
    // Auditorías
    audit_type?: string;
    finding_severity?: string;

    // RRHH
    personnel_id?: string;
    training_id?: string;

    // CRM
    client_id?: string;

    // Otros
    [key: string]: any;
  };

  // Auditoría
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}

/**
 * Documento extendido con contador de referencias
 * (Gemini 3 - Gestión de huérfanos)
 */
export interface DocumentExtended extends Document {
  /** Cantidad de referencias activas */
  reference_count: number;

  /** Indica si es un documento huérfano */
  is_orphan: boolean;

  /** Indica si tiene referencias bloqueadas (no se puede eliminar) */
  has_locked_references: boolean;
}

/**
 * Datos para crear una referencia de documento
 */
export type DocumentReferenceCreateData = Omit<
  DocumentReference,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Filtros para consultar referencias de documentos
 */
export interface DocumentReferenceFilters {
  organization_id?: string;
  document_id?: string;
  source_module?: DocumentModule;
  linked_record_id?: string;
  link_type?: DocumentLinkType;
  is_locked?: boolean;
}
