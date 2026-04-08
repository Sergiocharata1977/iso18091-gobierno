/**
 * WhatsApp Service
 * Servicio principal para gesti贸n de WhatsApp con Firestore
 */

import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import {
  CircuitOpenError,
  WhatsAppCircuitBreaker,
} from '@/lib/whatsapp/CircuitBreaker';
import {
  RateLimitError,
  WhatsAppRateLimiter,
} from '@/lib/whatsapp/RateLimiter';
import { CreateAgentJobRequest } from '@/types/agents';
import type {
  EmployeeResponseContext,
  RhrResponseResult,
} from '@/types/whatsapp-rrhh';
import type {
  ConversationType,
  MessageStatus,
  SendMessageData,
  SendMessageResponse,
  TwilioWebhookPayload,
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/types/whatsapp';
import type { WhatsAppMediaAttachment, WhatsAppMediaType } from '@/types/whatsapp-media';
import { FieldValue } from 'firebase-admin/firestore';
import { AgentQueueService } from '../agents/AgentQueueService';
import { MediaHandler } from './MediaHandler';
import { RhrResponseProcessor } from './RhrResponseProcessor';
import { extractPhoneNumber, sendWhatsAppMessage } from './TwilioClient';

// Obtener instancia de Firestore
const getDb = () => getAdminFirestore();

// ============================================================================
// COLECCIONES
// ============================================================================

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const MESSAGES_COLLECTION = 'whatsapp_messages';
const CONTACTS_COLLECTION = 'whatsapp_contacts';

function resolveMediaTypeFromMime(mimeType?: string): WhatsAppMediaType {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

// ============================================================================
// CONVERSACIONES
// ============================================================================

/**
 * Busca una conversaci贸n existente por tel茅fono y organizaci贸n
 */
export async function findConversation(
  organizationId: string,
  phone: string
): Promise<WhatsAppConversation | null> {
  const cleanPhone = extractPhoneNumber(phone);

  const snapshot = await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('phone', '==', cleanPhone)
    .where('estado', '==', 'activa')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as WhatsAppConversation;
}

/**
 * Crea una nueva conversaci贸n
 */
export async function createConversation(data: {
  organization_id: string;
  type: ConversationType;
  phone: string;
  contact_name: string;
  cliente_id?: string;
  cliente_nombre?: string;
  vendedor_id?: string;
  vendedor_nombre?: string;
  accion_id?: string;
  auditoria_id?: string;
}): Promise<WhatsAppConversation> {
  const cleanPhone = extractPhoneNumber(data.phone);
  const now = new Date();

  const conversationData = {
    organization_id: data.organization_id,
    type: data.type,
    phone: cleanPhone,
    contact_name: data.contact_name,
    participantes: data.vendedor_id ? [data.vendedor_id] : [],
    cliente_id: data.cliente_id || null,
    cliente_nombre: data.cliente_nombre || null,
    vendedor_id: data.vendedor_id || null,
    vendedor_nombre: data.vendedor_nombre || null,
    accion_id: data.accion_id || null,
    auditoria_id: data.auditoria_id || null,
    ultimo_mensaje: '',
    ultimo_mensaje_at: now,
    mensajes_no_leidos: 0,
    estado: 'activa',
    created_at: now,
    updated_at: now,
  };

  const docRef = await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .add(conversationData);

  return {
    id: docRef.id,
    ...conversationData,
  } as unknown as WhatsAppConversation;
}

/**
 * Obtiene las conversaciones de una organizaci贸n
 */
export async function getConversations(
  organizationId: string,
  options?: {
    type?: ConversationType;
    clienteId?: string;
    limit?: number;
  }
): Promise<WhatsAppConversation[]> {
  let query = getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('estado', '==', 'activa')
    .orderBy('ultimo_mensaje_at', 'desc');

  if (options?.type) {
    query = query.where('type', '==', options.type);
  }

  if (options?.clienteId) {
    query = query.where('cliente_id', '==', options.clienteId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown[] as WhatsAppConversation[];
}

/**
 * Actualiza una conversaci贸n
 */
async function updateConversation(
  conversationId: string,
  data: Partial<WhatsAppConversation>
): Promise<void> {
  await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId)
    .update({
      ...data,
      updated_at: new Date(),
    });
}

// ============================================================================
// MENSAJES
// ============================================================================

/**
 * Env铆a un mensaje de WhatsApp
 * Crea la conversaci贸n si no existe
 */
export async function sendMessage(
  data: SendMessageData
): Promise<SendMessageResponse> {
  try {
    const db = getDb();

    // 1. Buscar o crear conversaci髇
    let conversation = data.conversation_id
      ? await getConversationById(data.conversation_id)
      : await findConversation(data.organization_id, data.to);

    if (!conversation) {
      conversation = await createConversation({
        organization_id: data.organization_id,
        type: data.cliente_id ? 'CRM' : 'INTERNAL',
        phone: data.to,
        contact_name: data.cliente_nombre || 'Desconocido',
        cliente_id: data.cliente_id,
        cliente_nombre: data.cliente_nombre,
        vendedor_id: data.sender_user_id,
        vendedor_nombre: data.sender_name,
        accion_id: data.accion_id,
        auditoria_id: data.auditoria_id,
      });
    }

    // 2. Rate limiting + circuit breaker antes del env韔 saliente
    const rateLimiter = new WhatsAppRateLimiter(db, {
      max_per_hour: 100,
      max_per_minute: 10,
    });
    await rateLimiter.checkAndIncrement(data.organization_id);

    const breaker = new WhatsAppCircuitBreaker(db, {
      failure_threshold: 5,
      success_threshold: 2,
      timeout_ms: 60_000,
    });

    const twilioResult = await breaker.execute(async () => {
      const result = await sendWhatsAppMessage(data.to, data.body, data.media_url);

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido de Twilio');
      }

      return result;
    });

    // 3. Guardar mensaje en Firestore
    const messageData: Omit<WhatsAppMessage, 'id'> = {
      conversation_id: conversation.id,
      organization_id: data.organization_id,
      direction: 'OUTBOUND',
      from: process.env.TWILIO_WHATSAPP_NUMBER || '',
      to: extractPhoneNumber(data.to),
      type: data.type || 'text',
      body: data.body,
      media_url: data.media_url,
      template_name: data.template_name,
      template_variables: data.template_variables,
      sender_user_id: data.sender_user_id,
      sender_name: data.sender_name,
      status: 'sent',
      status_updated_at: new Date(),
      twilio_sid: twilioResult.messageSid,
      created_at: new Date(),
    };

    const messageRef = await getDb()
      .collection(MESSAGES_COLLECTION)
      .add(messageData);

    // 4. Actualizar la conversaci髇
    await updateConversation(conversation.id, {
      ultimo_mensaje: data.body.substring(0, 100),
      ultimo_mensaje_at: new Date(),
    });

    // 5. Crear Acci髇 CRM autom醫ica
    try {
      const nuevaAccion = {
        organization_id: data.organization_id,
        cliente_id: data.cliente_id || null,
        cliente_nombre: data.cliente_nombre || null,
        oportunidad_id: null, // Podr韆mos pasarlo si data lo tuviera
        tipo: 'whatsapp',
        canal: 'whatsapp',
        titulo: `WhatsApp Saliente: ${data.to}`,
        descripcion: data.body,
        resultado: 'enviado',
        fecha_programada: new Date().toISOString(),
        fecha_realizada: new Date().toISOString(),
        vendedor_id: data.sender_user_id,
        vendedor_nombre: data.sender_name,
        estado: 'completada',
        whatsapp_message_sid: twilioResult.messageSid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: data.sender_user_id,
      };

      await db
        .collection('organizations')
        .doc(data.organization_id)
        .collection('crm_acciones')
        .add(nuevaAccion);
    } catch (actionError) {
      console.error(
        '[WhatsAppService] Error creando acci髇 CRM autom醫ica:',
        actionError
      );
      // No fallamos el env韔 si falla el registro de la acci髇, es un efecto secundario
    }

    return {
      success: true,
      message_id: messageRef.id,
      twilio_sid: twilioResult.messageSid,
      conversation_id: conversation.id,
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        success: false,
        error: 'rate_limit',
        retry_after_seconds: error.retry_after,
      };
    }

    if (error instanceof CircuitOpenError) {
      return {
        success: false,
        error: 'service_unavailable',
        retry_after_seconds: error.retry_after || 60,
      };
    }

    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('[WhatsAppService] Error enviando mensaje:', error);
    return {
      success: false,
      error: message,
    };
  }
}
/**
 * Obtiene una conversaci贸n por ID
 */
async function getConversationById(
  conversationId: string
): Promise<WhatsAppConversation | null> {
  const doc = await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as WhatsAppConversation;
}

/**
 * Obtiene los mensajes de una conversaci贸n
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; beforeId?: string }
): Promise<WhatsAppMessage[]> {
  let query = getDb()
    .collection(MESSAGES_COLLECTION)
    .where('conversation_id', '==', conversationId)
    .orderBy('created_at', 'desc');

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown[] as WhatsAppMessage[];
}

export async function handleEmployeeResponse(
  context: Omit<EmployeeResponseContext, 'detected_intent' | 'confidence'>
): Promise<RhrResponseResult> {
  const processor = new RhrResponseProcessor(getDb());
  const { intent, confidence } = processor.detectIntent(context.message_text);
  return processor.process({
    ...context,
    detected_intent: intent,
    confidence,
  });
}

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * Procesa un mensaje entrante del webhook de Twilio
 */
export async function handleIncomingMessage(
  payload: TwilioWebhookPayload,
  organizationId: string
): Promise<void> {
  const fromPhone = extractPhoneNumber(payload.From);
  const toPhone = extractPhoneNumber(payload.To);

  // 1. Buscar conversaci贸n existente
  let conversation = await findConversation(organizationId, fromPhone);

  if (!conversation) {
    // Crear nueva conversaci贸n para mensaje entrante
    conversation = await createConversation({
      organization_id: organizationId,
      type: 'CRM',
      phone: fromPhone,
      contact_name: 'Nuevo contacto',
    });
  }

  const hasIncomingMedia = Boolean(
    payload.NumMedia && parseInt(payload.NumMedia, 10) > 0
  );
  let mediaAttachment: WhatsAppMediaAttachment | undefined;

  if (hasIncomingMedia && payload.MediaUrl0 && process.env.WHATSAPP_ACCESS_TOKEN) {
    try {
      // Si viene un media_id de Meta, lo persistimos en Firebase Storage.
      const isMetaMediaId = /^\d+$/.test(payload.MediaUrl0);
      if (isMetaMediaId) {
        const mediaHandler = new MediaHandler(
          getAdminStorage(),
          process.env.WHATSAPP_ACCESS_TOKEN
        );
        mediaAttachment = await mediaHandler.processMediaMessage(
          payload.MediaUrl0,
          resolveMediaTypeFromMime(payload.MediaContentType0),
          payload.MediaContentType0 || 'application/octet-stream',
          organizationId
        );
      }
    } catch (mediaError) {
      console.warn('[WhatsAppService] No se pudo procesar media adjunta:', mediaError);
    }
  }

  // 2. Guardar mensaje entrante
  const messageData: Omit<WhatsAppMessage, 'id'> & {
    media?: WhatsAppMediaAttachment;
    has_media?: boolean;
  } = {
    conversation_id: conversation.id,
    organization_id: organizationId,
    direction: 'INBOUND',
    from: fromPhone,
    to: toPhone,
    type: hasIncomingMedia ? 'media' : 'text',
    body: payload.Body || '',
    media_url: payload.MediaUrl0,
    media_type: payload.MediaContentType0,
    status: 'delivered',
    status_updated_at: new Date(),
    twilio_sid: payload.MessageSid,
    created_at: new Date(),
    has_media: hasIncomingMedia,
    media: mediaAttachment,
  };

  const messageRef = await getDb()
    .collection(MESSAGES_COLLECTION)
    .add(messageData);

  // 3. Actualizar conversaci贸n
  await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversation.id)
    .update({
      ultimo_mensaje: (payload.Body || '').substring(0, 100),
      ultimo_mensaje_at: new Date(),
      mensajes_no_leidos: FieldValue.increment(1),
      updated_at: new Date(),
    });
  // 3.5. Encolar Job para el Agente (SI tiene vendedor asignado)
  if (conversation.vendedor_id) {
    try {
      const jobRequest: CreateAgentJobRequest = {
        organization_id: organizationId,
        user_id: conversation.vendedor_id,
        intent: 'whatsapp.message.received',
        payload: {
          phone_e164: fromPhone,
          message_text: payload.Body || '',
          conversation_id: conversation.id,
          message_id: messageRef.id,
          organization_id: organizationId,
          body: payload.Body || '',
          from: fromPhone,
          media_url: payload.MediaUrl0,
          timestamp: new Date().toISOString(),
        },
        priority: 'high',
      };

      // Encolamos el trabajo para la instancia del agente del vendedor
      await AgentQueueService.enqueueJob(jobRequest, conversation.vendedor_id);

      console.log(
        `[WhatsAppService] Job encolado para agente ${conversation.vendedor_id}`
      );
    } catch (jobError) {
      console.error(
        '[WhatsAppService] Error encolando job de agente:',
        jobError
      );
      // No fallamos el webhook, es un proceso secundario
    }
  }

  // 4. Crear Acci贸n CRM autom谩tica (Inbound)
  try {
    const db = getDb();

    // Intentar buscar responsable (vendedor) de la conversaci贸n o cliente
    const vendedorId = conversation.vendedor_id || 'system';
    const vendedorNombre = conversation.vendedor_nombre || 'Sistema';

    const nuevaAccion = {
      organization_id: organizationId,
      cliente_id: conversation.cliente_id || null,
      cliente_nombre: conversation.cliente_nombre || null,
      oportunidad_id: null,
      tipo: 'whatsapp',
      canal: 'whatsapp',
      titulo: `WhatsApp Entrante: ${conversation.contact_name || fromPhone}`,
      descripcion: payload.Body || '[Mensaje Multimedia]',
      resultado: 'recibido',
      fecha_programada: new Date().toISOString(),
      fecha_realizada: new Date().toISOString(),
      vendedor_id: vendedorId,
      vendedor_nombre: vendedorNombre,
      estado: 'completada',
      whatsapp_message_sid: payload.MessageSid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system_webhook',
    };

    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('crm_acciones')
      .add(nuevaAccion);
  } catch (actionError) {
    console.error(
      '[WhatsAppService] Error creando acci贸n CRM autom谩tica (Inbound):',
      actionError
    );
  }

  console.log(
    `[WhatsAppService] Mensaje entrante procesado: ${payload.MessageSid}`
  );
}

