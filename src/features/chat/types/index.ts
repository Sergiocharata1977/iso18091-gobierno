// ============================================
// TIPOS PARA EL SISTEMA DE CHAT DON CÁNDIDO IA
// ============================================

// ============================================
// TIPOS BASE
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface ChatUser {
  id: string;
  email: string;
  organizationId: string;
  personnelId?: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'gerente' | 'jefe' | 'operario';
}

// ============================================
// SESIONES DE CHAT
// ============================================

export interface ChatSession {
  id: string;
  organizationId: string; // 🔑 REQUERIDO - Aislamiento multi-tenant
  userId: string; // 🔑 REQUERIDO
  personnelId?: string; // Opcional - Vinculado a Personal

  title: string;
  type: 'advisor' | 'assistant' | 'form';
  module?: string;
  status: 'active' | 'paused' | 'completed';

  tags: string[];
  messageCount: number; // Denormalizado para UI

  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export interface CreateSessionInput {
  organizationId: string;
  userId: string;
  personnelId?: string;
  type: ChatSession['type'];
  module?: string;
}

export interface UpdateSessionInput {
  title?: string;
  status?: ChatSession['status'];
  tags?: string[];
}

// ============================================
// MENSAJES
// ============================================

export interface ChatMessage {
  id: string;
  sessionId: string;
  organizationId: string; // 🔑 Denormalizado para queries rápidos

  role: 'user' | 'assistant' | 'system';
  content: string;
  inputType: 'text' | 'voice' | 'image';

  tokens?: {
    input: number;
    output: number;
  };

  metadata?: {
    provider?: string;
    model?: string;
    capability?: string;
    routerCapability?: string;
    mode?: 'fast' | 'quality';
    latencyMs?: number;
    fallbackUsed?: boolean;
    autoPlay?: boolean;
    traceId?: string;
    conversationId?: string;
  };

  createdAt: Date;
}

export interface SendMessageInput {
  sessionId: string;
  content: string;
  inputType: 'text' | 'voice';
}

export interface MessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

// ============================================
// CONTEXTO PARA IA
// ============================================

export interface OrganizationContext {
  id: string;
  name: string;
  mission?: string;
  vision?: string;
  scope?: string;
}

export interface UserContextInfo {
  id: string;
  email: string;
  displayName?: string;
  role: string;
}

export interface PersonnelContextInfo {
  id: string;
  fullName: string;
  position?: string;
  department?: string;
  supervisorName?: string;
}

export interface AssignmentsContext {
  processes: Array<{ id: string; name: string }>;
  objectives: Array<{ id: string; name: string }>;
  indicators: Array<{ id: string; name: string }>;
}

export interface ChatContext {
  organization: OrganizationContext;
  user: UserContextInfo;
  personnel?: PersonnelContextInfo;
  installedCapabilities?: Array<{
    id: string;
    name: string;
  }>;
  assignments?: AssignmentsContext;
  workItems?: Array<{
    id: string;
    title: string;
    status?: string;
    dueDate?: Date;
    processName?: string;
  }>;
  compliance?: {
    globalPercentage: number;
    mandatoryPending: number;
    highPriorityPending: number;
  };
  accounting?: {
    currentPeriod?: {
      code: string;
      status: 'abierto' | 'cerrado';
      totalEntries: number;
      totalDebe: number;
      totalHaber: number;
      balanceMatches: boolean;
      cashBalance?: number;
      billedThisMonth?: number;
    };
    recentEntries?: Array<{
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
    keyBalances?: Array<{
      code: string;
      name: string;
      nature: string;
      balance: number;
    }>;
  };
}

// ============================================
// RESPUESTAS DE API
// ============================================

export interface SessionsResponse {
  sessions: ChatSession[];
  total: number;
}

export interface SessionResponse {
  session: ChatSession;
  messages?: ChatMessage[];
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

// ============================================
// ESTADO DEL CHAT (UI)
// ============================================

export type ChatStatus = 'idle' | 'connecting' | 'ready' | 'sending' | 'error';

export interface ChatState {
  status: ChatStatus;
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  error: string | null;
}

// ============================================
// CONFIGURACIÓN
// ============================================

export type AIMode = 'fast' | 'quality';

export interface ChatConfig {
  aiMode: AIMode;
  autoPlayVoice: boolean;
  continuousMode: boolean;
  darkMode: boolean;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  aiMode: 'fast',
  autoPlayVoice: true,
  continuousMode: false,
  darkMode: false,
};

// ============================================
// CONSTANTES
// ============================================

export const COLLECTIONS = {
  SESSIONS: 'chat_sessions_v2',
  MESSAGES: 'chat_messages',
} as const;

export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_MESSAGES_PER_SESSION = 1000;
export const SESSION_INACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
