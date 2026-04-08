/**
 * Cliente Twilio para WhatsApp
 * Maneja la comunicación con la API de Twilio WhatsApp
 */

import crypto from 'crypto';
import type { MessageStatus, TwilioWebhookPayload } from '@/types/whatsapp';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
};

/**
 * Verifica que las variables de entorno estén configuradas
 */
function getConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || '';
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim() || '';

  if (!accountSid || !authToken || !whatsappNumber) {
    throw new Error(
      'Faltan variables de entorno de Twilio. Configurar: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER'
    );
  }

  return { accountSid, authToken, whatsappNumber };
}

/**
 * Construye la URL base de la API de Twilio
 */
function getTwilioBaseUrl(accountSid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
}

function getBasicAuthHeader(accountSid: string, authToken: string): string {
  return (
    'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  );
}

function normalizePhoneDigits(phone: string): string {
  const trimmed = phone.trim();

  if (!trimmed) {
    throw new Error('Numero de WhatsApp vacio');
  }

  let cleaned = trimmed.replace(/^whatsapp:/i, '').trim();
  cleaned = cleaned.replace(/^\+/, '');
  cleaned = cleaned.replace(/^00/, '');
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length === 10) {
    cleaned = `54${cleaned}`;
  }

  if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
    cleaned = `549${cleaned.slice(2)}`;
  }

  if (!/^\d{8,15}$/.test(cleaned)) {
    throw new Error(`Numero de WhatsApp invalido: ${phone}`);
  }

  return cleaned;
}

/**
 * Formatea un número para WhatsApp
 * Twilio requiere el formato: whatsapp:+XXXXXXXXXXX
 */
export function formatWhatsAppNumber(phone: string): string {
  return `whatsapp:+${normalizePhoneDigits(phone)}`;
}

/**
 * Extrae el número limpio del formato WhatsApp
 */
export function extractPhoneNumber(whatsappNumber: string): string {
  return normalizePhoneDigits(whatsappNumber);
}

// ============================================================================
// ENVÍO DE MENSAJES
// ============================================================================

/**
 * Envía un mensaje de texto vía WhatsApp
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  mediaUrl?: string
): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  const { accountSid, authToken, whatsappNumber } = getConfig();

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = formatWhatsAppNumber(whatsappNumber);

  const url = `${getTwilioBaseUrl(accountSid)}/Messages.json`;

  // Construir el body del request
  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', formattedFrom);
  params.append('Body', body);

  if (mediaUrl) {
    params.append('MediaUrl', mediaUrl);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: getBasicAuthHeader(accountSid, authToken),
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageSid: data.sid,
      };
    } else {
      console.error('[TwilioClient] Error enviando mensaje:', data);
      return {
        success: false,
        error: data.message || 'Error desconocido de Twilio',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de conexión con Twilio';
    console.error('[TwilioClient] Error de red:', error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Envía un mensaje usando una plantilla aprobada
 */
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  variables?: Record<string, string>
): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  const { accountSid, authToken, whatsappNumber } = getConfig();

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = formatWhatsAppNumber(whatsappNumber);

  const url = `${getTwilioBaseUrl(accountSid)}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', formattedFrom);
  params.append('ContentSid', contentSid);

  if (variables) {
    params.append('ContentVariables', JSON.stringify(variables));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: getBasicAuthHeader(accountSid, authToken),
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageSid: data.sid,
      };
    } else {
      console.error('[TwilioClient] Error enviando template:', data);
      return {
        success: false,
        error: data.message || 'Error desconocido de Twilio',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de conexión con Twilio';
    console.error('[TwilioClient] Error de red:', error);
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// CONSULTAS
// ============================================================================

/**
 * Obtiene el estado de un mensaje
 */
export async function getMessageStatus(messageSid: string): Promise<{
  success: boolean;
  status?: MessageStatus;
  error?: string;
}> {
  const { accountSid, authToken } = getConfig();

  const url = `${getTwilioBaseUrl(accountSid)}/Messages/${messageSid}.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: getBasicAuthHeader(accountSid, authToken),
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        status: data.status as MessageStatus,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Error obteniendo estado',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de conexión';
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// WEBHOOK
// ============================================================================

/**
 * Valida la firma del webhook de Twilio
 * Implementa validación HMAC-SHA1 según docs de seguridad de Twilio
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function validateWebhookSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Si no hay auth token configurado, rechazar en producción
  if (!authToken) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[TwilioClient] TWILIO_AUTH_TOKEN no configurado');
      return false;
    }
    // En desarrollo, permitir sin validación pero advertir
    console.warn(
      '[TwilioClient] Validación de webhook deshabilitada (sin TWILIO_AUTH_TOKEN)'
    );
    return true;
  }

  // Si no hay firma, rechazar
  if (!signature) {
    console.warn('[TwilioClient] No se proporcionó firma de Twilio');
    return false;
  }

  try {
    // Twilio usa HMAC-SHA1 para firmar

    // Ordenar parámetros alfabéticamente y concatenar
    const sortedKeys = Object.keys(params).sort();
    let dataToSign = url;
    for (const key of sortedKeys) {
      dataToSign += key + params[key];
    }

    // Calcular HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(dataToSign)
      .digest('base64');

    // Comparar de forma segura (timing-safe)
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('[TwilioClient] Error validando firma:', error);
    return false;
  }
}

/**
 * Parsea el payload del webhook de Twilio
 */
export function parseWebhookPayload(formData: FormData): TwilioWebhookPayload {
  return {
    MessageSid: formData.get('MessageSid') as string,
    AccountSid: formData.get('AccountSid') as string,
    From: formData.get('From') as string,
    To: formData.get('To') as string,
    Body: formData.get('Body') as string | undefined,
    NumMedia: formData.get('NumMedia') as string | undefined,
    MediaUrl0: formData.get('MediaUrl0') as string | undefined,
    MediaContentType0: formData.get('MediaContentType0') as string | undefined,
    SmsStatus: formData.get('SmsStatus') as string | undefined,
    ErrorCode: formData.get('ErrorCode') as string | undefined,
    ErrorMessage: formData.get('ErrorMessage') as string | undefined,
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Verifica si un número está en la ventana de 24 horas
 * WhatsApp solo permite mensajes libres durante 24h después del último mensaje
 * del usuario. Fuera de esa ventana, solo se pueden enviar templates.
 */
export async function isIn24HourWindow(
  conversationId: string,
  lastInboundMessageAt?: Date
): Promise<boolean> {
  if (!lastInboundMessageAt) {
    return false;
  }

  const now = new Date();
  const hoursDiff =
    (now.getTime() - lastInboundMessageAt.getTime()) / (1000 * 60 * 60);

  return hoursDiff <= 24;
}

/**
 * Genera un mensaje de respuesta TwiML vacío para webhooks
 */
export function emptyTwiMLResponse(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}
