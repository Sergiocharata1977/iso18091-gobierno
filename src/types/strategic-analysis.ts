import type { ExecutiveAlert } from '@/types/executive-alerts';

// Centro de Inteligencia Gerencial — tipos canónicos (Ola 0)
// Report 89 — plugin premium transversal `analisis_estrategico_ia`

export type StrategicAnalysisScope =
  | 'organization_general'
  | 'process'
  | 'role'
  | 'person'
  | 'normative_compliance'
  | 'operational'
  | 'management_review'
  | 'historical_comparison';

export type StrategicHorizon = '30d' | '60d' | '90d';

export type StrategicSeverity = 'low' | 'medium' | 'high' | 'critical';

export type StrategicDimension =
  | 'quality'
  | 'documentation'
  | 'audits'
  | 'findings_actions'
  | 'processes'
  | 'kpis'
  | 'rrhh'
  | 'crm'
  | 'accounting'
  | 'hse'
  | 'sgsi'
  | 'audit_program'
  | 'governance';

export type StrategicReadingOrientation = 'direccion' | 'jefatura' | 'operativo';

export type StrategicAnalysisReportStatus = 'context_ready' | 'analyzed' | 'complete';

export interface StrategicAnalysisContext {
  organizationId: string;
  generatedAt: string;
  generatedForUserId: string;
  generatedForRole: string;
  analysisScope: StrategicAnalysisScope;
  targetEntity?: {
    type: 'organization' | 'process' | 'role' | 'person';
    id?: string;
    code?: string;
    name?: string;
  };
  installedPlugins: string[];
  organization: {
    name?: string;
    edition?: string;
    sector?: string;
    employeeCount?: number;
  };
  compliance?: {
    globalPercentage?: number;
    mandatoryPending?: number;
    highPriorityPending?: number;
  };
  maturity?: {
    globalScore?: number;
    byDimension?: Array<{
      dimension: StrategicDimension;
      score: number;
    }>;
  };
  executiveIndicators: Record<string, unknown>;
  operationalMetrics: Record<string, unknown>;
  processContext?: {
    processId?: string;
    processName?: string;
    processCode?: string;
    ownerId?: string;
    ownerName?: string;
    relatedKpis?: string[];
    openFindings?: number;
    openActions?: number;
    overdueActions?: number;
  };
  roleContext?: {
    roleId?: string;
    roleName?: string;
    areaName?: string;
    expectedCompetencies?: string[];
    pendingTrainings?: number;
    pendingTasks?: number;
    overdueTasks?: number;
  };
  personContext?: {
    personId?: string;
    displayName?: string;
    assignedProcesses?: string[];
    assignedActionsOpen?: number;
    overdueAssignments?: number;
    pendingEvaluations?: number;
  };
  pluginContexts: Partial<Record<StrategicDimension, Record<string, unknown>>>;
  evidenceSummary: {
    auditsOpen?: number;
    auditsTotal?: number;
    auditsOverdue?: number;
    findingsOpen?: number;
    findingsOverdueSla?: number;
    actionsOpen?: number;
    actionsOverdue?: number;
    documentsPending?: number;
    trainingsPending?: number;
    processesTotal?: number;
    objectivesTotal?: number;
    indicatorsTotal?: number;
  };
  sourceRefs: Array<{
    source: string;
    collection?: string;
    count?: number;
  }>;
}

export interface StrategicNormGap {
  id: string;
  norma: string;
  clausula: string;
  severidad: StrategicSeverity;
  titulo: string;
  descripcion: string;
  evidencia: string[];
  recomendacion: string;
  sourceDimension: StrategicDimension;
}

export interface StrategicFinding {
  id: string;
  category: 'strategic' | 'operational' | 'alert' | 'opportunity';
  dimension: StrategicDimension;
  level: StrategicSeverity;
  entityType?: 'organization' | 'process' | 'role' | 'person';
  entityId?: string;
  entityName?: string;
  titulo: string;
  descripcion: string;
  evidencia: string[];
  affectedAreas?: string[];
}

export interface StrategicPriority {
  id: string;
  horizonte: StrategicHorizon;
  titulo: string;
  descripcion: string;
  impacto: 'low' | 'medium' | 'high';
  urgencia: 'low' | 'medium' | 'high';
  ownerSuggested?: string;
  relatedDimensions: StrategicDimension[];
  targetEntity?: {
    type: 'organization' | 'process' | 'role' | 'person';
    id?: string;
    name?: string;
  };
}

export interface StrategicSuggestedAction {
  id: string;
  actionType: 'CREATE' | 'UPDATE' | 'ASSIGN' | 'CHANGE_STATUS';
  entity:
    | 'audit'
    | 'finding'
    | 'action'
    | 'process-record'
    | 'training'
    | 'evaluation'
    | 'document';
  title: string;
  description: string;
  payload: Record<string, unknown>;
  requiresConfirmation: true;
  safeToAutoPrepare: boolean;
  rationale: string;
}

export interface StrategicAnalysisReport {
  id: string;
  organization_id: string;
  created_at: string;
  created_by: string;
  created_for_role: string;
  title: string;
  status: StrategicAnalysisReportStatus;
  analysis_scope: StrategicAnalysisScope;
  reading_orientation: StrategicReadingOrientation;
  plugin_scope: string[];
  horizon: StrategicHorizon;
  period_reference?: string;
  compared_report_id?: string;
  executive_summary: string;
  rendered_markdown?: string;
  global_score?: number;
  dimension_scores: Array<{
    dimension: StrategicDimension;
    score: number;
  }>;
  norm_gaps: StrategicNormGap[];
  strategic_findings: StrategicFinding[];
  operational_findings: StrategicFinding[];
  risks_alerts: StrategicFinding[];
  opportunities: StrategicFinding[];
  priorities: StrategicPriority[];
  suggested_actions: StrategicSuggestedAction[];
  raw_context_snapshot: StrategicAnalysisContext;
  ai_metadata: {
    provider?: string;
    model?: string;
    traceId?: string;
    tokensUsed?: number;
    promptVersion?: string;
  };
  // Índice de confianza — calculado por StrategicAnalysisConfidenceService
  context_completeness_pct?: number;
  confidence_level?: 'alto' | 'medio' | 'bajo';
  missing_sources?: string[];
  dimension_coverage?: Record<string, string[]>;
  executive_alerts?: ExecutiveAlert[];
  agentic_case_ids?: string[];
}
