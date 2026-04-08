/**
 * Shared Types for SDK
 *
 * Common interfaces and types used across the SDK
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Base document interface that all entities extend
 * Includes common fields for auditing
 */
export interface BaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
}

/**
 * User context extracted from Firebase token
 * Available in authenticated requests
 */
export interface UserContext {
  uid: string;
  email: string;
  role: 'admin' | 'gerente' | 'jefe' | 'empleado' | 'auditor';
  permissions: string[];
  organizationId?: string | null;
}

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Query filters for database queries
 */
export interface QueryFilters {
  [key: string]: any;
}

/**
 * Sort options for queries
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * List options combining pagination and sorting
 */
export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * List response with pagination metadata
 */
export interface ListResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

/**
 * API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

/**
 * API success response format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Notification entry
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  data?: Record<string, any>;
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

/**
 * Transaction context for database operations
 */
export interface TransactionContext {
  userId: string;
  timestamp: Timestamp;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  enableCaching?: boolean;
  cacheTTL?: number;
  enableAuditLog?: boolean;
  enableNotifications?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Search options
 */
export interface SearchOptions extends ListOptions {
  query: string;
  fields?: string[];
}

/**
 * Date range filter
 */
export interface DateRange {
  start: Date | Timestamp;
  end: Date | Timestamp;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = any> {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  filters?: QueryFilters;
  fields?: string[];
  includeMetadata?: boolean;
}

/**
 * Import options
 */
export interface ImportOptions {
  dryRun?: boolean;
  updateExisting?: boolean;
  skipInvalid?: boolean;
}
