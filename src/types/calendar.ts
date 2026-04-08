import { Timestamp } from 'firebase/firestore';

// ============================================
// ENUMS Y TIPOS BASE
// ============================================

export type EventType =
  | 'audit'
  | 'document_expiry'
  | 'action_deadline'
  | 'finding_deadline'
  | 'training'
  | 'evaluation'
  | 'meeting'
  | 'general';

export type SourceModule =
  | 'audits'
  | 'documents'
  | 'actions'
  | 'trainings'
  | 'evaluations'
  | 'findings'
  | 'meetings'
  | 'custom';

export type EventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type IntegrationStatus = 'pending' | 'active' | 'disabled' | 'error';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface CalendarEvent {
  id: string;

  // Información básica
  title: string;
  description: string | null;
  date: Timestamp;
  endDate: Timestamp | null; // Para eventos multi-día

  // Categorización
  type: EventType;
  sourceModule: SourceModule;
  status: EventStatus;
  priority: EventPriority;

  // Origen y trazabilidad
  sourceRecordId: string; // ID del registro origen (audit, document, etc.)
  sourceRecordType: string; // Tipo del registro origen
  sourceRecordNumber: string | null; // Número de auditoría, documento, etc.

  // Responsabilidad
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  participantIds: string[] | null; // Para eventos con múltiples participantes

  // Organización
  organizationId: string;
  processId: string | null;
  processName: string | null;

  // Metadata adicional
  metadata: Record<string, unknown> | null; // Datos específicos del módulo

  // Notificaciones
  notificationSchedule: NotificationSchedule | null;
  notificationsSent: boolean;

  // Recurrencia (para eventos personales)
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;

  // Auditoría
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string;
  isActive: boolean;
  isSystemGenerated: boolean; // true para eventos de ABM, false para personales
}

export interface NotificationSchedule {
  sevenDaysBefore: boolean;
  oneDayBefore: boolean;
  onEventDay: boolean;
  customDays: number[] | null; // Días personalizados antes del evento
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // Cada cuántos períodos (ej: cada 2 semanas)
  endDate: Timestamp | null;
  occurrences: number | null; // Número de repeticiones
}

export interface RecurrenceRuleInput {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate: Date | null;
  occurrences: number | null;
}

export interface ModuleIntegration {
  id: string;
  moduleName: SourceModule;
  displayName: string;
  isEnabled: boolean;
  integrationStatus: IntegrationStatus;

  // Configuración
  config: {
    autoCreateEvents: boolean;
    autoUpdateEvents: boolean;
    autoDeleteEvents: boolean;
    defaultNotifications: boolean;
  };

  // Estadísticas
  stats: {
    totalEvents: number;
    activeEvents: number;
    lastSyncAt: Timestamp | null;
    lastError: string | null;
  };

  // Auditoría
  createdAt: Timestamp;
  updatedAt: Timestamp;
  enabledBy: string | null;
  enabledByName: string | null;
}

export interface CalendarNotification {
  id: string;
  eventId: string;
  userId: string;
  type: 'seven_days' | 'one_day' | 'event_day' | 'custom';
  scheduledFor: Timestamp;
  sentAt: Timestamp | null;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  createdAt: Timestamp;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  sevenDaysBefore: boolean;
  oneDayBefore: boolean;
  onEventDay: boolean;
  customDays: number[] | null;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  updatedAt: Timestamp;
}

// ============================================
// TIPOS PARA FORMULARIOS Y CREACIÓN
// ============================================

export interface CalendarEventCreateData {
  title: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  type: EventType;
  sourceModule: SourceModule;
  priority: EventPriority;
  sourceRecordId: string;
  sourceRecordType: string;
  sourceRecordNumber: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  participantIds: string[] | null;
  organizationId: string;
  processId: string | null;
  processName: string | null;
  metadata: Record<string, unknown> | null;
  notificationSchedule: NotificationSchedule | null;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRuleInput | null;
  createdBy: string;
  createdByName: string;
  isSystemGenerated: boolean;
}

export interface CalendarEventUpdateData {
  title?: string;
  description?: string | null;
  date?: Date;
  endDate?: Date | null;
  status?: EventStatus;
  priority?: EventPriority;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  participantIds?: string[] | null;
  processId?: string | null;
  processName?: string | null;
  metadata?: Record<string, unknown> | null;
  notificationSchedule?: NotificationSchedule | null;
}

