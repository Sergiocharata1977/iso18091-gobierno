import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { TipoCliente, type ClienteCRM } from '@/types/crm';
import type { OportunidadCRM, UpdateOportunidadData } from '@/types/crm-oportunidad';
import type { UserRole } from '@/types/auth';
import type { CRMAccion } from '@/types/crmAcciones';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const API_VERSION = '2026-03-30';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const SHARED_EVENTS = [
  'solicitud_convertida_a_oportunidad',
  'oportunidad_actualizada',
  'cliente_actualizado',
] as const;

const OFFLINE_ACTIONS = [
  'crear_accion',
  'agregar_nota',
  'cambiar_etapa_oportunidad',
] as const;

export const mobileClientePatchSchema = z
  .object({
    razon_social: z.string().min(1).optional(),
    nombre_comercial: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    telefono: z.string().optional(),
    whatsapp_phone: z.string().optional(),
    preferred_channel: z.enum(['whatsapp', 'llamada', 'email']).optional(),
    direccion: z.string().optional(),
    localidad: z.string().optional(),
    provincia: z.string().optional(),
    monto_estimado_compra: z.number().min(0).optional(),
    probabilidad_conversion: z.number().min(0).max(100).optional(),
    notas: z.string().optional(),
    append_note: z.string().min(1).max(5000).optional(),
    if_unmodified_since: z.string().datetime().optional(),
    client_request_id: z.string().max(128).optional(),
    offline_action: z.enum(['agregar_nota']).optional(),
  })
  .refine(
    body => {
      if (body.offline_action === 'agregar_nota') {
        return Boolean(body.append_note?.trim());
      }
      return true;
    },
    {
      path: ['append_note'],
      message: 'append_note es requerido para offline_action=agregar_nota',
    }
  );

export const mobileCreateOportunidadSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  crm_organizacion_id: z.string().min(1),
  organizacion_nombre: z.string().min(1),
  organizacion_cuit: z.string().optional(),
  contacto_id: z.string().optional(),
  contacto_nombre: z.string().optional(),
  vendedor_id: z.string().min(1),
  vendedor_nombre: z.string().min(1),
  estado_kanban_id: z.string().min(1),
  estado_kanban_nombre: z.string().min(1),
  estado_kanban_color: z.string().min(1),
  monto_estimado: z.number().min(0),
  probabilidad: z.number().min(0).max(100).optional(),
  fecha_cierre_estimada: z.string().optional(),
  productos_interes: z.array(z.string()).optional(),
});

export const mobileOportunidadPatchSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    descripcion: z.string().optional(),
    contacto_id: z.string().optional(),
    contacto_nombre: z.string().optional(),
    vendedor_id: z.string().optional(),
    vendedor_nombre: z.string().optional(),
    monto_estimado: z.number().min(0).optional(),
    probabilidad: z.number().min(0).max(100).optional(),
    fecha_cierre_estimada: z.string().optional(),
    productos_interes: z.array(z.string()).optional(),
    resultado: z.enum(['ganada', 'perdida', 'cancelada']).optional(),
    motivo_cierre: z.string().optional(),
    if_unmodified_since: z.string().datetime().optional(),
    client_request_id: z.string().max(128).optional(),
    offline_action: z.enum(['cambiar_etapa_oportunidad']).optional(),
    estado_nuevo_id: z.string().optional(),
    estado_nuevo_nombre: z.string().optional(),
    estado_nuevo_color: z.string().optional(),
    motivo: z.string().optional(),
  })
  .refine(
    body => {
      if (body.offline_action === 'cambiar_etapa_oportunidad') {
        return Boolean(body.estado_nuevo_id?.trim());
      }
      return true;
    },
    {
      path: ['estado_nuevo_id'],
      message:
        'estado_nuevo_id es requerido para offline_action=cambiar_etapa_oportunidad',
    }
  );

