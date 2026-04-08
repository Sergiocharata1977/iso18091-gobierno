export const SOLICITUD_TIPOS = ['repuesto', 'servicio', 'comercial'] as const;
export type SolicitudTipo = (typeof SOLICITUD_TIPOS)[number];

export const SOLICITUD_TIPOS_OPERATIVOS = ['repuesto', 'servicio'] as const;
export type SolicitudTipoOperativo =
  (typeof SOLICITUD_TIPOS_OPERATIVOS)[number];

export const SOLICITUD_ESTADOS = [
  'recibida',
  'en_revision',
  'gestionando',
  'cerrada',
  'cancelada',
] as const;
export type SolicitudEstado = (typeof SOLICITUD_ESTADOS)[number];

export const SOLICITUD_FLUJOS = [
  'comercial',
  'repuestos',
  'servicios',
] as const;
export type SolicitudFlujo = (typeof SOLICITUD_FLUJOS)[number];

export const SOLICITUD_ESTADOS_OPERATIVOS = [
  'ingresada',
  'cotizando',
  'pedido_confirmado',
  'entrega_preparacion',
  'entregada',
  'diagnostico',
  'presupuestada',
  'programada',
  'en_campo',
  'resuelta',
  'derivada_a_crm',
  'oportunidad_creada',
  'cancelada',
] as const;
export type SolicitudEstadoOperativo =
  (typeof SOLICITUD_ESTADOS_OPERATIVOS)[number];

export type SolicitudEstadoOperativoRepuesto =
  | 'ingresada'
  | 'cotizando'
  | 'pedido_confirmado'
  | 'entrega_preparacion'
  | 'entregada'
  | 'cancelada';

export type SolicitudEstadoOperativoServicio =
  | 'ingresada'
  | 'diagnostico'
  | 'presupuestada'
  | 'programada'
  | 'en_campo'
  | 'resuelta'
  | 'cancelada';

export type SolicitudEstadoOperativoComercial =
  | 'ingresada'
  | 'derivada_a_crm'
  | 'oportunidad_creada'
  | 'entregada'
  | 'cancelada';

export interface SolicitudKanbanColumn<
  TEstado extends string = SolicitudEstadoOperativo,
> {
  id: TEstado;
  label: string;
  legacy_estados: SolicitudEstado[];
}

export const SOLICITUD_FLUJO_POR_TIPO: Record<SolicitudTipo, SolicitudFlujo> = {
  repuesto: 'repuestos',
  servicio: 'servicios',
  comercial: 'comercial',
};

export const SOLICITUD_KANBAN_COLUMNS: {
  repuesto: ReadonlyArray<SolicitudKanbanColumn<SolicitudEstadoOperativoRepuesto>>;
  servicio: ReadonlyArray<SolicitudKanbanColumn<SolicitudEstadoOperativoServicio>>;
  comercial: ReadonlyArray<SolicitudKanbanColumn<SolicitudEstadoOperativoComercial>>;
} = {
  repuesto: [
    { id: 'ingresada', label: 'Ingresada', legacy_estados: ['recibida'] },
    { id: 'cotizando', label: 'Cotizando', legacy_estados: ['en_revision'] },
    {
      id: 'pedido_confirmado',
      label: 'Pedido confirmado',
      legacy_estados: ['gestionando'],
    },
    {
      id: 'entrega_preparacion',
      label: 'Preparando entrega',
      legacy_estados: ['gestionando'],
    },
    { id: 'entregada', label: 'Entregada', legacy_estados: ['cerrada'] },
    { id: 'cancelada', label: 'Cancelada', legacy_estados: ['cancelada'] },
  ],
  servicio: [
    { id: 'ingresada', label: 'Ingresada', legacy_estados: ['recibida'] },
    {
      id: 'diagnostico',
      label: 'Diagnostico',
      legacy_estados: ['en_revision'],
    },
    {
      id: 'presupuestada',
      label: 'Presupuestada',
      legacy_estados: ['gestionando'],
    },
    { id: 'programada', label: 'Programada', legacy_estados: ['gestionando'] },
    { id: 'en_campo', label: 'En campo', legacy_estados: ['gestionando'] },
    { id: 'resuelta', label: 'Resuelta', legacy_estados: ['cerrada'] },
    { id: 'cancelada', label: 'Cancelada', legacy_estados: ['cancelada'] },
  ],
  comercial: [
    { id: 'ingresada', label: 'Ingresada', legacy_estados: ['recibida'] },
    {
      id: 'derivada_a_crm',
      label: 'Derivada a CRM',
      legacy_estados: ['en_revision'],
    },
    {
      id: 'oportunidad_creada',
      label: 'Oportunidad creada',
      legacy_estados: ['gestionando'],
    },
    { id: 'entregada', label: 'Cerrada en CRM', legacy_estados: ['cerrada'] },
    { id: 'cancelada', label: 'Cancelada', legacy_estados: ['cancelada'] },
  ],
};