export interface PublishEventData {
  title: string;
  description: string | null;
  date: Date;
  endDate?: Date | null;
  type: EventType;
  sourceRecordId: string;
  sourceRecordType: string;
  sourceRecordNumber?: string | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  participantIds?: string[] | null;
  priority: EventPriority;
  processId?: string | null;
  processName?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================
// TIPOS PARA FILTROS Y QUERIES
// ============================================

export interface EventFilters {
  type?: EventType | EventType[];
  sourceModule?: SourceModule | SourceModule[];
  status?: EventStatus | EventStatus[];
  priority?: EventPriority | EventPriority[];
  responsibleUserId?: string;
  processId?: string;
  isSystemGenerated?: boolean;
  search?: string;
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

// ============================================
// TIPOS PARA RESPUESTAS DE API
// ============================================

export interface CalendarStats {
  total: number;
  byType: Record<EventType, number>;
  byModule: Record<SourceModule, number>;
  byStatus: Record<EventStatus, number>;
  byPriority: Record<EventPriority, number>;
  upcoming7Days: number;
  upcoming30Days: number;
  overdue: number;
}

export interface UserWorkload {
  userId: string;
  userName: string;
  period: 'week' | 'month' | 'quarter';
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  overdueEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  byType: Record<EventType, number>;
  byPriority: Record<EventPriority, number>;
  byStatus: Record<EventStatus, number>;
  completionRate: number; // Porcentaje de eventos completados
  averageEventsPerDay: number;
  peakDay: { date: Date; count: number } | null; // Día con más eventos
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isAvailable: boolean;
}

export interface UserAvailability {
  userId: string;
  userName: string;
  dateRange: { startDate: Date; endDate: Date };
  workingHours: { start: string; end: string }; // "09:00" - "18:00"
  totalSlots: number;
  availableSlots: AvailabilitySlot[];
  busySlots: AvailabilitySlot[];
  utilizationRate: number; // Porcentaje de tiempo ocupado
}

export interface EventContext {
  event: CalendarEvent;
  sourceRecord: Record<string, unknown> | null; // Registro origen (Audit, Document, etc.)
  relatedRecords: Record<string, unknown>[]; // Registros relacionados
  responsibleUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }> | null;
  process: {
    id: string;
    name: string;
  } | null;
  organization: {
    id: string;
    name: string;
  };
}

// ============================================
// TIPOS PARA QUERIES DE IA
// ============================================

export interface AIQueryFilters extends EventFilters {
  includeCompleted?: boolean;
  includeOverdue?: boolean;
  minPriority?: EventPriority;
  dateRange?: DateRangeFilter;
  limit?: number;
}

export interface UserEventsQuery {
  userId: string;
  filters?: AIQueryFilters;
  includeContext?: boolean; // Si incluir información completa del contexto
  sortBy?: 'date' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface UserTasksQuery {
  userId: string;
  includeOverdue?: boolean;
  includeUpcoming?: boolean;
  daysAhead?: number; // Próximos N días
  groupBy?: 'type' | 'priority' | 'module' | 'date';
}

export interface WorkloadAnalysisQuery {
  userId: string;
  period: 'week' | 'month' | 'quarter';
  startDate?: Date; // Si no se provee, usa fecha actual
  compareWithPrevious?: boolean; // Comparar con período anterior
}

export interface AvailabilityQuery {
  userId: string;
  startDate: Date;
  endDate: Date;
  workingHours?: { start: string; end: string };
  minSlotDuration?: number; // Duración mínima del slot en minutos
  includeWeekends?: boolean;
}

export interface EventContextQuery {
  eventId: string;
  includeSourceRecord?: boolean;
  includeRelatedRecords?: boolean;
  includeUserDetails?: boolean;
  includeProcessDetails?: boolean;
}

// ============================================
// TIPOS PARA RESPUESTAS DE IA API
// ============================================

export interface UserEventsResponse {
  userId: string;
  userName: string;
  totalEvents: number;
  events: CalendarEvent[];
  summary: {
    byType: Record<EventType, number>;
    byPriority: Record<EventPriority, number>;
    byStatus: Record<EventStatus, number>;
    overdueCount: number;
    upcomingCount: number;
  };
  context?: EventContext[]; // Si includeContext=true
}

export interface UserTasksResponse {
  userId: string;
  userName: string;
  totalTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  tasks: CalendarEvent[];
  groupedTasks?: Record<string, CalendarEvent[]>; // Si groupBy está presente
}

export interface WorkloadAnalysisResponse {
  current: UserWorkload;
  previous?: UserWorkload; // Si compareWithPrevious=true
  trend: 'increasing' | 'decreasing' | 'stable';
  insights: string[]; // Observaciones sobre la carga de trabajo
  recommendations: string[]; // Recomendaciones para optimizar
}

export interface AvailabilityAnalysisResponse {
  availability: UserAvailability;
  suggestedSlots: AvailabilitySlot[]; // Mejores slots disponibles
  insights: string[]; // Observaciones sobre disponibilidad
}

// ============================================
// TIPOS PARA SINCRONIZACIÓN
// ============================================

export interface SyncResult {
  module: SourceModule;
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  totalEvents: number;
  orphanedEvents: number;
  inconsistentEvents: number;
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}

export interface CleanupResult {
  eventsDeleted: number;
  eventIds: string[];
  timestamp: Date;
}

export interface DailySyncResult {
  success: boolean;
  modules: SyncResult[];
  validation: ValidationResult;
  cleanup: CleanupResult;
  timestamp: Date;
}

// ============================================
// TIPOS PARA ERRORES
// ============================================

export enum CalendarErrorCode {
  // Validación
  INVALID_EVENT_DATA = 'INVALID_EVENT_DATA',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_MODULE = 'INVALID_MODULE',

  // Permisos
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Integración
  MODULE_NOT_INTEGRATED = 'MODULE_NOT_INTEGRATED',
  MODULE_DISABLED = 'MODULE_DISABLED',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',

  // Sincronización
  SYNC_FAILED = 'SYNC_FAILED',
  SOURCE_RECORD_NOT_FOUND = 'SOURCE_RECORD_NOT_FOUND',
  ORPHANED_EVENT = 'ORPHANED_EVENT',

  // Notificaciones
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',

  // General
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class CalendarError extends Error {
  constructor(
    message: string,
    public code: CalendarErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}
