export type AIChannel = 'voice' | 'chat' | 'whatsapp';

export type AIInput =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'audio';
      audioUrl?: string;
      transcript?: string;
    };

export interface ConverseRequest {
  channel: AIChannel;
  input: AIInput;
  context?: {
    screen?: string;
    organizationId?: string;
    selectedEntityId?: string | null;
    [key: string]: unknown;
  };
  metadata?: {
    clientMessageId?: string;
    sessionId?: string;
    [key: string]: unknown;
  };
}

export interface UICommand {
  type: 'NAVIGATE' | 'OPEN_MODAL' | 'HIGHLIGHT' | 'REFRESH';
  payload?: Record<string, unknown>;
}

export interface AIMessage {
  id?: string;
  conversationId?: string;
  role: 'user' | 'assistant' | 'system';
  channel: AIChannel;
  content: string;
  toolCalls?: Array<Record<string, unknown>>;
  traceId: string;
  timestamp: Date;
}

export interface ActionLogEntry {
  id?: string;
  userId: string;
  organizationId: string;
  conversationId?: string;
  channel: AIChannel;
  tool: string;
  action: string;
  input: Record<string, unknown>;
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  traceId: string;
  requestedBy: 'user' | 'proactive';
  timestamp: Date;
}

export interface AIUserProfile {
  userId: string;
  organizationId: string;
  preferredLanguage?: string;
  preferredTone?: 'formal' | 'casual';
  lastGreetingAt?: Date | null;
  lastInteractionAt?: Date | null;
  lastChannel?: AIChannel | null;
  drafts?: Array<{
    type: string;
    data: Record<string, unknown>;
    createdAt: Date;
  }>;
}

export interface ConversationThread {
  id: string;
  userId: string;
  organizationId: string;
  channels: AIChannel[];
  status: 'active' | 'archived';
  lastMessageAt: Date;
  createdAt: Date;
  metadata?: {
    title?: string;
    summary?: string;
    sessionId?: string;
  };
}

export interface ConverseResponse {
  traceId: string;
  conversationId: string;
  messages: AIMessage[];
  actions: Array<Record<string, unknown>>;
  uiCommands: UICommand[];
}

export interface OrchestratorContext {
  userId: string;
  organizationId: string;
  email?: string;
}