const SOLICITUD_ESTADO_OPERATIVO_DEFAULT: Record<
  SolicitudTipo,
  SolicitudEstadoOperativo
> = {
  repuesto: 'ingresada',
  servicio: 'ingresada',
  comercial: 'ingresada',
};

const SOLICITUD_ESTADO_LEGACY_POR_OPERATIVO: Record<
  SolicitudTipo,
  Record<SolicitudEstadoOperativo, SolicitudEstado | null>
> = {
  repuesto: {
    ingresada: 'recibida',
    cotizando: 'en_revision',
    pedido_confirmado: 'gestionando',
    entrega_preparacion: 'gestionando',
    entregada: 'cerrada',
    diagnostico: null,
    presupuestada: null,
    programada: null,
    en_campo: null,
    resuelta: null,
    derivada_a_crm: null,
    oportunidad_creada: null,
    cancelada: 'cancelada',
  },
  servicio: {
    ingresada: 'recibida',
    cotizando: null,
    pedido_confirmado: null,
    entrega_preparacion: null,
    entregada: null,
    diagnostico: 'en_revision',
    presupuestada: 'gestionando',
    programada: 'gestionando',
    en_campo: 'gestionando',
    resuelta: 'cerrada',
    derivada_a_crm: null,
    oportunidad_creada: null,
    cancelada: 'cancelada',
  } as Record<SolicitudEstadoOperativo, SolicitudEstado | null>,
  comercial: {
    ingresada: 'recibida',
    cotizando: null,
    pedido_confirmado: null,
    entrega_preparacion: null,
    entregada: 'cerrada',
    diagnostico: null,
    presupuestada: null,
    programada: null,
    en_campo: null,
    resuelta: null,
    derivada_a_crm: 'en_revision',
    oportunidad_creada: 'gestionando',
    cancelada: 'cancelada',
  },
};

const SOLICITUD_ESTADO_OPERATIVO_POR_LEGACY: Record<
  SolicitudTipo,
  Record<SolicitudEstado, SolicitudEstadoOperativo>
> = {
  repuesto: {
    recibida: 'ingresada',
    en_revision: 'cotizando',
    gestionando: 'pedido_confirmado',
    cerrada: 'entregada',
    cancelada: 'cancelada',
  },
  servicio: {
    recibida: 'ingresada',
    en_revision: 'diagnostico',
    gestionando: 'programada',
    cerrada: 'resuelta',
    cancelada: 'cancelada',
  },
  comercial: {
    recibida: 'ingresada',
    en_revision: 'derivada_a_crm',
    gestionando: 'oportunidad_creada',
    cerrada: 'entregada',
    cancelada: 'cancelada',
  },
};

export function resolveSolicitudFlujo(tipo: SolicitudTipo): SolicitudFlujo {
  return SOLICITUD_FLUJO_POR_TIPO[tipo];
}

export function isSolicitudTipoOperativo(
  tipo: SolicitudTipo
): tipo is SolicitudTipoOperativo {
  return tipo === 'repuesto' || tipo === 'servicio';
}