/**
 * Procesa actualizaci贸n de estado de mensaje
 */
export async function handleStatusUpdate(
  messageSid: string,
  status: MessageStatus,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  const snapshot = await getDb()
    .collection(MESSAGES_COLLECTION)
    .where('twilio_sid', '==', messageSid)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(
      `[WhatsAppService] Mensaje no encontrado para status update: ${messageSid}`
    );
    return;
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({
    status,
    status_updated_at: new Date(),
    error_code: errorCode || null,
    error_message: errorMessage || null,
  });

  console.log(
    `[WhatsAppService] Estado actualizado: ${messageSid} -> ${status}`
  );
}

export async function sendTaskAssignment(
  organizationId: string,
  taskId: string,
  responsablePhone: string,
  responsableNombre: string,
  taskTitulo: string,
  taskTipo: string,
  fechaProgramada: string
): Promise<SendMessageResponse> {
  const mensaje = [
    '馃搵 *Nueva tarea asignada*',
    `Responsable: ${responsableNombre}`,
    `Tarea: ${taskTitulo}`,
    `Tipo: ${taskTipo}`,
    `Fecha: ${fechaProgramada}`,
    'Responde "OK" para confirmar recepcion.',
  ].join('\n');

  return sendMessage({
    organization_id: organizationId,
    to: responsablePhone,
    body: mensaje,
    sender_user_id: 'system',
    sender_name: 'Sistema CRM',
    type: 'text',
    template_name: 'task.assign',
    template_variables: [taskId],
  });
}

