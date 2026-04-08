import type { ChatContext } from '@/features/chat/types';

export type AIContextProfile = 'chat' | 'evaluation' | 'document' | 'agent_ops';

export interface AIContextNamedRef {
  id: string;
  name: string;
}

export interface AIContextOrgSource {
  id?: string;
  name?: string;
  mission?: string;
  vision?: string;
  scope?: string;
  rubro?: string | null;
  tamano?: string | null;
}

export interface AIContextUserSource {
  id: string;
  email: string;
  organizationId: string;
  displayName?: string;
  role: string;
}

export interface AIContextPersonnelSource {
  id: string;
  fullName?: string;
  position?: string;
  department?: string;
  supervisorName?: string;
}

export interface AIContextAssignmentsSource {
  processes: AIContextNamedRef[];
  objectives: AIContextNamedRef[];
  indicators: AIContextNamedRef[];
}

export interface AIContextComplianceSource {
  organizationId?: string;
  globalPercentage: number;
  mandatoryPending: number;
  highPriorityPending: number;
  highPriorityGaps?: Array<{
    code: string;
    title: string;
    priority: 'alta' | 'media' | 'baja';
  }>;
  upcomingReviews?: number;
}

export interface AIContextImplementationSource {
  organization_id: string;
  organization_name?: string;
  rubro?: string | null;
  tamaño?: string | null;
  implementation_stage?: number;
  maturity_level?: number | null;
  has_policy?: boolean;
  has_objectives?: boolean;
  has_process_map?: boolean;
  existing_processes?: Array<{
    id: string;
    codigo?: string;
    nombre: string;
    category_id?: number;
  }>;
  objectives?: string[];
  can_suggest_processes?: boolean;
  can_suggest_audits?: boolean;
  can_suggest_documents?: boolean;
  has_personnel?: boolean;
  personnel_count?: number;
  maturity_dimensions?: {
    operation: number;
    support: number;
    control: number;
    direction: number;
  };
  iso_status_summary?: {
    planning: number;
    hr: number;
    processes: number;
    documents: number;
    quality: number;
    improvements: number;
    global_score: number;
    critical_gaps: string[];
  };
  last_updated?: Date;
}

export interface AIContextAccountingSource {
  organizationId?: string;
  currentPeriod?: {
    code: string;
    status: 'abierto' | 'cerrado';
    startDate?: string;
    endDate?: string;
    totalEntries: number;
    totalDebe: number;
    totalHaber: number;
    balanceMatches: boolean;
    cashBalance?: number;
    billedThisMonth?: number;
  };
  recentEntries: Array<{
    id: string;
    fecha: string;
    descripcion: string;
    status: 'draft' | 'posted' | 'reversed' | 'cancelled';
    pluginId: string;
    totalDebe: number;
    totalHaber: number;
    documentoTipo?: string;
    documentoId: string;
  }>;
  keyBalances: Array<{
    code: string;
    name: string;
    nature:
      | 'activo'
      | 'pasivo'
      | 'patrimonio_neto'
      | 'ingreso'
      | 'gasto'
      | 'resultado_positivo'
      | 'resultado_negativo'
      | 'orden';
    balance: number;
  }>;
}

export interface AIContextSources {
  organization?: AIContextOrgSource;
  user?: AIContextUserSource;
  personnel?: AIContextPersonnelSource;
  assignments?: AIContextAssignmentsSource;
  compliance?: AIContextComplianceSource;
  implementation?: AIContextImplementationSource;
  accounting?: AIContextAccountingSource;
}

export interface AIContextSanitizationLimits {
  maxStringLength: number;
  maxMissionLength: number;
  maxVisionLength: number;
  maxScopeLength: number;
  maxAssignmentItems: number;
  maxImplementationProcesses: number;
  maxImplementationObjectives: number;
  maxComplianceGaps: number;
}

export interface AIContextBuildInput {
  organizationId: string;
  profile: AIContextProfile;
  sources: AIContextSources;
  limits?: Partial<AIContextSanitizationLimits>;
}

export interface UnifiedAIContext {
  meta: {
    profile: AIContextProfile;
    orgScopeId: string;
    builtAt: Date;
    warnings: string[];
    sanitization: {
      truncatedStrings: number;
      truncatedLists: number;
    };
  };
  org: {
    id: string;
    name: string;
    mission?: string;
    vision?: string;
    scope?: string;
    industry?: string | null;
    size?: string | null;
  };
  user?: {
    id: string;
    email: string;
    displayName?: string;
    role: string;
    organizationId: string;
  };
  personnel?: {
    id: string;
    fullName?: string;
    position?: { name?: string };
    department?: { name?: string };
    supervisor?: { name?: string };
  };
  assignments?: {
    processes: AIContextNamedRef[];
    objectives: AIContextNamedRef[];
    indicators: AIContextNamedRef[];
    counts: {
      processes: number;
      objectives: number;
      indicators: number;
    };
  };
  compliance?: {
    globalPercentage: number;
    mandatoryPending: number;
    highPriorityPending: number;
    highPriorityGaps?: Array<{
      code: string;
      title: string;
      priority: 'alta' | 'media' | 'baja';
    }>;
    upcomingReviews?: number;
  };
  implementation?: {
    stage: number;
    maturityLevel?: number | null;
    hasPolicy: boolean;
    hasObjectives: boolean;
    hasProcessMap: boolean;
    existingProcesses: Array<{
      id: string;
      code?: string;
      name: string;
      categoryId?: number;
    }>;
    objectives: string[];
    aiCapabilities: {
      suggestProcesses: boolean;
      suggestAudits: boolean;
      suggestDocuments: boolean;
    };
    personnel: {
      hasPersonnel: boolean;
      count: number;
    };
    maturityDimensions?: {
      operation: number;
      support: number;
      control: number;
      direction: number;
    };
    isoStatusSummary?: {
      planning: number;
      hr: number;
      processes: number;
      documents: number;
      quality: number;
      improvements: number;
      globalScore: number;
      criticalGaps: string[];
    };
    lastUpdated?: Date;
  };
  accounting?: {
    currentPeriod?: {
      code: string;
      status: 'abierto' | 'cerrado';
      startDate?: string;
      endDate?: string;
      totalEntries: number;
      totalDebe: number;
      totalHaber: number;
      balanceMatches: boolean;
      cashBalance?: number;
      billedThisMonth?: number;
    };
    recentEntries: AIContextAccountingSource['recentEntries'];
    keyBalances: AIContextAccountingSource['keyBalances'];
  };
}

export type LegacyChatContext = ChatContext;
