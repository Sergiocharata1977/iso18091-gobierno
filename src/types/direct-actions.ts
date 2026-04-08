// Types for Direct Actions - AI-triggered database operations with user confirmation

export type DirectActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'COMPLETE'
  | 'ASSIGN'
  | 'CHANGE_STATUS'
  | 'DELETE';

export type DirectActionEntity =
  | 'audit'
  | 'finding'
  | 'action'
  | 'non-conformity'
  | 'process-record'
  | 'personnel'
  | 'training'
  | 'evaluation';

export interface DirectActionRequest {
  type: DirectActionType;
  entity: DirectActionEntity;
  entityId?: string;
  data: Record<string, any>;
  reason?: string; // Why the action is being requested
  requiresConfirmation?: boolean; // Default: true
}

export type DirectActionStatus =
  | 'pending'
  | 'confirmed'
  | 'executed'
  | 'cancelled'
  | 'failed'
  | 'expired';

export interface DirectActionConfirmation {
  actionId: string;
  userId: string;
  sessionId: string;
  request: DirectActionRequest;
  summary: string; // Human-readable summary of what will happen
  status: DirectActionStatus;
  /** @deprecated use status instead */
  confirmed: boolean;
  confirmedAt?: Date;
  executedAt?: Date;
  result?: {
    success: boolean;
    message: string;
    data?: any;
  };
  error?: string;
}

export interface DirectActionAuditLog {
  id: string;
  userId: string;
  actionId: string;
  type: DirectActionType;
  entity: DirectActionEntity;
  entityId?: string;
  status: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled';
  request: DirectActionRequest;
  summary: string;
  result?: {
    success: boolean;
    message: string;
  };
  error?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DirectActionPermission {
  userId: string;
  role: string;
  allowedActions: DirectActionType[];
  allowedEntities: DirectActionEntity[];
  requiresApproval: boolean;
  approverIds?: string[];
}

export interface DirectActionResponse {
  actionId: string;
  status: 'pending_confirmation' | 'confirmed' | 'executed' | 'failed';
  summary: string;
  message: string;
  requiresConfirmation: boolean;
  confirmationUrl?: string; // URL to confirm action
}
