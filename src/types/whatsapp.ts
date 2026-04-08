/**
 * Tipos para el módulo WhatsApp Hub
 * Integración con Twilio WhatsApp API + CRM + ISO 9001
 */

import type { WhatsAppMediaAttachment } from './whatsapp-media';

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Tipos de conversación
 */
export type ConversationType = 'CRM' | 'ISO9001' | 'INTERNAL';

/**
 * Estado del mensaje
 */
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Dirección del mensaje
 */
export type MessageDirection = 'OUTBOUND' | 'INBOUND';

/**
 * Tipo de mensaje
 */
export type MessageType = 'text' | 'template' | 'media' | 'document';

/**
 * Categoría de plantilla
 */
export type TemplateCategory = 'CRM' | 'ISO9001' | 'INTERNAL' | 'MARKETING';

// ============================================================================
// CONFIGURACIÓN POR ORGANIZACIÓN
// ============================================================================

/**
 * Configuración de WhatsApp por organización (multi-tenant)
 */
export interface WhatsAppConfig {
  enabled: boolean;
  twilio_phone_sid?: string; // SID del número en Twilio
  whatsapp_number?: string; // Número WhatsApp (+54 xxx xxx)
  sandbox_mode: boolean; // true = modo sandbox
  monthly_limit: number; // Límite de mensajes mensuales
  messages_used_this_month: number; // Mensajes usados este mes
  last_reset_date: string; // Fecha último reset del contador
}

// ============================================================================
// CONVERSACIONES
// ============================================================================

/**
 * Conversación de WhatsApp
 */
export interface WhatsAppConversation {
  id: string;
  organization_id: string;
  type: ConversationType;

  // Contacto
  phone: string; // Número WhatsApp del contacto
  contact_name: string; // Nombre del contacto

  // Participantes internos
  participantes: string[]; // userIds involucrados

  // Contexto CRM (opcional)
  cliente_id?: string;
  cliente_nombre?: string;
  oportunidad_id?: string;
  vendedor_id?: string;
  vendedor_nombre?: string;

  // Contexto ISO 9001 (opcional)
  accion_id?: string;
  auditoria_id?: string;
  hallazgo_id?: string;
  documento_id?: string;

  // Estado de la conversación
  ultimo_mensaje: string;
  ultimo_mensaje_at: Date;
  mensajes_no_leidos: number;
  estado: 'activa' | 'archivada' | 'cerrada';

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Datos para crear una conversación
 */
export interface CreateConversationData {
  organization_id: string;
  type: ConversationType;
  phone: string;
  contact_name: string;

  // Contexto opcional
  cliente_id?: string;
  vendedor_id?: string;
  accion_id?: string;
  auditoria_id?: string;
}

// ============================================================================
// MENSAJES
// ============================================================================

/**
 * Mensaje de WhatsApp
 */
export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  organization_id: string;

  // Dirección y participantes
  direction: MessageDirection;
  from: string; // Número origen
  to: string; // Número destino

  // Contenido
  type: MessageType;
  body: string;
  media_url?: string;
  media_type?: string; // image/jpeg, application/pdf, etc.
  template_name?: string;
  template_variables?: string[];

  // Trazabilidad (usuario que envió si es OUTBOUND)
  sender_user_id?: string;
  sender_name?: string;

  // Estado del mensaje
  status: MessageStatus;
  status_updated_at: Date;
  error_code?: string;
  error_message?: string;

  // IDs de Twilio
  twilio_sid?: string;
  meta_message_id?: string;
  provider?: 'twilio' | 'meta';

  // Timestamps
  created_at: Date;
}

/**
 * Datos para enviar un mensaje
 */
export interface SendMessageData {
  organization_id: string;
  conversation_id?: string; // Si ya existe conversación
  to: string; // Número destino
  body: string;

  // Opcional
  type?: MessageType;
  media_url?: string;
  template_name?: string;
  template_variables?: string[];

  // Contexto del remitente
  sender_user_id: string;
  sender_name: string;

  // Contexto CRM/ISO (para crear conversación si no existe)
  cliente_id?: string;
  cliente_nombre?: string;
  vendedor_id?: string;
  accion_id?: string;
  auditoria_id?: string;
}

/**
 * Respuesta de envío de mensaje
 */
export interface SendMessageResponse {
  success: boolean;
  message_id?: string;
  twilio_sid?: string;
  conversation_id?: string;
  error?: string;
  retry_after_seconds?: number;
}

// ============================================================================
// PLANTILLAS
// ============================================================================

/**
 * Plantilla de WhatsApp
 */
export interface WhatsAppTemplate {
  id: string;
  organization_id: string;
  name: string;
  category: TemplateCategory;

  // Contenido
  twilio_template_sid?: string;
  content: string; // Texto con placeholders {{1}}, {{2}}
  variables: string[]; // Nombres de las variables

