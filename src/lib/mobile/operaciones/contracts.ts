import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { SystemActivityLogEntry } from '@/types/system-activity-log';
import type { Compra } from '@/types/compras';
import type { ProductoDealer } from '@/types/dealer-catalogo';
import type { Solicitud, SolicitudEstadoOperativo } from '@/types/solicitudes';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const API_VERSION = '2026-03-30';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
export const MOBILE_OPERACIONES_REQUIRED_CAPABILITY = 'dealer_solicitudes';

const SYNC_QUEUE_TYPES = [
  'visitas',
  'acciones_operativas',
  'evidencias',
  'cambios_estado',
] as const;

const SHARED_EVENTS = [
  'solicitud_actualizada',
  'solicitud_convertida_a_oportunidad',
  'evidencia_solicitud_registrada',
  'compra_actualizada',
  'catalogo_actualizado',
] as const;

const FINAL_SOLICITUD_OPERATIVE_STATUSES: readonly SolicitudEstadoOperativo[] = [
  'entregada',
  'resuelta',
  'cancelada',
] as const;

export const mobileSolicitudPatchSchema = z.object({
  estado: z
    .enum(['recibida', 'en_revision', 'gestionando', 'cerrada', 'cancelada'])
    .optional(),
  estado_operativo: z
    .enum([
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
    ])
    .optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  if_unmodified_since: z.string().datetime().optional(),
  client_request_id: z.string().max(128).optional(),
  offline_action: z
    .enum(['visitas', 'acciones_operativas', 'cambios_estado'])
    .optional(),
  audit_note: z.string().trim().min(1).max(1000).optional(),
  operational_note: z.string().trim().min(1).max(1000).optional(),
});

export const mobileCompraCreateSchema = z.object({
  tipo: z.enum([
    'repuesto',
    'insumo',
    'servicio_externo',
    'herramienta',
    'consumible',
    'logistica',
    'otro',
  ]),
  estado: z.string().min(1).default('solicitada'),
  prioridad: z.enum(['normal', 'urgente', 'critica']).default('normal'),
  solicitante_id: z.string().optional(),
  solicitante_nombre: z.string().min(1),
  area: z.string().min(1),
  motivo: z.string().min(1),
  justificacion: z.string().optional(),
  fecha_requerida: z.string().optional(),
  proveedor_nombre: z.string().optional(),
  proveedor_cuit: z.string().optional(),
  proveedor_contacto: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        descripcion: z.string().min(1),
        codigo_parte: z.string().optional(),
        cantidad: z.number().positive(),
        cantidad_recibida: z.number().min(0).optional(),
        unidad: z.string().min(1),
        precio_unitario_estimado: z.number().min(0).optional(),
        precio_unitario_real: z.number().min(0).optional(),
        marca_referencia: z.string().optional(),
        observaciones: z.string().optional(),
        conforme: z.boolean().optional(),
      })
    )
    .default([]),
  moneda: z.string().optional(),
  notas: z.string().optional(),
});

export const mobileCompraPatchSchema = z.object({
  estado: z.string().min(1).optional(),
  prioridad: z.enum(['normal', 'urgente', 'critica']).optional(),
  proveedor_nombre: z.string().min(1).optional(),
  proveedor_cuit: z.string().optional(),
  proveedor_contacto: z.string().optional(),
  fecha_requerida: z.string().optional(),
  fecha_orden: z.string().optional(),
  fecha_recepcion: z.string().optional(),
  fecha_cierre: z.string().optional(),
  notas: z.string().optional(),
  if_unmodified_since: z.string().datetime().optional(),
  client_request_id: z.string().max(128).optional(),
  approval_note: z.string().trim().min(1).max(1000).optional(),
});

export type MobileOperationsMeta = {
  api_version: string;
  generated_at: string;
  organization_id?: string;
  item_count?: number;
  limit?: number;
  next_cursor?: string | null;
  has_more?: boolean;
  cursor_applied?: string | null;
  updated_after?: string | null;
  request_id?: string | null;
  catalogo?: {
    search?: string | null;
    categorias?: Array<{
      categoria: string;
      total: number;
      disponibles: number;
    }>;
    favoritos_count?: number;
    recientes_count?: number;
    cache?: {
      strategy: 'local_first';
      recommended_ttl_seconds: number;
      delta_sync_supported: boolean;
    };
  };
  sync?: {
    queue_types: readonly string[];
    shared_events: readonly string[];
    retry_policy: {
      retryable_statuses: number[];
      max_client_attempts: number;
      backoff: 'exponential';
    };
    conflict_policy: {
      default_resolution: 'last_write_with_audit';
      final_state_resolution: 'locked';
      stale_write_error: 'conflict';
      stale_write_status: 409;
      expected_version_field: 'if_unmodified_since';
    };
  };
};

