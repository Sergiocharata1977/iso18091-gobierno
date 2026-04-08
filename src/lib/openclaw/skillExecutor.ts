import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  OpenClawExecuteResponse,
  OpenClawSkillManifest,
} from '@/types/openclaw';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

function coerceLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(value)));
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') return value;
  return null;
}

function truncateLine(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

async function executeOpenSolicitudes(
  params: Record<string, unknown>,
  orgId: string
): Promise<OpenClawExecuteResponse> {
  const db = getAdminFirestore();
  const limit = coerceLimit(params.limit);
  const tipo =
    typeof params.tipo === 'string' && params.tipo.trim().length > 0
      ? params.tipo.trim()
      : null;

  let query = db
    .collection('solicitudes')
    .where('organization_id', '==', orgId)
    .where('estado_operativo', '==', 'ingresada');

  if (tipo) {
    query = query.where('tipo', '==', tipo);
  }

  const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();

  const items = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      numero:
        typeof data.numero === 'string' && data.numero.trim().length > 0
          ? data.numero
          : doc.id,
      tipo: typeof data.tipo === 'string' ? data.tipo : 'sin_tipo',
      nombre: typeof data.nombre === 'string' ? data.nombre : 'Sin nombre',
      prioridad:
        typeof data.prioridad === 'string' ? data.prioridad : 'sin prioridad',
      created_at: toDateString(data.created_at),
    };
  });

  if (items.length === 0) {
    return {
      success: true,
      skill_id: 'ver_solicitudes_abiertas',
      data: { total: 0, items: [] },
      message: tipo
        ? `No hay solicitudes abiertas de tipo ${tipo} para esta organizacion.`
        : 'No hay solicitudes abiertas para esta organizacion.',
    };
  }

  const resumen = items
    .map(item => {
      const fecha = item.created_at ? `, creada ${item.created_at}` : '';
      return `- ${item.numero}: ${item.nombre} (${item.tipo}, prioridad ${item.prioridad}${fecha})`;
    })
    .join('\n');

  return {
    success: true,
    skill_id: 'ver_solicitudes_abiertas',
    data: { total: items.length, items },
    message: `Encontre ${items.length} solicitudes abiertas${
      tipo ? ` de tipo ${tipo}` : ''
    }.\n${resumen}`,
  };
}