export async function sendVisitAssignment(
  organizationId: string,
  visitaId: string,
  vendedorPhone: string,
  vendedorNombre: string,
  clienteNombre: string,
  clienteDireccion: string,
  fechaProgramada: string
): Promise<SendMessageResponse> {
  const mensaje = [
    '馃搷 *Visita asignada*',
    `Vendedor: ${vendedorNombre}`,
    `Cliente: ${clienteNombre}`,
    `Direccion: ${clienteDireccion}`,
    `Fecha: ${fechaProgramada}`,
    'Responde "OK" para confirmar.',
  ].join('\n');

  return sendMessage({
    organization_id: organizationId,
    to: vendedorPhone,
    body: mensaje,
    sender_user_id: 'system',
    sender_name: 'Sistema CRM',
    type: 'text',
    template_name: 'sales.visit.assign',
    template_variables: [visitaId],
  });
}

// ============================================================================
// ALERTAS ISO 9001
// ============================================================================

/**
 * Env铆a alerta de acci贸n correctiva vencida
 */
export async function sendAccionVencidaAlert(
  organizationId: string,
  accionId: string,
  responsablePhone: string,
  responsableNombre: string,
  accionTitulo: string
): Promise<SendMessageResponse> {
  const mensaje = `鈿狅笍 *Alerta ISO 9001*\n\nLa acci贸n correctiva "${accionTitulo}" est谩 vencida.\n\nPor favor, actualice el estado o solicite pr贸rroga.\n\n_Sistema de Gesti贸n de Calidad_`;

  return sendMessage({
    organization_id: organizationId,
    to: responsablePhone,
    body: mensaje,
    sender_user_id: 'system',
    sender_name: 'Sistema ISO 9001',
    accion_id: accionId,
  });
}

/**
 * Env铆a recordatorio de auditor铆a pr贸xima
 */
export async function sendAuditoriaProximaAlert(
  organizationId: string,
  auditoriaId: string,
  auditorPhone: string,
  auditorNombre: string,
  auditoriaTitulo: string,
  fechaProgramada: string
): Promise<SendMessageResponse> {
  const mensaje = `馃搵 *Recordatorio de Auditor铆a*\n\n"${auditoriaTitulo}"\n馃搮 Fecha: ${fechaProgramada}\n\nPrepare la documentaci贸n necesaria.\n\n_Sistema de Gesti贸n de Calidad_`;

  return sendMessage({
    organization_id: organizationId,
    to: auditorPhone,
    body: mensaje,
    sender_user_id: 'system',
    sender_name: 'Sistema ISO 9001',
    auditoria_id: auditoriaId,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { extractPhoneNumber, formatWhatsAppNumber } from './TwilioClient';