type MobileSuccessData = unknown;

type MobileErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'conflict'
  | 'not_found'
  | 'internal_error'
  | 'capability_not_installed';

export interface MobileOperacionesRouteOptions {
  roles: ('admin' | 'gerente' | 'jefe' | 'auditor' | 'operario' | 'super_admin')[];
}

function buildMeta(
  meta?: Partial<MobileOperationsMeta>,
  includeSync = false
): MobileOperationsMeta {
  return {
    api_version: API_VERSION,
    generated_at: new Date().toISOString(),
    ...meta,
    ...(includeSync
      ? {
          sync: {
            queue_types: SYNC_QUEUE_TYPES,
            shared_events: SHARED_EVENTS,
            retry_policy: {
              retryable_statuses: [408, 425, 429, 500, 502, 503, 504],
              max_client_attempts: 4,
              backoff: 'exponential' as const,
            },
            conflict_policy: {
              default_resolution: 'last_write_with_audit' as const,
              final_state_resolution: 'locked' as const,
              stale_write_error: 'conflict' as const,
              stale_write_status: 409 as const,
              expected_version_field: 'if_unmodified_since' as const,
            },
          },
        }
      : {}),
  };
}

export function mobileSuccessResponse(
  data: MobileSuccessData,
  meta?: Partial<MobileOperationsMeta>,
  init?: ResponseInit & { includeSync?: boolean }
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: buildMeta(meta, init?.includeSync ?? false),
    },
    init
  );
}

export function mobileErrorResponse(
  status: number,
  error: MobileErrorCode,
  message: string,
  meta?: Partial<MobileOperationsMeta>,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(details === undefined ? {} : { details }),
      meta: buildMeta(meta, error === 'validation_error' || error === 'conflict'),
    },
    { status }
  );
}

function inferMobileErrorCode(status: number, body: Record<string, unknown>) {
  const rawError = typeof body.error === 'string' ? body.error : '';

  if (rawError === 'capability_not_installed') return rawError;
  if (status === 401) return 'unauthorized';
  if (status === 400) return 'validation_error';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 403) return 'forbidden';
  return 'internal_error';
}

function inferMessage(
  status: number,
  code: MobileErrorCode,
  body: Record<string, unknown>
) {
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (typeof body.error === 'string' && body.error.trim() && body.error !== code) {
    return body.error;
  }

  switch (code) {
    case 'unauthorized':
      return 'Autenticacion requerida o token invalido.';
    case 'forbidden':
      return 'No tenes permisos para acceder a este recurso.';
    case 'capability_not_installed':
      return 'La capability crm no esta instalada para esta organizacion.';
    case 'validation_error':
      return 'La solicitud no cumple el contrato mobile.';
    case 'not_found':
      return 'El recurso solicitado no existe.';
    case 'conflict':
      return 'El recurso cambio en el servidor. Refresca y reintenta.';
    default:
      return status >= 500 ? 'Error interno procesando la solicitud.' : 'Solicitud invalida.';
  }
}

export function withMobileOperacionesAuth(
  handler: AuthenticatedHandler,
  options: MobileOperacionesRouteOptions
) {
  const wrapped = withAuth(handler, {
    roles: options.roles,
    requiredCapability: MOBILE_OPERACIONES_REQUIRED_CAPABILITY,
  });

  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const response = await wrapped(request, context);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      return response;
    }

    let body: Record<string, unknown>;
    try {
      body = (await response.clone().json()) as Record<string, unknown>;
    } catch {
      return response;
    }

    if (body.success === true && 'meta' in body) {
      return response;
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: body.data ?? null,
        meta: buildMeta(),
      });
    }

    const errorCode = inferMobileErrorCode(response.status, body);
    return mobileErrorResponse(
      response.status,
      errorCode,
      inferMessage(response.status, errorCode, body),
      {
        request_id: request.headers.get('x-request-id'),
      },
      body.details
    );
  };
}

