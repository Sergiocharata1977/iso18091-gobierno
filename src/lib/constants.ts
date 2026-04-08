// Estados y enums para el sistema RRHH
export const PERSONNEL_STATUS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
} as const;

export const PERSONNEL_TYPES = {
  ADMINISTRATIVE: 'administrativo',
  SALES: 'ventas',
  TECHNICAL: 'técnico',
  SUPERVISOR: 'supervisor',
  MANAGERIAL: 'gerencial',
} as const;

export const TRAINING_MODALITIES = {
  PRESENTIAL: 'presencial',
  VIRTUAL: 'virtual',
  MIXED: 'mixta',
} as const;

export const TRAINING_STATUS = {
  PLANNED: 'planificada',
  IN_PROGRESS: 'en_curso',
  COMPLETED: 'completada',
  CANCELLED: 'cancelada',
} as const;

export const EVALUATION_STATUS = {
  DRAFT: 'borrador',
  PUBLISHED: 'publicado',
  CLOSED: 'cerrado',
} as const;

export const EVALUATION_RESULTS = {
  LOW: 'bajo',
  MEDIUM: 'medio',
  HIGH: 'alto',
  EXCELLENT: 'excelente',
} as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;