  // Estado
  aprobada: boolean; // Aprobada por WhatsApp/Twilio
  activa: boolean;

  // Métricas
  uso_count: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// WEBHOOK
// ============================================================================

/**
 * Payload del webhook de Twilio
 */
export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  SmsStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

/**
 * Payload de status callback de Twilio
 */
export interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed'
    | 'undelivered';
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image';
  text?: { body: string };
}

export interface WhatsAppStatusUpdate {
  id: string; // message_id
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

export interface WhatsAppWebhookBody {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      field?: string;
      value: {
        phone_number_id: string;
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        messages?: WhatsAppIncomingMessage[];
        statuses?: WhatsAppStatusUpdate[];
      };
    }>;
  }>;
}

// ============================================================================
// CONTACTOS
// ============================================================================

/**
 * Contacto de WhatsApp
 */
export interface WhatsAppContact {
  id: string;
  organization_id: string;
  phone: string;
  nombre: string;
  tipo: 'cliente' | 'proveedor' | 'interno' | 'otro';

  // Vinculación con entidades
  cliente_id?: string;
  user_id?: string; // Si es usuario interno

  // Preferencias
  opt_in: boolean; // Aceptó recibir mensajes
  opt_in_date?: Date;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// ALERTAS AUTOMÁTICAS (ISO 9001)
// ============================================================================

/**
 * Configuración de alertas automáticas
 */
export interface WhatsAppAlertConfig {
  id: string;
  organization_id: string;

  // Tipo de alerta
  tipo:
    | 'accion_vencida'
    | 'auditoria_proxima'
    | 'tarea_asignada'
    | 'no_conformidad_grave'
    | 'documento_pendiente'
    | 'recordatorio_seguimiento';

  // Configuración
  habilitada: boolean;
  template_id?: string;
  dias_anticipacion?: number; // Para auditorías próximas
  destinatarios: 'responsable' | 'supervisor' | 'todos';

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// CONFIGURACIÓN ESTRUCTURADA POR ORGANIZACIÓN (Ola 1A)
// ============================================================================

/**
 * Configuración completa de WhatsApp por organización (multi-tenant, Meta Graph API)
 * Almacenada en: organizations/{orgId}/settings/channels_whatsapp
 */
export interface OrganizationWhatsAppConfig {
  enabled: boolean;
  provider: 'meta' | 'twilio';
  mode: 'notifications_only' | 'inbox' | 'hybrid';

  // Meta Graph API
  whatsapp_phone_number_id?: string;
  whatsapp_business_account_id?: string;

  // Operación
  outbound_number_label?: string;
  whatsapp_notificaciones_dealer?: string;
  default_assigned_user_id?: string;

  // Mensajería automática
  welcome_message?: string;
  out_of_hours_message?: string;
  auto_reply_enabled?: boolean;

  // Integración CRM
  auto_link_client_by_phone?: boolean;
  auto_create_lead_if_unknown?: boolean;

  // Status
  webhook_status?: 'pending' | 'verified' | 'error';
  last_webhook_check?: string; // ISO date

  updated_at?: unknown; // FieldValue.serverTimestamp()
  updated_by?: string;
}

// ============================================================================
// MÉTRICAS
// ============================================================================

/**
 * Métricas de WhatsApp por organización
 */
export interface WhatsAppMetrics {
  organization_id: string;
  periodo: string; // "2025-12"

  // Mensajes
  mensajes_enviados: number;
  mensajes_recibidos: number;
  mensajes_fallidos: number;

  // Conversaciones
  conversaciones_nuevas: number;
  conversaciones_activas: number;

  // Por módulo
  mensajes_crm: number;
  mensajes_iso9001: number;
  mensajes_interno: number;

  // Tiempos
  tiempo_respuesta_promedio_min?: number;
}

// ─── Inbox Dashboard (nuevos tipos para panel WhatsApp) ────────────────

/**
 * Estado operativo de una conversación en el inbox.
 * Extiende los estados simples existentes.
 */
export type WhatsAppConversationStatus =
  | 'abierta'
  | 'pendiente_respuesta'
  | 'en_gestion'
  | 'resuelta'
  | 'archivada'
  | 'spam';

/**
 * Origen de la conversación
 */
export type WhatsAppConversationSource =
  | 'webhook'       // Vino de Meta webhook real
  | 'manual'        // Creada manualmente desde dashboard
  | 'simulation'    // Creada por el simulador
  | 'public_form';  // Vino de formulario público (solicitudes dealer, etc.)

/**
 * Versión extendida de WhatsAppConversation para el inbox dashboard.
 * Subcollection: organizations/{orgId}/whatsapp_conversations/{convId}
 */
export interface WhatsAppConversationV2 {
  id: string;
  organization_id: string;

  // Contacto
  phone_e164: string;
  contact_name?: string;

