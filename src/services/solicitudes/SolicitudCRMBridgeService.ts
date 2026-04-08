import { getAdminFirestore } from '@/lib/firebase/admin';
import { isCapabilityInstalled } from '@/lib/plugins/capabilityCheck';
import { ContactoCRMService } from '@/services/crm/ContactoCRMService';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import { TipoCliente } from '@/types/crm';
import type { Solicitud } from '@/types/solicitudes';

type CRMState = {
  id: string;
  nombre: string;
  color: string;
  orden: number;
};

type CRMClienteCandidate = {
  id: string;
  cuit_cuil?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  nombre_comercial?: string;
  razon_social?: string;
  responsable_id?: string;
  responsable_nombre?: string;
};

function normalizeDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return normalizeDigits(value);
}

function compactText(parts: Array<string | null | undefined>): string {
  return parts
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join('\n');
}

function extractProductLabel(solicitud: Solicitud): string {
  if (solicitud.tipo !== 'comercial') return solicitud.tipo;
  const product = solicitud.payload.producto_interes;
  return typeof product === 'string' && product.trim().length > 0
    ? product.trim()
    : 'Consulta comercial';
}

export class SolicitudCRMBridgeService {
  static async integrate(
    solicitudId: string,
    options?: {
      actor?: {
        uid?: string | null;
        email?: string | null;
        role?: string | null;
        source?: string | null;
      };
    }
  ): Promise<{
    bridged: boolean;
    reason?: 'crm_not_installed';
    crm_cliente_id: string | null;
    crm_contacto_id: string | null;
    crm_oportunidad_id: string | null;
  }> {
    const solicitud = await SolicitudService.getById(solicitudId);

    if (!solicitud) {
      throw new Error('Solicitud no encontrada para integrar con CRM');
    }

    if (solicitud.tipo !== 'comercial') {
      await SolicitudService.update(solicitud.id, {
        crm_sync_status: 'not_applicable',
        crm_sync_at: new Date(),
        crm_sync_error: null,
      });
      throw new Error('Solo las solicitudes comerciales se integran con CRM');
    }

    const db = getAdminFirestore();
    const hasCRM = await isCapabilityInstalled(
      db,
      solicitud.organization_id,
      'crm'
    );

    if (!hasCRM) {
      console.info('[SolicitudCRMBridgeService] CRM not installed, skipping bridge sync', {
        organizationId: solicitud.organization_id,
        solicitudId: solicitud.id,
      });

      await SolicitudService.update(solicitud.id, {
        crm_sync_status: 'capability_missing',
        crm_sync_at: new Date(),
        crm_sync_error: 'crm capability not installed for organization',
      });

      await SystemActivityLogService.logSystemAction({
        organization_id: solicitud.organization_id,
        occurred_at: new Date(),
        actor_type: 'system',
        actor_user_id: options?.actor?.uid || 'system',
        actor_display_name:
          options?.actor?.email || options?.actor?.source || 'SolicitudCRMBridgeService',
        actor_role: options?.actor?.role || 'system',
        source_module: options?.actor?.source || 'solicitudes',
        source_submodule: 'crm_bridge',
        channel: 'integration',
        entity_type: 'solicitud',
        entity_id: solicitud.id,
        entity_code: solicitud.numero,
        action_type: 'update',
        action_label: 'Solicitud sin conversion CRM por capability ausente',
        description: `Solicitud ${solicitud.numero} no convertida: la organizacion no tiene la capability crm.`,
        status: 'cancelled',
        severity: 'low',
        related_entities: [],
        correlation_id: null,
        metadata: {
          event_name: 'solicitud_conversion_crm_omitida',
          reason: 'crm_not_installed',
          solicitud_tipo: solicitud.tipo,
          solicitud_estado_operativo: solicitud.estado_operativo,
        },
      });

      return {
        bridged: false,
        reason: 'crm_not_installed',
        crm_cliente_id: solicitud.crm_cliente_id || null,
        crm_contacto_id: solicitud.crm_contacto_id || null,
        crm_oportunidad_id: solicitud.crm_oportunidad_id || null,
      };
    }

    if (solicitud.crm_oportunidad_id) {
      await SolicitudService.update(solicitud.id, {
        crm_sync_status: 'synced',
        crm_sync_at: new Date(),
        crm_sync_error: null,
      });
      await this.logInteroperableConversionEvent({
        solicitud,
        crm_cliente_id: solicitud.crm_cliente_id || null,
        crm_contacto_id: solicitud.crm_contacto_id || null,
        crm_oportunidad_id: solicitud.crm_oportunidad_id || null,
        actor: options?.actor,
      });
      return {
        bridged: true,
        crm_cliente_id: solicitud.crm_cliente_id || null,
        crm_contacto_id: solicitud.crm_contacto_id || null,
        crm_oportunidad_id: solicitud.crm_oportunidad_id || null,
      };
    }

    try {
      const crmState = await this.getOrCreateDefaultCRMState(
        solicitud.organization_id
      );
      const cliente = await this.findOrCreateCliente(solicitud, crmState.id);
      const contactoId = await this.findOrCreateContacto(solicitud, cliente.id);
      const oportunidad = await this.createOportunidad(
        solicitud,
        cliente,
        contactoId,
        crmState
      );

      await SolicitudService.update(solicitud.id, {
        crm_cliente_id: cliente.id,
        crm_contacto_id: contactoId,
        crm_oportunidad_id: oportunidad.id,
        crm_sync_status: 'synced',
        crm_sync_at: new Date(),
        crm_sync_error: null,
      });

      await this.logInteroperableConversionEvent({
        solicitud,
        crm_cliente_id: cliente.id,
        crm_contacto_id: contactoId,
        crm_oportunidad_id: oportunidad.id,
        actor: options?.actor,
      });

      return {
        bridged: true,
        crm_cliente_id: cliente.id,
        crm_contacto_id: contactoId,
        crm_oportunidad_id: oportunidad.id,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error integrando solicitud con CRM';

      await SolicitudService.update(solicitud.id, {
        crm_sync_status: 'error',
        crm_sync_at: new Date(),
        crm_sync_error: message,
      });

      throw error;
    }
  }

  private static async logInteroperableConversionEvent(params: {
    solicitud: Solicitud;
    crm_cliente_id: string | null;
    crm_contacto_id: string | null;
    crm_oportunidad_id: string | null;
    actor?: {
      uid?: string | null;
      email?: string | null;
      role?: string | null;
      source?: string | null;
    };
  }) {
    await SystemActivityLogService.logUserAction({
      organization_id: params.solicitud.organization_id,
      occurred_at: new Date(),
      actor_user_id: params.actor?.uid || 'system',
      actor_display_name:
        params.actor?.email || params.actor?.source || 'SolicitudCRMBridgeService',
      actor_role: params.actor?.role || 'system',
      source_module: params.actor?.source || 'solicitudes',
      source_submodule: 'crm_bridge',
      channel: 'integration',
      entity_type: 'solicitud',
      entity_id: params.solicitud.id,
      entity_code: params.solicitud.numero,
      action_type: 'update',
      action_label: 'Solicitud convertida a oportunidad CRM',
      description: `Solicitud ${params.solicitud.numero} convertida a oportunidad CRM.`,
      status: 'success',
      severity: 'info',
      related_entities: [
        {
          entity_type: 'crm_cliente',
          entity_id: params.crm_cliente_id || '',
          relation: 'target_cliente',
        },
        {
          entity_type: 'crm_contacto',
          entity_id: params.crm_contacto_id || '',
          relation: 'target_contacto',
        },
        {
          entity_type: 'crm_oportunidad',
          entity_id: params.crm_oportunidad_id || '',
          relation: 'target_oportunidad',
        },
      ].filter(entity => entity.entity_id),
      correlation_id: null,
      metadata: {
        event_name: 'solicitud_convertida_a_oportunidad',
        solicitud_tipo: params.solicitud.tipo,
        solicitud_estado_operativo: params.solicitud.estado_operativo,
        crm_cliente_id: params.crm_cliente_id,
        crm_contacto_id: params.crm_contacto_id,
        crm_oportunidad_id: params.crm_oportunidad_id,
      },
    });
  }

  private static async getOrCreateDefaultCRMState(
    organizationId: string
  ): Promise<CRMState> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('crm_kanban_estados')
      .where('organization_id', '==', organizationId)
      .where('tipo', '==', 'crm')
      .get();

    if (!snapshot.empty) {
      const estados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => Number(a.orden || 0) - Number(b.orden || 0));
      const estado = estados[0] as CRMState;
      return {
        id: estado.id,
        nombre: estado.nombre,
        color: estado.color,
        orden: estado.orden,
      };
    }

