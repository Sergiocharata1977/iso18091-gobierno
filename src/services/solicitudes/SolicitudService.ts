import { getAdminFirestore } from '@/lib/firebase/admin';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  CreateSolicitudInput,
  SolicitudCommercialReference,
  Solicitud,
  SolicitudCRMSyncStatus,
  SolicitudFilters,
  SolicitudFlujo,
  UpdateSolicitudInput,
} from '@/types/solicitudes';
import {
  isSolicitudOperationalStatusAllowed,
  resolveSolicitudEstadoLegacy,
  resolveSolicitudEstadoOperativo,
  resolveSolicitudFlujo,
} from '@/types/solicitudes';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'solicitudes';

function timestampToDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeSolicitud(
  id: string,
  data: Record<string, unknown>
): Solicitud {
  const tipo = data.tipo as Solicitud['tipo'];
  const legacyEstado = data.estado as Solicitud['estado'];
  const flujo =
    typeof data.flujo === 'string'
      ? (data.flujo as SolicitudFlujo)
      : resolveSolicitudFlujo(tipo);
  const estadoOperativo =
    typeof data.estado_operativo === 'string'
      ? resolveSolicitudEstadoOperativo(
          tipo,
          legacyEstado,
          data.estado_operativo as Solicitud['estado_operativo']
        )
      : resolveSolicitudEstadoOperativo(tipo, legacyEstado);

  return {
    id,
    numero: String(data.numero || ''),
    organization_id: String(data.organization_id || ''),
    tipo,
    flujo,
    estado: resolveSolicitudEstadoLegacy(tipo, estadoOperativo, legacyEstado),
    estado_operativo: estadoOperativo,
    prioridad: (data.prioridad as Solicitud['prioridad']) || null,
    nombre: String(data.nombre || ''),
    telefono: typeof data.telefono === 'string' ? data.telefono : null,
    email: typeof data.email === 'string' ? data.email : null,
    cuit: typeof data.cuit === 'string' ? data.cuit : null,
    mensaje: typeof data.mensaje === 'string' ? data.mensaje : null,
    payload:
      data.payload && typeof data.payload === 'object'
        ? (data.payload as Record<string, unknown>)
        : {},
    origen: String(data.origen || 'public_api'),
    assigned_to: typeof data.assigned_to === 'string' ? data.assigned_to : null,
    crm_cliente_id:
      typeof data.crm_cliente_id === 'string' ? data.crm_cliente_id : null,
    crm_contacto_id:
      typeof data.crm_contacto_id === 'string' ? data.crm_contacto_id : null,
    crm_oportunidad_id:
      typeof data.crm_oportunidad_id === 'string'
        ? data.crm_oportunidad_id
        : null,
    crm_sync_status:
      typeof data.crm_sync_status === 'string'
        ? (data.crm_sync_status as SolicitudCRMSyncStatus)
        : null,
    crm_sync_at: data.crm_sync_at ? timestampToDate(data.crm_sync_at) : null,
    crm_sync_error:
      typeof data.crm_sync_error === 'string' ? data.crm_sync_error : null,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
  };
}

async function generateSolicitudNumber(
  db: Firestore,
  organizationId: string,
  tipo: string
): Promise<string> {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const prefix = tipo.slice(0, 3).toUpperCase();
  // Clave por org + tipo + mes → reinicia secuencia cada mes
  const counterKey = `${organizationId}_${prefix}_${yyyy}${mm}`;
  const counterRef = db.collection('solicitud_counters').doc(counterKey);

  const seq = await db.runTransaction(async tx => {
    const snap = await tx.get(counterRef);
    const next = snap.exists ? ((snap.data()?.seq as number) || 0) + 1 : 1;
    tx.set(counterRef, { seq: next, updated_at: Timestamp.now() }, { merge: true });
    return next;
  });

  // Formato: SOL-REP-202603-0001
  return `SOL-${prefix}-${yyyy}${mm}-${String(seq).padStart(4, '0')}`;
}

export class SolicitudService {
  static async create(input: CreateSolicitudInput): Promise<{
    solicitud: Solicitud;
    postCreateHook: Record<string, unknown>;
  }> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const docRef = db.collection(COLLECTION).doc();
    const flujo = resolveSolicitudFlujo(input.tipo);
    const estadoOperativo = resolveSolicitudEstadoOperativo(
      input.tipo,
      'recibida'
    );

    const docData = {
      numero: await generateSolicitudNumber(db, input.organization_id, input.tipo),
      organization_id: input.organization_id,
      tipo: input.tipo,
      estado: 'recibida',
      flujo,
      estado_operativo: estadoOperativo,
      prioridad: input.prioridad || null,
      nombre: input.nombre,
      telefono: input.telefono || null,
      email: input.email || null,
      cuit: input.cuit || null,
      mensaje: input.mensaje || null,
      payload: input.payload || {},
      origen: input.origen || 'public_api',
      assigned_to: null,
      crm_cliente_id: null,
      crm_contacto_id: null,
      crm_oportunidad_id: null,
      crm_sync_status:
        input.tipo === 'comercial' ? 'pending' : 'not_applicable',
      crm_sync_at: null,
      crm_sync_error: null,
      created_at: now,
      updated_at: now,
    };