async function executeOpenFindings(
  params: Record<string, unknown>,
  orgId: string
): Promise<OpenClawExecuteResponse> {
  const db = getAdminFirestore();
  const limit = coerceLimit(params.limit);
  const requestedStatus =
    typeof params.status === 'string' ? params.status.trim().toLowerCase() : '';

  let query = db
    .collection('findings')
    .where('organization_id', '==', orgId)
    .where('isActive', '==', true);

  if (requestedStatus === 'closed' || requestedStatus === 'cerrado') {
    query = query.where('status', '==', 'cerrado');
  } else {
    query = query.where('status', 'in', ['registrado', 'en_tratamiento']);
  }

  if (typeof params.year === 'number' && Number.isInteger(params.year)) {
    const start = new Date(Date.UTC(params.year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999));
    query = query.where('createdAt', '>=', start).where('createdAt', '<=', end);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();

  const items = snapshot.docs.map(doc => {
    const data = doc.data();
    const registration =
      data.registration && typeof data.registration === 'object'
        ? (data.registration as Record<string, unknown>)
        : {};

    return {
      id: doc.id,
      findingNumber:
        typeof data.findingNumber === 'string' ? data.findingNumber : doc.id,
      status: typeof data.status === 'string' ? data.status : 'sin_estado',
      name:
        typeof registration.name === 'string'
          ? registration.name
          : 'Hallazgo sin titulo',
      sourceType:
        typeof registration.sourceType === 'string'
          ? registration.sourceType
          : 'otro',
      createdAt: toDateString(data.createdAt),
    };
  });

  if (items.length === 0) {
    return {
      success: true,
      skill_id: 'ver_no_conformidades',
      data: { total: 0, items: [] },
      message:
        requestedStatus === 'closed' || requestedStatus === 'cerrado'
          ? 'No hay no conformidades cerradas para esta organizacion.'
          : 'No hay no conformidades abiertas para esta organizacion.',
    };
  }

  const resumen = items
    .map(item => {
      const fecha = item.createdAt ? `, creado ${item.createdAt}` : '';
      return `- ${item.findingNumber}: ${item.name} (${item.status}, origen ${item.sourceType}${fecha})`;
    })
    .join('\n');

  return {
    success: true,
    skill_id: 'ver_no_conformidades',
    data: { total: items.length, items },
    message: `Encontre ${items.length} no conformidades ${
      requestedStatus === 'closed' || requestedStatus === 'cerrado'
        ? 'cerradas'
        : 'abiertas'
    }.\n${resumen}`,
  };
}

async function executeActiveOpportunities(
  params: Record<string, unknown>,
  orgId: string
): Promise<OpenClawExecuteResponse> {
  const db = getAdminFirestore();
  const limit = coerceLimit(params.limit);

  let query = db
    .collection('crm_oportunidades')
    .where('organization_id', '==', orgId)
    .where('isActive', '==', true);

  if (
    typeof params.vendedor_id === 'string' &&
    params.vendedor_id.trim().length > 0
  ) {
    query = query.where('vendedor_id', '==', params.vendedor_id.trim());
  }

  if (
    typeof params.estado_kanban_id === 'string' &&
    params.estado_kanban_id.trim().length > 0
  ) {
    query = query.where('estado_kanban_id', '==', params.estado_kanban_id.trim());
  }

  const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();

  const items = snapshot.docs.map(doc => {
    const data = doc.data();
    const monto =
      typeof data.monto_estimado === 'number' ? data.monto_estimado : 0;

    return {
      id: doc.id,
      nombre: typeof data.nombre === 'string' ? data.nombre : 'Sin nombre',
      organizacion_nombre:
        typeof data.organizacion_nombre === 'string'
          ? data.organizacion_nombre
          : 'Cliente sin nombre',
      vendedor_nombre:
        typeof data.vendedor_nombre === 'string'
          ? data.vendedor_nombre
          : 'Sin vendedor',
      estado_kanban_nombre:
        typeof data.estado_kanban_nombre === 'string'
          ? data.estado_kanban_nombre
          : 'Sin etapa',
      monto_estimado: monto,
      probabilidad:
        typeof data.probabilidad === 'number' ? data.probabilidad : null,
      created_at: toDateString(data.created_at),
    };
  });

  if (items.length === 0) {
    return {
      success: true,
      skill_id: 'ver_oportunidades_activas',
      data: { total: 0, items: [] },
      message: 'No hay oportunidades activas para esta organizacion.',
    };
  }

  const resumen = items
    .map(item => {
      const monto =
        item.monto_estimado > 0
          ? `, monto estimado ${item.monto_estimado}`
          : '';
      const probabilidad =
        item.probabilidad !== null ? `, probabilidad ${item.probabilidad}%` : '';
      const fecha = item.created_at ? `, creada ${item.created_at}` : '';

      return `- ${truncateLine(item.nombre, 80)} para ${item.organizacion_nombre} (${item.estado_kanban_nombre}, vendedor ${item.vendedor_nombre}${monto}${probabilidad}${fecha})`;
    })
    .join('\n');

  return {
    success: true,
    skill_id: 'ver_oportunidades_activas',
    data: { total: items.length, items },
    message: `Encontre ${items.length} oportunidades activas en el pipeline CRM.\n${resumen}`,
  };
}

// Ejecuta una skill read-only internamente
// Llama al api_endpoint definido en el manifest usando fetch interno o service directo
// Retorna OpenClawExecuteResponse con message en lenguaje natural
export async function executeReadSkill(
  skill: OpenClawSkillManifest,
  params: Record<string, unknown>,
  orgId: string
): Promise<OpenClawExecuteResponse> {
  switch (skill.skill_id) {
    case 'ver_solicitudes_abiertas':
      return executeOpenSolicitudes(params, orgId);
    case 'ver_no_conformidades':
      return executeOpenFindings(params, orgId);
    case 'ver_oportunidades_activas':
      return executeActiveOpportunities(params, orgId);
    default:
      throw new Error(`Read skill "${skill.skill_id}" not implemented yet`);
  }
}

export async function executeWriteSkill(
  skill: OpenClawSkillManifest,
  _params: Record<string, unknown>,
  _orgId: string
): Promise<OpenClawExecuteResponse> {
  switch (skill.skill_id) {
    default:
      throw new Error(`Write skill "${skill.skill_id}" not implemented yet`);
  }
}