    const defaults = [
      { nombre: 'Prospecto', color: '#94a3b8', orden: 0 },
      { nombre: 'Contactado', color: '#60a5fa', orden: 1 },
      { nombre: 'Propuesta', color: '#fbbf24', orden: 2 },
      { nombre: 'Negociacion', color: '#f97316', orden: 3 },
      { nombre: 'Cerrado', color: '#22c55e', orden: 4 },
    ];

    const batch = db.batch();
    const refs = defaults.map(estado => {
      const ref = db.collection('crm_kanban_estados').doc();
      batch.set(ref, {
        ...estado,
        organization_id: organizationId,
        tipo: 'crm',
        created_at: new Date().toISOString(),
      });
      return { ref, ...estado };
    });
    await batch.commit();

    return {
      id: refs[0].ref.id,
      nombre: refs[0].nombre,
      color: refs[0].color,
      orden: refs[0].orden,
    };
  }

  private static async findOrCreateCliente(
    solicitud: Solicitud,
    estadoKanbanId: string
  ): Promise<{
    id: string;
    razon_social: string;
    cuit_cuil: string;
    responsable_id: string;
    responsable_nombre: string;
  }> {
    const db = getAdminFirestore();
    const collection = db.collection('crm_organizaciones');
    const organizationId = solicitud.organization_id;
    const cuit = normalizeDigits(solicitud.cuit);
    const email = normalizeEmail(solicitud.email);
    const telefono = normalizePhone(solicitud.telefono);

    const candidates = await collection
      .where('organization_id', '==', organizationId)
      .where('isActive', '==', true)
      .get();

    const docs: CRMClienteCandidate[] = candidates.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<CRMClienteCandidate, 'id'>),
    }));

    const matched =
      (cuit
        ? docs.find(
            item => normalizeDigits(String(item.cuit_cuil || '')) === cuit
          )
        : undefined) ||
      (email
        ? docs.find(item => normalizeEmail(String(item.email || '')) === email)
        : undefined) ||
      (telefono
        ? docs.find(
            item => normalizePhone(String(item.telefono || '')) === telefono
          )
        : undefined);

    const now = new Date().toISOString();
    const razonSocial = solicitud.nombre;

    if (matched) {
      const patch: Record<string, unknown> = {
        updated_at: now,
        ultima_interaccion: now,
      };

      if (!matched.email && solicitud.email) patch.email = solicitud.email;
      if (!matched.telefono && solicitud.telefono)
        patch.telefono = solicitud.telefono;
      if (!matched.cuit_cuil && solicitud.cuit)
        patch.cuit_cuil = solicitud.cuit;
      if (!matched.notas && solicitud.mensaje) patch.notas = solicitud.mensaje;
      if (!matched.nombre_comercial) patch.nombre_comercial = solicitud.nombre;

      if (Object.keys(patch).length > 2) {
        await collection.doc(matched.id).update(patch);
      }

      return {
        id: matched.id,
        razon_social: String(matched.razon_social || solicitud.nombre),
        cuit_cuil: String(matched.cuit_cuil || solicitud.cuit || ''),
        responsable_id: String(matched.responsable_id || 'system'),
        responsable_nombre: String(
          matched.responsable_nombre || 'Solicitud dealer'
        ),
      };
    }

    const payload = {
      organization_id: organizationId,
      razon_social: razonSocial,
      nombre_comercial: solicitud.nombre,
      cuit_cuil: solicitud.cuit || '',
      tipo_cliente: TipoCliente.POSIBLE_CLIENTE,
      email: solicitud.email || '',
      telefono: solicitud.telefono || '',
      estado_kanban_id: estadoKanbanId,
      responsable_id: 'system',
      responsable_nombre: 'Solicitud dealer',
      isActive: true,
      fecha_registro: now,
      ultima_interaccion: now,
      notas: compactText([
        solicitud.mensaje,
        typeof solicitud.payload.comentarios === 'string'
          ? solicitud.payload.comentarios
          : null,
      ]),
      created_at: now,
      updated_at: now,
    };

    const docRef = await collection.add(payload);

    return {
      id: docRef.id,
      razon_social: payload.razon_social,
      cuit_cuil: payload.cuit_cuil,
      responsable_id: payload.responsable_id,
      responsable_nombre: payload.responsable_nombre,
    };
  }

  private static async findOrCreateContacto(
    solicitud: Solicitud,
    crmOrganizacionId: string
  ): Promise<string | null> {
    const telefono = solicitud.telefono?.trim();
    if (!telefono && !solicitud.email) return null;

    const contactos = await ContactoCRMService.getByOrganizacionCRM(
      solicitud.organization_id,
      crmOrganizacionId
    );

    const email = normalizeEmail(solicitud.email);
    const phone = normalizePhone(solicitud.telefono);

    const matched =
      (email
        ? contactos.find(
            contacto => normalizeEmail(contacto.email || '') === email
          )
        : undefined) ||
      (phone
        ? contactos.find(
            contacto =>
              normalizePhone(contacto.telefono || contacto.whatsapp || '') ===
              phone
          )
        : undefined);

    if (matched) return matched.id;

    if (!telefono) return null;

    const contacto = await ContactoCRMService.create(
      solicitud.organization_id,
      {
        nombre: solicitud.nombre,
        email: solicitud.email || undefined,
        telefono,
        whatsapp: telefono,
        empresa: solicitud.nombre,
        crm_organizacion_id: crmOrganizacionId,
        notas: `Creado automaticamente desde solicitud ${solicitud.numero}`,
      }
    );

    return contacto.id;
  }

  private static async createOportunidad(
    solicitud: Solicitud,
    cliente: {
      id: string;
      razon_social: string;
      cuit_cuil: string;
      responsable_id: string;
      responsable_nombre: string;
    },
    contactoId: string | null,
    crmState: CRMState
  ) {
    const productLabel = extractProductLabel(solicitud);
    const requiereFinanciacion =
      solicitud.payload.requiere_financiacion === true ? 'Si' : 'No';
    const descripcion = compactText([
      `Solicitud dealer ${solicitud.numero}`,
      `Producto: ${productLabel}`,
      `Financiacion: ${requiereFinanciacion}`,
      solicitud.mensaje,
      typeof solicitud.payload.comentarios === 'string'
        ? solicitud.payload.comentarios
        : null,
    ]);

    return OportunidadesService.crear(solicitud.organization_id, 'system', {
      nombre: `Solicitud comercial - ${productLabel}`,
      descripcion,
      crm_organizacion_id: cliente.id,
      organizacion_nombre: cliente.razon_social,
      organizacion_cuit: cliente.cuit_cuil || undefined,
      contacto_id: contactoId || undefined,
      contacto_nombre: solicitud.nombre,
      vendedor_id: cliente.responsable_id || 'system',
      vendedor_nombre: cliente.responsable_nombre || 'Solicitud dealer',
      estado_kanban_id: crmState.id,
      estado_kanban_nombre: crmState.nombre,
      estado_kanban_color: crmState.color,
      monto_estimado: 0,
      probabilidad: 30,
      productos_interes: [productLabel],
      origen_solicitud: {
        solicitud_id: solicitud.id,
        solicitud_numero: solicitud.numero,
        solicitud_tipo: 'comercial',
      },
    });
  }
}
