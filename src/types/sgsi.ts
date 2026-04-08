import type { Timestamp } from 'firebase-admin/firestore';

// Control ISO 27001/27002
export interface ISGSIControl {
  id: string;
  organizationId: string;
  framework: 'ISO27001' | 'ISO27002' | 'NIST_CSF' | 'CIS_v8' | 'INTERNO';
  code: string;                     // ej: A.5.1, PR.AC-1, CIS.1.1
  title: string;
  description: string;
  category: string;
  applicable: boolean;
  applicabilityReason: string;
  ownerUserId: string;
  ownerAreaId: string;
  implementationStatus: 'no_implementado' | 'parcial' | 'implementado' | 'revisado';
  evidenceRequired: string[];
  linkedPolicies: string[];
  linkedAssets: string[];
  linkedRisks: string[];
  linkedIncidents: string[];
  linkedTasks: string[];
  scoreDesign: number;              // 0-100
  scoreEvidence: number;            // 0-100
  scoreEffectiveness: number;       // 0-100
  lastReviewAt: Timestamp;
  nextReviewAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Activo de información
export interface ISGSIAsset {
  id: string;
  organizationId: string;
  name: string;
  type: 'hardware' | 'software' | 'dato' | 'servicio' | 'persona' | 'instalacion' | 'credencial';
  description: string;
  ownerId: string;
  classification: 'publica' | 'interna' | 'confidencial' | 'restringida';
  criticalityLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  location: string;
  linkedControls: string[];
  linkedRisks: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Riesgo de seguridad
export interface ISGSIRisk {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  threat: string;
  vulnerability: string;
  affectedAssets: string[];
  affectedControls: string[];
  impactCIA: {
    confidentiality: 'bajo' | 'medio' | 'alto';
    integrity: 'bajo' | 'medio' | 'alto';
    availability: 'bajo' | 'medio' | 'alto';
  };
  probability: 'rara' | 'improbable' | 'posible' | 'probable' | 'casi_segura';
  impact: 'insignificante' | 'menor' | 'moderado' | 'mayor' | 'catastrofico';
  inherentRiskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  treatment: 'aceptar' | 'mitigar' | 'transferir' | 'evitar';
  treatmentPlan: string;
  residualRiskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  status: 'identificado' | 'en_tratamiento' | 'aceptado' | 'cerrado';
  ownerId: string;
  approvedById: string;
  reviewDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Incidente de seguridad
export interface ISGSIIncident {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  severity: 'bajo' | 'medio' | 'alto' | 'critico';
  status: 'detectado' | 'triage' | 'contencion' | 'investigando' | 'recuperado' | 'cerrado' | 'leccion_aprendida';
  impactCIA: {
    confidentiality: boolean;
    integrity: boolean;
    availability: boolean;
  };
  affectedAssets: string[];
  detectedAt: Timestamp;
  containedAt?: Timestamp;
  resolvedAt?: Timestamp;
  rootCause?: string;
  correctiveActions: string[];
  lessonsLearned?: string;
  reportedById: string;
  assignedToId: string;
  linkedControls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Registro de acceso
export interface ISGSIAccessRecord {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  type: 'alta' | 'baja' | 'modificacion' | 'revision_periodica' | 'privilegiado';
  system: string;
  permissions: string[];
  justification: string;
  approvedById: string;
  reviewedAt?: Timestamp;
  nextReviewAt: Timestamp;
  status: 'activo' | 'suspendido' | 'revocado';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Declaración de Aplicabilidad (SoA)
export interface ISGSISoAStatement {
  id: string;
  organizationId: string;
  controlCode: string;              // ej: 5.1, 6.3, 8.15
  controlTitle: string;
  applicable: boolean;
  justification: string;
  implementationStatus: 'no_implementado' | 'parcial' | 'implementado';
  evidenceRef: string[];
  linkedRiskIds: string[];
  updatedAt: Timestamp;
}

// Proveedor / Tercero crítico
export interface ISGSIVendor {
  id: string;
  organizationId: string;
  name: string;
  service: string;
  criticality: 'bajo' | 'medio' | 'alto' | 'critico';
  dataClassification: 'publica' | 'interna' | 'confidencial' | 'restringida';
  processingCountry: string;
  dpaStatus: 'pendiente' | 'firmado' | 'vencido';
  slaDocumented: boolean;
  lastAssessmentAt?: Timestamp;
  nextAssessmentAt: Timestamp;
  linkedIncidents: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Plan BCP/DRP
export interface ISGSIBCDRPlan {
  id: string;
  organizationId: string;
  assetId: string;
  assetName: string;
  backupFrequency: 'diario' | 'semanal' | 'mensual' | 'continuo';
  backupType: 'full' | 'incremental' | 'diferencial';
  encrypted: boolean;
  retentionDays: number;
  rtoHours: number;
  rpoHours: number;
  lastRestoreTestAt?: Timestamp;
  lastRestoreTestResult?: 'exitoso' | 'fallido' | 'parcial';
  nextRestoreTestAt: Timestamp;
  contingencyPlan: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Evento de audit log de seguridad
export interface ISecAuditEvent {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  ip: string;
  userAgent: string;
  timestamp: Timestamp;
  objectType: string;
  objectId: string;
  action: string;
  category: 'AUTH' | 'USUARIOS' | 'DATOS' | 'CONFIG' | 'SGSI';
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Plugin iso_sgsi_27001 — tipos de dominio ligeros (snake_case, sin Timestamp)
// Usados por las API routes /api/sgsi/* y las páginas stub del plugin.
// ---------------------------------------------------------------------------

export type SGSIAssetClassification = 'critico' | 'alto' | 'medio' | 'bajo';
export type SGSIAssetType =
  | 'informacion'
  | 'software'
  | 'hardware'
  | 'servicio'
  | 'personas'
  | 'instalacion';

export type SGSIRiskLevel = 'critico' | 'alto' | 'medio' | 'bajo';
export type SGSIRiskStatus = 'identificado' | 'en_tratamiento' | 'aceptado' | 'mitigado';

export type SGSIControlStatus = 'aplicable' | 'no_aplicable';
export type SGSIControlImplementation = 'implementado' | 'parcial' | 'planificado' | 'no_aplica';

export type SGSIIncidentSeverity = 'critica' | 'alta' | 'media' | 'baja';
export type SGSIIncidentStatus = 'abierto' | 'en_investigacion' | 'resuelto' | 'cerrado';

export interface SGSIAsset {
  id: string;
  organization_id: string;
  nombre: string;
  descripcion?: string;
  tipo: SGSIAssetType;
  clasificacion: SGSIAssetClassification;
  propietario_id: string;
  ubicacion?: string;
  confidencialidad: 1 | 2 | 3; // 1=bajo, 2=medio, 3=alto
  integridad: 1 | 2 | 3;
  disponibilidad: 1 | 2 | 3;
  valor_activo: number; // suma de las 3 dimensiones (3-9)
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SGSIRisk {
  id: string;
  organization_id: string;
  activo_id: string;
  amenaza: string;
  vulnerabilidad: string;
  probabilidad: 1 | 2 | 3 | 4 | 5;
  impacto: 1 | 2 | 3 | 4 | 5;
  nivel_riesgo_inherente: number; // probabilidad * impacto
  nivel_riesgo_residual?: number;
  nivel: SGSIRiskLevel;
  controles_aplicados: string[]; // IDs de controles
  status: SGSIRiskStatus;
  responsable_id: string;
  fecha_revision?: string;
  created_at: string;
  updated_at?: string;
}

export interface SGSIControl {
  id: string;
  organization_id: string;
  codigo_anexo_a: string; // e.g. '5.1', '8.2', 'A.9.1.1'
  nombre: string;
  descripcion: string;
  status: SGSIControlStatus;
  implementacion: SGSIControlImplementation;
  justificacion_exclusion?: string; // si no_aplicable
  evidencia?: string;
  responsable_id?: string;
  fecha_implementacion?: string;
  created_at: string;
  updated_at?: string;
}

export interface SGSI_SOA {
  id: string;
  organization_id: string;
  version: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  controles: SGSIControl[];
  created_at: string;
}

export interface SGSIIncident {
  id: string;
  organization_id: string;
  titulo: string;
  descripcion: string;
  severidad: SGSIIncidentSeverity;
  activos_afectados: string[]; // IDs de activos
  fecha_deteccion: string;
  fecha_resolucion?: string;
  status: SGSIIncidentStatus;
  responsable_id: string;
  acciones_tomadas?: string;
  lecciones_aprendidas?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateSGSIAssetRequest {
  nombre: string;
  descripcion?: string;
  tipo: SGSIAssetType;
  clasificacion: SGSIAssetClassification;
  propietario_id: string;
  ubicacion?: string;
  confidencialidad: 1 | 2 | 3;
  integridad: 1 | 2 | 3;
  disponibilidad: 1 | 2 | 3;
}

export interface CreateSGSIRiskRequest {
  activo_id: string;
  amenaza: string;
  vulnerabilidad: string;
  probabilidad: 1 | 2 | 3 | 4 | 5;
  impacto: 1 | 2 | 3 | 4 | 5;
  responsable_id: string;
}

export interface CreateSGSIControlRequest {
  codigo_anexo_a: string;
  nombre: string;
  descripcion: string;
  status: SGSIControlStatus;
  implementacion: SGSIControlImplementation;
  justificacion_exclusion?: string;
  evidencia?: string;
  responsable_id?: string;
  fecha_implementacion?: string;
}

export interface SGSIDashboardData {
  contexto: {
    organization_id: string;
    generated_at: string;
    nivel_madurez: 'inicial' | 'gestionado' | 'controlado';
    alcance_resumen: string;
  };
  resumen: {
    activos_registrados: number;
    riesgos_activos: number;
    controles_aplicados: number;
    incidentes_abiertos: number;
  };
  activos: SGSIAsset[];
  riesgos: SGSIRisk[];
  controles: SGSIControl[];
  soa: {
    total_controles: number;
    aplicables: number;
    no_aplicables: number;
    implementados: number;
    pendientes: number;
    registros: Array<{
      id: string;
      codigo_anexo_a: string;
      nombre: string;
      status: SGSIControlStatus;
      implementacion: SGSIControlImplementation;
      justificacion_exclusion?: string;
    }>;
  };
  incidentes: {
    total: number;
    abiertos: number;
    recientes: SGSIIncident[];
  };
}
