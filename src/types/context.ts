// Types for user context aggregation

import { User } from './auth';
import { OrganizationalConfig } from './organizational-config';
import { OrganizationalContext } from './organizational-context';
import { OrganizationalStructure } from './organizational-structure';
import { ProcessDefinition, ProcessRecord } from './procesos';
import { QualityIndicator, QualityObjective } from './quality';
import { Department, Personnel, Position } from './rrhh';
import { SGCScope } from './sgc-scope';
import { AIChannel } from './ai-core';

export interface UserContextNote {
  id: string;
  title: string;
  content: string;
  source: 'personnel' | 'ai';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserContextHistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  source: 'chat' | 'ai';
  channel?: AIChannel;
  traceId?: string;
}

export interface UserContextChatSession {
  id: string;
  title: string;
  type: 'advisor' | 'assistant' | 'form';
  status: 'active' | 'paused' | 'completed';
  module?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date | null;
  conversationId?: string | null;
  messages: UserContextHistoryMessage[];
  unifiedMessages: UserContextHistoryMessage[];
}

export interface UserContext {
  user: User;
  personnel: Personnel | null;
  position: Position | null;
  department: Department | null;
  installedCapabilities?: Array<{
    id: string;
    name: string;
  }>;
  procesos: ProcessDefinition[];
  objetivos: QualityObjective[];
  indicadores: QualityIndicator[];
  supervisor?: Personnel;
  processRecords?: ProcessRecord[]; // Trello-like records

  // ===== NUEVO: CONTEXTO ORGANIZACIONAL =====
  organizationalConfig?: OrganizationalConfig; // Configuración única de la organización
  sgcScope?: SGCScope; // Alcance del SGC
  organizationalContext?: OrganizationalContext; // Contexto organizacional (Cláusula 4.1)
  organizationalStructure?: OrganizationalStructure; // Estructura consolidada

  // ===== NUEVO: CUMPLIMIENTO NORMATIVO =====
  complianceData?: {
    global_percentage: number;
    mandatory_pending: number;
    high_priority_pending: number;
    high_priority_gaps: Array<{
      code: string;
      title: string;
      priority: 'alta' | 'media' | 'baja';
    }>;
    upcoming_reviews: number;
  };

  notes?: {
    access: 'read_only';
    items: UserContextNote[];
  };
  chatHistory?: {
    access: 'read_only';
    sessions: UserContextChatSession[];
  };

  // FUTURE (when specific registros are implemented):
  // auditorias?: {
  //   pendientes: Auditoria[];
  //   vencidas: Auditoria[];
  //   completadas_mes: Auditoria[];
  // };
  // hallazgos?: {
  //   abiertos: Hallazgo[];
  //   requieren_seguimiento: Hallazgo[];
  //   por_severidad: Record<string, number>;
  // };
  // acciones_correctivas?: {
  //   en_progreso: AccionCorrectiva[];
  //   vencidas: AccionCorrectiva[];
  //   pendientes_validacion: AccionCorrectiva[];
  // };
}

export interface UserContextLight {
  user: User;
  personnel: Personnel | null;
  position: Position | null;
  department: Department | null;
}

export interface PersonnelWithAssignments extends Personnel {
  procesos_details?: ProcessDefinition[];
  objetivos_details?: QualityObjective[];
  indicadores_details?: QualityIndicator[];
}
