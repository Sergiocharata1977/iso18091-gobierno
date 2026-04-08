/**
 * Logging Utilities
 *
 * Structured logging with different log levels and audit trail
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { AuditLog } from '../base/types';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  requestId?: string;
}

/**
 * Get current log level from environment
 */
function getCurrentLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  return (
    LogLevel[level.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO
  );
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel();
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const currentIndex = levels.indexOf(currentLevel);
  const messageIndex = levels.indexOf(level);
  return messageIndex >= currentIndex;
}

/**
 * Format log entry
 */
function formatLogEntry(entry: LogEntry): string {
  if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
    return JSON.stringify(entry);
  }

  const { level, message, timestamp, context } = entry;
  let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    formatted += ` ${JSON.stringify(context)}`;
  }

  return formatted;
}

/**
 * Create log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, any>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * Log debug message
 */
export function logDebug(message: string, context?: Record<string, any>): void {
  if (!shouldLog(LogLevel.DEBUG)) return;

  const entry = createLogEntry(LogLevel.DEBUG, message, context);
  console.debug(formatLogEntry(entry));
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: Record<string, any>): void {
  if (!shouldLog(LogLevel.INFO)) return;

  const entry = createLogEntry(LogLevel.INFO, message, context);
  console.log(formatLogEntry(entry));
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: Record<string, any>): void {
  if (!shouldLog(LogLevel.WARN)) return;

  const entry = createLogEntry(LogLevel.WARN, message, context);
  console.warn(formatLogEntry(entry));
}

/**
 * Log error message
 */
export function logError(
  message: string,
  error?: Error,
  context?: Record<string, any>
): void {
  if (!shouldLog(LogLevel.ERROR)) return;

  const entry = createLogEntry(LogLevel.ERROR, message, {
    ...context,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : undefined,
  });
  console.error(formatLogEntry(entry));
}

/**
 * Log authentication attempt
 */
export function logAuthAttempt(
  success: boolean,
  userId?: string,
  email?: string,
  reason?: string
): void {
  const message = success
    ? `Authentication successful: ${email || userId}`
    : `Authentication failed: ${reason || 'Unknown reason'}`;

  const level = success ? LogLevel.INFO : LogLevel.WARN;
  const entry = createLogEntry(level, message, {
    success,
    userId,
    email,
    reason,
  });

  console.log(formatLogEntry(entry));
}

/**
 * Log authorization check
 */
export function logAuthorizationCheck(
  granted: boolean,
  userId: string,
  resource: string,
  action: string,
  reason?: string
): void {
  const message = granted
    ? `Authorization granted: ${userId} can ${action} ${resource}`
    : `Authorization denied: ${userId} cannot ${action} ${resource}`;

  const level = granted ? LogLevel.DEBUG : LogLevel.WARN;
  const entry = createLogEntry(level, message, {
    granted,
    userId,
    resource,
    action,
    reason,
  });

  console.log(formatLogEntry(entry));
}

/**
 * Log CRUD operation
 */
export function logCrudOperation(
  operation: 'create' | 'read' | 'update' | 'delete',
  resource: string,
  resourceId: string,
  userId: string,
  organizationId: string,
  success: boolean = true
): void {
  const message = `${operation.toUpperCase()} ${resource}:${resourceId} by ${userId}`;
  const level = success ? LogLevel.INFO : LogLevel.ERROR;

  const entry = createLogEntry(level, message, {
    operation,
    resource,
    resourceId,
    userId,
    organizationId,
    success,
  });

  console.log(formatLogEntry(entry));
}

/**
 * Log role/permission change
 */
export function logRoleChange(
  userId: string,
  oldRole: string,
  newRole: string,
  changedBy: string
): void {
  const message = `Role changed for ${userId}: ${oldRole} → ${newRole} by ${changedBy}`;

  const entry = createLogEntry(LogLevel.INFO, message, {
    userId,
    oldRole,
    newRole,
    changedBy,
  });

  console.log(formatLogEntry(entry));
}

/**
 * Create audit log entry in Firestore
 */
export async function createAuditLog(
  userId: string,
  organizationId: string,
  action: AuditLog['action'],
  resource: string,
  resourceId: string,
  changes?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const auditLog: Omit<AuditLog, 'id'> = {
      userId,
      action,
      resource,
      resourceId,
      changes,
      timestamp: Timestamp.now(),
      ipAddress,
      userAgent,
    };

    await db.collection('auditLogs').add(auditLog);

    logDebug('Audit log created', { userId, action, resource, resourceId });
  } catch (error) {
    logError('Failed to create audit log', error as Error, {
      userId,
      action,
      resource,
      resourceId,
    });
  }
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogs(
  resourceId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('auditLogs')
      .where('resourceId', '==', resourceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  } catch (error) {
    logError('Failed to get audit logs', error as Error, { resourceId });
    return [];
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('auditLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  } catch (error) {
    logError('Failed to get user audit logs', error as Error, { userId });
    return [];
  }
}

/**
 * Get audit logs for an organization
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('auditLogs')
      .where('organizationId', '==', organizationId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  } catch (error) {
    logError('Failed to get organization audit logs', error as Error, {
      organizationId,
    });
    return [];
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(
  data: Record<string, any>
): Record<string, any> {
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'privateKey'];

  for (const key of Object.keys(sanitized)) {
    if (
      sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
    ) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create logger with context
 */
export function createLogger(context: Record<string, any>) {
  const sanitizedContext = sanitizeLogData(context);

  return {
    debug: (message: string, additionalContext?: Record<string, any>) =>
      logDebug(message, { ...sanitizedContext, ...additionalContext }),

    info: (message: string, additionalContext?: Record<string, any>) =>
      logInfo(message, { ...sanitizedContext, ...additionalContext }),

    warn: (message: string, additionalContext?: Record<string, any>) =>
      logWarn(message, { ...sanitizedContext, ...additionalContext }),

    error: (
      message: string,
      error?: Error,
      additionalContext?: Record<string, any>
    ) =>
      logError(message, error, { ...sanitizedContext, ...additionalContext }),
  };
}