  // Vinculación CRM
  client_id?: string;       // ID del cliente en crm_clientes
  client_name?: string;     // Snapshot del nombre (desnormalizado)
  contact_id?: string;      // ID del contacto en crm_contactos

  // Asignación
  assigned_user_id?: string;
  assigned_user_name?: string;

  // Canal y origen
  channel: 'meta' | 'twilio' | 'simulator';
  source: WhatsAppConversationSource;

  // Tipo de conversación
  type: 'crm' | 'iso' | 'support' | 'dealer';

  // Estado operativo
  status: WhatsAppConversationStatus;

  // Lectura
  unread_count: number;

  // Último mensaje (desnormalizado para la lista)
  last_message_text?: string;
  last_message_at?: unknown;  // Firestore Timestamp
  last_message_direction?: 'inbound' | 'outbound';

  // Flags
  is_simulation?: boolean;
  ai_enabled?: boolean;

  // Timestamps
  created_at?: unknown;  // Firestore Timestamp
  updated_at?: unknown;  // Firestore Timestamp
}

/**
 * Versión extendida de WhatsAppMessage.
 * Subcollection: organizations/{orgId}/whatsapp_conversations/{convId}/messages/{msgId}
 */
export interface WhatsAppMessageV2 {
  id: string;
  conversation_id: string;
  organization_id: string;

  direction: 'inbound' | 'outbound';
  text: string;

  // Proveedor
  provider: 'meta' | 'twilio' | 'simulator';
  provider_message_id?: string;  // ID de Meta o Twilio

  // Remitente
  sender_type: 'client' | 'user' | 'ai' | 'system';
  sender_user_id?: string;
  sender_name?: string;

  // Estado del mensaje
  status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;

  // Flags
  is_simulation?: boolean;
  has_media?: boolean;

  // Compatibilidad plana para algunos consumidores
  media_url?: string;
  media_type?: string;
  media_size_bytes?: number;

  // Media estructurada
  media?: WhatsAppMediaAttachment;

  // Índice de búsqueda
  search_tokens?: string[];

  // Timestamp
  created_at?: unknown;  // Firestore Timestamp
}

/**
 * Filtros para listar conversaciones en el inbox dashboard
 */
export interface WhatsAppInboxFilters {
  status?: WhatsAppConversationStatus | 'all';
  type?: 'crm' | 'iso' | 'support' | 'dealer' | 'all';
  source?: WhatsAppConversationSource | 'all';
  assigned_user_id?: string;
  client_id?: string;
  is_simulation?: boolean;
  unread_only?: boolean;
  search?: string;  // Busca en contact_name o phone
  limit?: number;
}

/**
 * DTO para crear una conversación manualmente desde el dashboard
 */
export interface CreateWhatsAppConversationDTO {
  phone_e164: string;
  contact_name?: string;
  client_id?: string;
  assigned_user_id?: string;
  type: 'crm' | 'iso' | 'support' | 'dealer';
  initial_message?: string;  // Si se envía mensaje inicial al crear
}

/**
 * DTO para enviar un mensaje desde el dashboard (por convId)
 */
export interface SendWhatsAppMessageDTO {
  text: string;
  sender_user_id: string;
  sender_name: string;
}

/**
 * Payload del simulador
 */
export interface WhatsAppSimulatePayload {
  org_id: string;
  from_phone: string;  // E.164 del "cliente simulado"
  from_name?: string;
  message: string;
  simulate_ai_reply?: boolean;  // default true
  link_client_by_phone?: boolean;  // Si existe cliente con ese tel, vincularlo
}

/**
 * Respuesta del simulador
 */
export interface WhatsAppSimulateResult {
  conversation_id: string;
  inbound_message_id: string;
  ai_reply?: string;
  outbound_message_id?: string;
  client_linked?: boolean;
  client_id?: string;
}

export type WhatsAppConnectionMethod = 'embedded_signup' | 'manual';

export type WhatsAppConnectionStatus =
  | 'not_connected'
  | 'connected'
  | 'error'
  | 'token_expired';

export interface EmbeddedSignupResult {
  phone_number_id: string;
  waba_id: string; // WhatsApp Business Account ID
  access_token: string; // token de acceso (24h, debe rotar)
  token_type: string; // 'bearer'
  display_phone_number?: string;
}

/**
 * Extensión de configuración para conexión Embedded Signup y token por organización.
 */
export interface OrganizationWhatsAppConfig {
  // Campos agregados para Embedded Signup (2026-03-27)
  // Estos campos se populan automáticamente vía OAuth — no ingresar manualmente
  connection_method?: WhatsAppConnectionMethod;
  connection_status?: WhatsAppConnectionStatus;
  connected_waba_id?: string;
  connected_at?: unknown; // Firestore Timestamp
  access_token?: string; // token por org (tiene prioridad sobre env var WHATSAPP_ACCESS_TOKEN)
  token_expires_at?: unknown; // Firestore Timestamp — para alertar cuando expire
}