export async function resolveMobileOrganizationId(
  auth: Parameters<AuthenticatedHandler>[2],
  requestedOrganizationId?: string | null
) {
  const result = await resolveAuthorizedOrganizationId(auth, requestedOrganizationId);

  if (!result.ok || !result.organizationId) {
    return {
      ok: false as const,
      response: mobileErrorResponse(
        result.status ?? 403,
        result.status === 401 ? 'unauthorized' : 'forbidden',
        result.error || 'No se pudo resolver la organizacion autorizada.'
      ),
    };
  }

  return {
    ok: true as const,
    organizationId: result.organizationId,
  };
}

export function parseListParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return {
    searchParams,
    cursor: searchParams.get('cursor'),
    updatedAfter: searchParams.get('updated_after'),
    limit,
  };
}

export function ensureValidUpdatedAfter(updatedAfter?: string | null) {
  if (!updatedAfter) return null;
  const parsed = Date.parse(updatedAfter);
  if (Number.isNaN(parsed)) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'updated_after debe ser un ISO string valido',
        path: ['updated_after'],
      },
    ]);
  }

  return new Date(parsed).toISOString();
}

export function ensureNotStale(
  currentUpdatedAt: unknown,
  expectedUpdatedAt?: string
) {
  if (!expectedUpdatedAt) return;
  const current = normalizeDateValue(currentUpdatedAt);
  if (current && current !== expectedUpdatedAt) {
    throw new Error('conflict');
  }
}

export function isConflictError(error: unknown) {
  return error instanceof Error && error.message === 'conflict';
}

export function isMobileValidationError(error: unknown) {
  return error instanceof z.ZodError;
}

export function assertSolicitudFinalStateUnlocked(
  current: Pick<Solicitud, 'estado' | 'estado_operativo'>,
  patch: { estado?: Solicitud['estado']; estado_operativo?: Solicitud['estado_operativo'] }
) {
  const finalState =
    current.estado === 'cerrada' ||
    current.estado === 'cancelada' ||
    FINAL_SOLICITUD_OPERATIVE_STATUSES.includes(current.estado_operativo);

  if (!finalState) return;
  if (
    (patch.estado !== undefined && patch.estado !== current.estado) ||
    (patch.estado_operativo !== undefined &&
      patch.estado_operativo !== current.estado_operativo)
  ) {
    throw new Error('conflict');
  }
}

function normalizeDateValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function normalizeUnknownValue(value: unknown): unknown {
  const normalizedDate = normalizeDateValue(value);
  if (normalizedDate) return normalizedDate;

  if (Array.isArray(value)) {
    return value.map(item => normalizeUnknownValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeUnknownValue(nested),
      ])
    );
  }

  return value;
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T;
}

export function toMobileSolicitudResumen(solicitud: Solicitud) {
  return compactRecord({
    id: solicitud.id,
    numero: solicitud.numero,
    tipo: solicitud.tipo,
    flujo: solicitud.flujo,
    estado: solicitud.estado,
    estado_operativo: solicitud.estado_operativo,
    prioridad: solicitud.prioridad ?? null,
    nombre: solicitud.nombre,
    telefono: solicitud.telefono ?? null,
    email: solicitud.email ?? null,
    assigned_to: solicitud.assigned_to ?? null,
    crm_sync_status: solicitud.crm_sync_status ?? null,
    crm_oportunidad_id: solicitud.crm_oportunidad_id ?? null,
    updated_at: normalizeDateValue(solicitud.updated_at),
    created_at: normalizeDateValue(solicitud.created_at),
  });
}

function asPayloadRecord(payload: Solicitud['payload']): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload : {};
}

export function extractOperationalNotes(payload: Solicitud['payload']) {
  const payloadRecord = asPayloadRecord(payload);
  const rawNotes = payloadRecord.notas_operativas;
  if (!Array.isArray(rawNotes)) return [];

  return rawNotes
    .map((note, index) => {
      if (!note || typeof note !== 'object') return null;
      const raw = note as Record<string, unknown>;
      const text =
        typeof raw.texto === 'string'
          ? raw.texto
          : typeof raw.text === 'string'
            ? raw.text
            : null;

      if (!text || !text.trim()) return null;

      return compactRecord({
        id:
          typeof raw.id === 'string' && raw.id.trim()
            ? raw.id
            : `note-${index + 1}`,
        texto: text.trim(),
        created_at:
          typeof raw.created_at === 'string'
            ? raw.created_at
            : typeof raw.createdAt === 'string'
              ? raw.createdAt
              : null,
        created_by:
          typeof raw.created_by === 'string'
            ? raw.created_by
            : typeof raw.createdBy === 'string'
              ? raw.createdBy
              : null,
        created_by_name:
          typeof raw.created_by_name === 'string'
            ? raw.created_by_name
            : typeof raw.createdByName === 'string'
              ? raw.createdByName
              : null,
        source:
          typeof raw.source === 'string' && raw.source.trim()
            ? raw.source
            : 'operaciones_mobile',
      });
    })
    .filter((value) => value !== null) as Array<{
      id: string;
      texto: string;
      created_at: string | null;
      created_by: string | null;
      created_by_name: string | null;
      source: string;
    }>;
}