export const mobileCreateAccionSchema = z.object({
  cliente_id: z.string().optional(),
  cliente_nombre: z.string().optional(),
  oportunidad_id: z.string().optional(),
  oportunidad_titulo: z.string().optional(),
  tipo: z.enum([
    'llamada',
    'mail',
    'visita',
    'whatsapp',
    'reunion',
    'cotizacion',
    'seguimiento',
    'tarea',
    'otro',
  ]),
  canal: z.enum(['telefono', 'email', 'presencial', 'whatsapp', 'meet', 'otro']),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  resultado: z
    .enum([
      'pendiente',
      'realizada',
      'no_contesta',
      'reprogramada',
      'interesado',
      'no_interesado',
      'venta',
      'perdida',
      'enviado',
      'recibido',
    ])
    .optional(),
  fecha_programada: z.string().optional(),
  fecha_realizada: z.string().optional(),
  duracion_min: z.number().int().min(0).optional(),
  vendedor_id: z.string().min(1),
  vendedor_nombre: z.string().optional(),
  vendedor_phone: z.string().optional(),
  cliente_direccion: z.string().optional(),
  evidencias: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
        type: z.enum(['audio', 'imagen', 'pdf', 'link', 'otro']).optional(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  estado: z
    .enum(['programada', 'en_progreso', 'completada', 'cancelada', 'vencida'])
    .optional(),
  client_request_id: z.string().max(128).optional(),
  offline_action: z.enum(['crear_accion']).optional(),
});

export type MobileCrmMeta = {
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
  sync?: {
    offline_actions: readonly string[];
    shared_events: readonly string[];
    retry_policy: {
      retryable_statuses: number[];
      max_client_attempts: number;
      backoff: 'exponential';
    };
    conflict_policy: {
      stale_write_error: 'conflict';
      stale_write_status: 409;
      resolution: 'refetch_then_retry';
      expected_version_field: 'if_unmodified_since';
    };
  };
};

type MobileSuccessData = Record<string, unknown> | unknown[] | string | number | boolean | null;

type MobileErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'capability_not_installed'
  | 'validation_error'
  | 'conflict'
  | 'not_found'
  | 'internal_error';

export interface MobileRouteOptions {
  roles: UserRole[];
}

function buildMeta(
  meta?: Partial<MobileCrmMeta>,
  includeSync = false
): MobileCrmMeta {
  return {
    api_version: API_VERSION,
    generated_at: new Date().toISOString(),
    ...meta,
    ...(includeSync
      ? {
          sync: {
            offline_actions: OFFLINE_ACTIONS,
            shared_events: SHARED_EVENTS,
            retry_policy: {
              retryable_statuses: [408, 425, 429, 500, 502, 503, 504],
              max_client_attempts: 4,
              backoff: 'exponential' as const,
            },
            conflict_policy: {
              stale_write_error: 'conflict' as const,
              stale_write_status: 409 as const,
              resolution: 'refetch_then_retry' as const,
              expected_version_field: 'if_unmodified_since' as const,
            },
          },
        }
      : {}),
  };
}

export function mobileSuccessResponse(
  data: MobileSuccessData,
  meta?: Partial<MobileCrmMeta>,
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
  meta?: Partial<MobileCrmMeta>,
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

export function withMobileCrmAuth(
  handler: AuthenticatedHandler,
  options: MobileRouteOptions
) {
  const wrapped = withAuth(handler, {
    roles: options.roles,
    requiredCapability: 'crm',
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

export function toMobileClienteResumen(cliente: ClienteCRM) {
  return compactRecord({
    id: cliente.id,
    razon_social: cliente.razon_social,
    nombre_comercial: cliente.nombre_comercial,
    cuit_cuil: cliente.cuit_cuil,
    tipo_cliente: cliente.tipo_cliente,
    categoria_riesgo: cliente.categoria_riesgo,
    estado: {
      id: cliente.estado_kanban_id,
      nombre: cliente.estado_kanban_nombre,
    },
    responsable: compactRecord({
      id: cliente.responsable_id,
      nombre: cliente.responsable_nombre,
    }),
    contacto: compactRecord({
      email: cliente.email,
      telefono: cliente.telefono,
      whatsapp_phone: cliente.whatsapp_phone,
      preferred_channel: cliente.preferred_channel,
    }),
    oportunidad: compactRecord({
      monto_estimado_compra: cliente.monto_estimado_compra,
      probabilidad_conversion: cliente.probabilidad_conversion,
      fecha_cierre_estimada: normalizeDateValue(cliente.fecha_cierre_estimada),
    }),
    proxima_accion: cliente.proxima_accion
      ? compactRecord({
          tipo: cliente.proxima_accion.tipo,
          fecha_programada: normalizeDateValue(
            cliente.proxima_accion.fecha_programada
          ),
          descripcion: cliente.proxima_accion.descripcion,
        })
      : undefined,
    ultima_interaccion: normalizeDateValue(cliente.ultima_interaccion),
    updated_at: normalizeDateValue(cliente.updated_at),
  });
}

export function toMobileClienteDetalle(cliente: ClienteCRM) {
  return compactRecord({
    ...toMobileClienteResumen(cliente),
    direccion: compactRecord({
      direccion: cliente.direccion,
      localidad: cliente.localidad,
      provincia: cliente.provincia,
      codigo_postal: cliente.codigo_postal,
    }),
    productos_interes: cliente.productos_interes || [],
    notas: cliente.notas || '',
    historial_estados: (cliente.historial_estados || []).map(entry =>
      compactRecord({
        ...(normalizeUnknownValue(entry) as Record<string, unknown>),
      })
    ),
    clasificaciones: normalizeUnknownValue(cliente.classifications),
    documentos_adjuntos: normalizeUnknownValue(cliente.documentos_adjuntos) || [],
    scoring: compactRecord({
      ultimo_scoring_id: cliente.ultimo_scoring_id,
      ultimo_scoring_fecha: normalizeDateValue(cliente.ultimo_scoring_fecha),
      limite_credito_actual: cliente.limite_credito_actual,
      linea_credito_vigente_id: cliente.linea_credito_vigente_id,
    }),
    compras: compactRecord({
      fecha_primera_compra: normalizeDateValue(cliente.fecha_primera_compra),
      fecha_ultima_compra: normalizeDateValue(cliente.fecha_ultima_compra),
      total_compras_12m: cliente.total_compras_12m,
      cantidad_compras_12m: cliente.cantidad_compras_12m,
      monto_total_compras_historico: cliente.monto_total_compras_historico,
    }),
    created_at: normalizeDateValue(cliente.created_at),
    updated_at: normalizeDateValue(cliente.updated_at),
  });
}

export function toMobileOportunidadResumen(oportunidad: OportunidadCRM) {
  return compactRecord({
    id: oportunidad.id,
    nombre: oportunidad.nombre,
    descripcion: oportunidad.descripcion,
    cliente: compactRecord({
      id: oportunidad.crm_organizacion_id,
      nombre: oportunidad.organizacion_nombre,
      cuit: oportunidad.organizacion_cuit,
    }),
    contacto: compactRecord({
      id: oportunidad.contacto_id,
      nombre: oportunidad.contacto_nombre,
    }),
    responsable: compactRecord({
      id: oportunidad.vendedor_id,
      nombre: oportunidad.vendedor_nombre,
    }),
    estado: compactRecord({
      id: oportunidad.estado_kanban_id,
      nombre: oportunidad.estado_kanban_nombre,
      color: oportunidad.estado_kanban_color,
    }),
    monto_estimado: oportunidad.monto_estimado,
    probabilidad: oportunidad.probabilidad,
    fecha_cierre_estimada: normalizeDateValue(oportunidad.fecha_cierre_estimada),
    resultado: oportunidad.resultado,
    updated_at: normalizeDateValue(oportunidad.updated_at),
  });
}

export function toMobileOportunidadDetalle(oportunidad: OportunidadCRM) {
  return compactRecord({
    ...toMobileOportunidadResumen(oportunidad),
    productos_interes: oportunidad.productos_interes || [],
    historial_estados: (oportunidad.historial_estados || []).map(entry =>
      compactRecord({
        ...(normalizeUnknownValue(entry) as Record<string, unknown>),
      })
    ),
    motivo_cierre: oportunidad.motivo_cierre,
    fecha_cierre_real: normalizeDateValue(oportunidad.fecha_cierre_real),
    origen_solicitud: normalizeUnknownValue(oportunidad.origen_solicitud),
    subprocesos: normalizeUnknownValue(oportunidad.subprocesos),
    clasificaciones: normalizeUnknownValue(oportunidad.classifications),
    created_at: normalizeDateValue(oportunidad.created_at),
    updated_at: normalizeDateValue(oportunidad.updated_at),
  });
}

export function toMobileAccionResumen(accion: CRMAccion) {
  return compactRecord({
    id: accion.id,
    cliente: compactRecord({
      id: accion.cliente_id,
      nombre: accion.cliente_nombre,
    }),
    oportunidad: compactRecord({
      id: accion.oportunidad_id,
      titulo: accion.oportunidad_titulo,
    }),
    responsable: compactRecord({
      id: accion.vendedor_id,
      nombre: accion.vendedor_nombre,
    }),
    tipo: accion.tipo,
    canal: accion.canal,
    titulo: accion.titulo,
    descripcion: accion.descripcion,
    resultado: accion.resultado,
    fecha_programada: normalizeDateValue(accion.fecha_programada),
    fecha_realizada: normalizeDateValue(accion.fecha_realizada),
    duracion_min: accion.duracion_min,
    estado: accion.estado,
    tags: accion.tags || [],
    updated_at: normalizeDateValue(accion.updatedAt),
    created_at: normalizeDateValue(accion.createdAt),
  });
}

export function appendOfflineNote(previousNotes: string | undefined, note: string, actor: string) {
  const entry = `[mobile:${actor}] ${new Date().toISOString()} ${note.trim()}`;
  return previousNotes?.trim() ? `${previousNotes.trim()}\n${entry}` : entry;
}

export function shouldIncludeCliente(
  cliente: ClienteCRM,
  query: string | null,
  responsableId: string | null
) {
  if (responsableId && cliente.responsable_id !== responsableId) return false;
  if (!query) return true;

  const haystack = [
    cliente.razon_social,
    cliente.nombre_comercial,
    cliente.cuit_cuil,
    cliente.email,
    cliente.telefono,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function shouldIncludeOportunidad(
  oportunidad: OportunidadCRM,
  filters: {
    estadoKanbanId: string | null;
    responsableId: string | null;
    clienteId: string | null;
  }
) {
  if (filters.estadoKanbanId && oportunidad.estado_kanban_id !== filters.estadoKanbanId) {
    return false;
  }
  if (filters.responsableId && oportunidad.vendedor_id !== filters.responsableId) {
    return false;
  }
  if (filters.clienteId && oportunidad.crm_organizacion_id !== filters.clienteId) {
    return false;
  }
  return true;
}

export function shouldIncludeAccion(
  accion: CRMAccion,
  filters: {
    responsableId: string | null;
    clienteId: string | null;
    oportunidadId: string | null;
    estado: string | null;
    fechaDesde: string | null;
  }
) {
  if (filters.responsableId && accion.vendedor_id !== filters.responsableId) return false;
  if (filters.clienteId && accion.cliente_id !== filters.clienteId) return false;
  if (filters.oportunidadId && accion.oportunidad_id !== filters.oportunidadId) return false;
  if (filters.estado && accion.estado !== filters.estado) return false;
  if (filters.fechaDesde) {
    const createdAt = normalizeDateValue(accion.createdAt);
    if (createdAt && createdAt < filters.fechaDesde) return false;
  }
  return true;
}

export function resolveClienteTipo(tipo: string | undefined) {
  return Object.values(TipoCliente).includes(tipo as TipoCliente)
    ? (tipo as TipoCliente)
    : TipoCliente.POSIBLE_CLIENTE;
}