    await docRef.set(docData);

    return {
      solicitud: normalizeSolicitud(docRef.id, docData),
      postCreateHook: {
        event: 'solicitud.created',
        tipo: input.tipo,
        organization_id: input.organization_id,
        solicitud_id: docRef.id,
        comercial_crm_pending: input.tipo === 'comercial',
      },
    };
  }

  static async getById(id: string): Promise<Solicitud | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return normalizeSolicitud(doc.id, doc.data() || {});
  }

  static async list(filters: SolicitudFilters): Promise<Solicitud[]> {
    const db = getAdminFirestore();
    let query = db
      .collection(COLLECTION)
      .where('organization_id', '==', filters.organization_id);

    if (filters.tipo) {
      query = query.where('tipo', '==', filters.tipo);
    }

    if (filters.flujo) {
      query = query.where('flujo', '==', filters.flujo);
    }

    if (filters.estado) {
      query = query.where('estado', '==', filters.estado);
    }

    if (filters.estado_operativo) {
      query = query.where('estado_operativo', '==', filters.estado_operativo);
    }

    if (filters.dateFrom) {
      query = query.where(
        'created_at',
        '>=',
        Timestamp.fromDate(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      query = query.where(
        'created_at',
        '<=',
        Timestamp.fromDate(filters.dateTo)
      );
    }

    const snapshot = await query
      .orderBy('created_at', 'desc')
      .limit(filters.limit || 50)
      .get();

    return snapshot.docs.map(doc =>
      normalizeSolicitud(doc.id, doc.data() || {})
    );
  }

  static async listCommercialReferences(filters: {
    organization_id: string;
    limit?: number;
  }): Promise<SolicitudCommercialReference[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', filters.organization_id)
      .where('tipo', '==', 'comercial')
      .orderBy('created_at', 'desc')
      .limit(filters.limit || 10)
      .get();

    return snapshot.docs.map(doc => {
      const solicitud = normalizeSolicitud(doc.id, doc.data() || {});
      return {
        id: solicitud.id,
        numero: solicitud.numero,
        nombre: solicitud.nombre,
        created_at: solicitud.created_at,
        crm_oportunidad_id: solicitud.crm_oportunidad_id ?? null,
        crm_cliente_id: solicitud.crm_cliente_id ?? null,
        crm_sync_status: solicitud.crm_sync_status ?? null,
      };
    });
  }

  static async update(
    id: string,
    input: UpdateSolicitudInput
  ): Promise<Solicitud | null> {
    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const currentData = doc.data() || {};
    const tipo = currentData.tipo as Solicitud['tipo'];
    const currentLegacyEstado = currentData.estado as Solicitud['estado'];
    const estadoOperativo =
      input.estado_operativo !== undefined
        ? input.estado_operativo
        : resolveSolicitudEstadoOperativo(
            tipo,
            input.estado ?? currentLegacyEstado,
            (currentData.estado_operativo as Solicitud['estado_operativo']) ||
              null
          );

    if (
      input.estado_operativo !== undefined &&
      input.estado_operativo !== null &&
      !isSolicitudOperationalStatusAllowed(tipo, input.estado_operativo)
    ) {
      throw new Error(
        `El estado operativo ${input.estado_operativo} no corresponde al tipo ${tipo}`
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: Timestamp.now(),
    };

    if (input.estado !== undefined || input.estado_operativo !== undefined) {
      updateData.estado = resolveSolicitudEstadoLegacy(
        tipo,
        estadoOperativo,
        input.estado ?? currentLegacyEstado
      );
      updateData.estado_operativo = estadoOperativo;
    }
    if (input.prioridad !== undefined) updateData.prioridad = input.prioridad;
    if (input.assigned_to !== undefined)
      updateData.assigned_to = input.assigned_to;
    if (input.payload !== undefined) {
      updateData.payload = input.payload;
    }
    if (input.crm_cliente_id !== undefined) {
      updateData.crm_cliente_id = input.crm_cliente_id;
    }
    if (input.crm_contacto_id !== undefined) {
      updateData.crm_contacto_id = input.crm_contacto_id;
    }
    if (input.crm_oportunidad_id !== undefined) {
      updateData.crm_oportunidad_id = input.crm_oportunidad_id;
    }
    if (input.crm_sync_status !== undefined) {
      updateData.crm_sync_status = input.crm_sync_status;
    }
    if (input.crm_sync_at !== undefined) {
      updateData.crm_sync_at = input.crm_sync_at
        ? Timestamp.fromDate(input.crm_sync_at)
        : null;
    }
    if (input.crm_sync_error !== undefined) {
      updateData.crm_sync_error = input.crm_sync_error;
    }

    await docRef.update(updateData);

    const updated = await docRef.get();
    return normalizeSolicitud(updated.id, updated.data() || {});
  }
}