function toMobileSolicitudHistoryItem(entry: SystemActivityLogEntry) {
  return compactRecord({
    id: entry.id,
    occurred_at: normalizeDateValue(entry.occurred_at),
    action_type: entry.action_type,
    action_label: entry.action_label,
    description: entry.description,
    status: entry.status,
    severity: entry.severity,
    actor: compactRecord({
      user_id: entry.actor_user_id,
      display_name: entry.actor_display_name,
      role: entry.actor_role,
      type: entry.actor_type,
    }),
    metadata: normalizeUnknownValue(entry.metadata ?? {}),
  });
}

export function toMobileSolicitudDetalle(
  solicitud: Solicitud,
  options?: { history?: SystemActivityLogEntry[] }
) {
  const payload = asPayloadRecord(solicitud.payload);
  const history = options?.history ?? [];
  return compactRecord({
    ...toMobileSolicitudResumen(solicitud),
    cuit: solicitud.cuit ?? null,
    mensaje: solicitud.mensaje ?? null,
    payload: normalizeUnknownValue(payload),
    origen: solicitud.origen,
    crm_cliente_id: solicitud.crm_cliente_id ?? null,
    crm_contacto_id: solicitud.crm_contacto_id ?? null,
    crm_sync_at: normalizeDateValue(solicitud.crm_sync_at),
    crm_sync_error: solicitud.crm_sync_error ?? null,
    notas_operativas: extractOperationalNotes(payload),
    historial: history.map(toMobileSolicitudHistoryItem),
  });
}

export function toMobileCompraResumen(compra: Compra & { id: string }) {
  return compactRecord({
    id: compra.id,
    numero: compra.numero,
    tipo: compra.tipo,
    estado: compra.estado,
    prioridad: compra.prioridad,
    solicitante_nombre: compra.solicitante_nombre,
    area: compra.area,
    motivo: compra.motivo,
    proveedor_nombre: compra.proveedor_nombre,
    monto_estimado: compra.monto_estimado,
    moneda: compra.moneda,
    updated_at: normalizeDateValue(compra.updated_at),
    created_at: normalizeDateValue(compra.created_at),
  });
}

export function toMobileCompraDetalle(compra: Compra & { id: string }) {
  return compactRecord({
    ...toMobileCompraResumen(compra),
    solicitante_id: compra.solicitante_id ?? null,
    justificacion: compra.justificacion ?? null,
    fecha_requerida: normalizeDateValue(compra.fecha_requerida),
    fecha_aprobacion: normalizeDateValue(compra.fecha_aprobacion),
    fecha_orden: normalizeDateValue(compra.fecha_orden),
    fecha_recepcion: normalizeDateValue(compra.fecha_recepcion),
    fecha_cierre: normalizeDateValue(compra.fecha_cierre),
    proveedor_cuit: compra.proveedor_cuit ?? null,
    proveedor_contacto: compra.proveedor_contacto ?? null,
    monto_real: compra.monto_real ?? null,
    notas: compra.notas ?? null,
    items: normalizeUnknownValue(compra.items),
  });
}

export function toMobileCatalogoResumen(producto: ProductoDealer) {
  const stock = typeof producto.stock === 'number' ? producto.stock : null;
  const hasStockSignal = stock !== null;
  const disponible = producto.activo && (!hasStockSignal || stock > 0);
  const estadoDisponibilidad = !producto.activo
    ? 'inactivo'
    : !hasStockSignal
      ? 'sin_dato_stock'
      : stock > 0
        ? 'disponible'
        : 'sin_stock';

  return compactRecord({
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    marca: producto.marca,
    modelo: producto.modelo,
    precio_contado: producto.precio_contado,
    precio_lista: producto.precio_lista,
    stock: producto.stock,
    imagenes: producto.imagenes,
    activo: producto.activo,
    destacado: producto.destacado,
    disponible,
    disponibilidad: compactRecord({
      estado: estadoDisponibilidad,
      stock,
    }),
    updated_at: normalizeDateValue(producto.updated_at),
  });
}