export function getSolicitudKanbanColumns(tipo: SolicitudTipo) {
  return SOLICITUD_KANBAN_COLUMNS[tipo];
}

export function isSolicitudOperationalStatusAllowed(
  tipo: SolicitudTipo,
  estado: SolicitudEstadoOperativo
): boolean {
  return getSolicitudKanbanColumns(tipo).some(column => column.id === estado);
}

export function resolveSolicitudEstadoOperativo(
  tipo: SolicitudTipo,
  estado: SolicitudEstado,
  estadoOperativo?: SolicitudEstadoOperativo | null
): SolicitudEstadoOperativo {
  if (
    estadoOperativo &&
    isSolicitudOperationalStatusAllowed(tipo, estadoOperativo)
  ) {
    return estadoOperativo;
  }

  return (
    SOLICITUD_ESTADO_OPERATIVO_POR_LEGACY[tipo][estado] ||
    SOLICITUD_ESTADO_OPERATIVO_DEFAULT[tipo]
  );
}

export function resolveSolicitudEstadoLegacy(
  tipo: SolicitudTipo,
  estadoOperativo?: SolicitudEstadoOperativo | null,
  fallbackEstado?: SolicitudEstado | null
): SolicitudEstado {
  if (estadoOperativo) {
    const legacy = SOLICITUD_ESTADO_LEGACY_POR_OPERATIVO[tipo][estadoOperativo];
    if (legacy) return legacy;
  }

  return fallbackEstado || 'recibida';
}

export const SOLICITUD_PRIORIDADES = [
  'baja',
  'media',
  'alta',
  'critica',
] as const;
export type SolicitudPrioridad = (typeof SOLICITUD_PRIORIDADES)[number];

export const SOLICITUD_CRM_SYNC_STATUSES = [
  'not_applicable',
  'pending',
  'capability_missing',
  'synced',
  'error',
] as const;
export type SolicitudCRMSyncStatus =
  (typeof SOLICITUD_CRM_SYNC_STATUSES)[number];

export interface Solicitud {
  id: string;
  numero: string;
  organization_id: string;
  tipo: SolicitudTipo;
  flujo: SolicitudFlujo;
  estado: SolicitudEstado;
  estado_operativo: SolicitudEstadoOperativo;
  prioridad?: SolicitudPrioridad | null;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  cuit?: string | null;
  mensaje?: string | null;
  payload: Record<string, unknown>;
  origen: string;
  assigned_to?: string | null;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  crm_oportunidad_id?: string | null;
  crm_sync_status?: SolicitudCRMSyncStatus | null;
  crm_sync_at?: Date | null;
  crm_sync_error?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSolicitudInput {
  organization_id: string;
  tipo: SolicitudTipo;
  prioridad?: SolicitudPrioridad | null;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  cuit?: string | null;
  mensaje?: string | null;
  payload?: Record<string, unknown>;
  origen?: string;
}

export interface SolicitudFilters {
  organization_id: string;
  tipo?: SolicitudTipo;
  flujo?: SolicitudFlujo;
  estado?: SolicitudEstado;
  estado_operativo?: SolicitudEstadoOperativo;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface SolicitudCommercialReference {
  id: string;
  numero: string;
  nombre: string;
  created_at: Date;
  crm_oportunidad_id?: string | null;
  crm_cliente_id?: string | null;
  crm_sync_status?: SolicitudCRMSyncStatus | null;
}

export interface UpdateSolicitudInput {
  estado?: SolicitudEstado;
  estado_operativo?: SolicitudEstadoOperativo;
  prioridad?: SolicitudPrioridad | null;
  assigned_to?: string | null;
  payload?: Record<string, unknown>;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  crm_oportunidad_id?: string | null;
  crm_sync_status?: SolicitudCRMSyncStatus | null;
  crm_sync_at?: Date | null;
  crm_sync_error?: string | null;
}