export function toMobileMapCliente(raw: Record<string, unknown>) {
  const explicitLat =
    typeof raw.lat === 'number'
      ? raw.lat
      : typeof raw.latitude === 'number'
        ? raw.latitude
        : typeof raw.ubicacion === 'object' &&
            raw.ubicacion !== null &&
            typeof (raw.ubicacion as { lat?: unknown }).lat === 'number'
          ? (raw.ubicacion as { lat: number }).lat
          : null;
  const explicitLng =
    typeof raw.lng === 'number'
      ? raw.lng
      : typeof raw.longitude === 'number'
        ? raw.longitude
        : typeof raw.ubicacion === 'object' &&
            raw.ubicacion !== null &&
            typeof (raw.ubicacion as { lng?: unknown }).lng === 'number'
          ? (raw.ubicacion as { lng: number }).lng
          : null;

  return compactRecord({
    id: String(raw.id || ''),
    razon_social:
      typeof raw.razon_social === 'string'
        ? raw.razon_social
        : typeof raw.nombre_comercial === 'string'
          ? raw.nombre_comercial
          : 'Cliente',
    nombre_comercial:
      typeof raw.nombre_comercial === 'string' ? raw.nombre_comercial : undefined,
    responsable: compactRecord({
      id: typeof raw.responsable_id === 'string' ? raw.responsable_id : undefined,
      nombre:
        typeof raw.responsable_nombre === 'string'
          ? raw.responsable_nombre
          : undefined,
    }),
    direccion: compactRecord({
      direccion: typeof raw.direccion === 'string' ? raw.direccion : undefined,
      localidad: typeof raw.localidad === 'string' ? raw.localidad : undefined,
      provincia: typeof raw.provincia === 'string' ? raw.provincia : undefined,
    }),
    contacto: compactRecord({
      telefono: typeof raw.telefono === 'string' ? raw.telefono : undefined,
      whatsapp_phone:
        typeof raw.whatsapp_phone === 'string' ? raw.whatsapp_phone : undefined,
    }),
    coordenadas:
      explicitLat !== null && explicitLng !== null
        ? {
            lat: explicitLat,
            lng: explicitLng,
          }
        : null,
    geocoding_status:
      explicitLat !== null && explicitLng !== null
        ? 'ready'
        : 'missing_coordinates',
    updated_at: normalizeDateValue(raw.updated_at),
  });
}

export function buildOperationalProfile(params: {
  role: string;
  permissions: string[];
}) {
  const { role, permissions } = params;
  const isSuperAdmin = role === 'super_admin';
  const canConvertToCrm =
    isSuperAdmin || permissions.includes('solicitudes.convert_to_crm');
  const canManageAssignments =
    isSuperAdmin ||
    permissions.includes('solicitudes.reassign') ||
    permissions.includes('solicitudes.update_any');
  const canManagePurchases =
    isSuperAdmin ||
    permissions.includes('compras.write') ||
    permissions.includes('compras.approve');

  if (isSuperAdmin) {
    return {
      key: 'platform_super_admin',
      label: 'Platform Super Admin',
      can_convert_to_crm: true,
      can_manage_assignments: true,
      can_manage_purchases: true,
    };
  }

  if (role === 'auditor') {
    return {
      key: 'auditor_operativo',
      label: 'Auditor Operativo',
      can_convert_to_crm: false,
      can_manage_assignments: false,
      can_manage_purchases: false,
    };
  }

  if (
    role === 'admin' ||
    role === 'gerente' ||
    role === 'jefe' ||
    canConvertToCrm ||
    canManageAssignments
  ) {
    return {
      key: canManagePurchases ? 'supervisor_operativo_compras' : 'supervisor_operativo',
      label: canManagePurchases
        ? 'Supervisor Operativo y Compras'
        : 'Supervisor Operativo',
      can_convert_to_crm: canConvertToCrm,
      can_manage_assignments: canManageAssignments,
      can_manage_purchases: canManagePurchases,
    };
  }

  return {
    key: canManagePurchases ? 'comprador_operativo' : 'operador_campo',
    label: canManagePurchases ? 'Comprador Operativo' : 'Operador de Campo',
    can_convert_to_crm: canConvertToCrm,
    can_manage_assignments: false,
    can_manage_purchases: canManagePurchases,
  };
}

export function canManagePurchasesByRole(params: {
  role: string;
  permissions: string[];
}) {
  const profile = buildOperationalProfile(params);
  return profile.can_manage_purchases;
}
