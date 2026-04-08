/**
 * WhatsApp webhook handler.
 * POST /api/whatsapp/webhook
 *
 * This endpoint currently supports:
 * 1. Twilio WhatsApp inbound/status webhooks
 * 2. Meta webhook signature validation for direct callbacks
 *
 * SECURITY:
 * - Twilio signature validation enabled
 * - Meta HMAC-SHA256 validation enabled
 * - Rate limiting enabled
 * - Sanitized logs (no full PII)
 */

import { checkRateLimit } from '@/lib/api/rateLimit';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { handleIncomingMessage, handleStatusUpdate } from '@/services/whatsapp';
import {
  emptyTwiMLResponse,
  validateWebhookSignature,
} from '@/services/whatsapp/TwilioClient';
import type { MessageStatus } from '@/types/whatsapp';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function sanitizePhoneForLog(phone: string): string {
  if (!phone) return '[empty]';
  const cleaned = phone.replace('whatsapp:', '');
  if (cleaned.length <= 8) return '****';
  return cleaned.substring(0, 4) + '****' + cleaned.slice(-4);
}

async function getOrganizationByPhone(_phone: string): Promise<string | null> {
  const snapshot = await getAdminFirestore()
    .collection('organizations')
    .where('whatsapp_config.enabled', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(
      '[Webhook WhatsApp] No hay organizaciones con WhatsApp habilitado'
    );
    return null;
  }

  return snapshot.docs[0].id;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  if (realIp) {
    return realIp;
  }

  return request.ip || 'unknown';
}

function parseFormBody(rawBody: string): Record<string, string> {
  const urlSearchParams = new URLSearchParams(rawBody);
  const params: Record<string, string> = {};

  for (const [key, value] of urlSearchParams.entries()) {
    params[key] = value;
  }

  return params;
}

function hasValidMetaSignature(signature: string, rawBody: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!signature || !appSecret) {
    return false;
  }

  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function resolveInternalConverseSecret(): string {
  return (
    process.env.AI_INTERNAL_API_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.WHATSAPP_INTERNAL_API_SECRET ||
    process.env.WHATSAPP_APP_SECRET ||
    ''
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 100,
      windowSeconds: 60,
      identifier: `whatsapp-webhook:${getClientIp(request)}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const metaSignature = request.headers.get('x-hub-signature-256') || '';
    const twilioSignature = request.headers.get('x-twilio-signature') || '';
    const rawBody = await request.text();

    if (metaSignature) {
      if (!hasValidMetaSignature(metaSignature, rawBody)) {
        console.warn('[Webhook WhatsApp] Invalid Meta signature rejected');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      const payload = JSON.parse(rawBody);

      console.log('[Webhook WhatsApp] Meta payload verified', {
        object: payload?.object || 'unknown',
        hasEntry: Array.isArray(payload?.entry),
      });

      return NextResponse.json({ success: true });
    }

    const params = parseFormBody(rawBody);

    if (
      !twilioSignature ||
      !validateWebhookSignature(twilioSignature, request.url, params)
    ) {
      console.warn('[Webhook WhatsApp] Invalid Twilio signature rejected');
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = {
      MessageSid: params.MessageSid,
      AccountSid: params.AccountSid,
      From: params.From,
      To: params.To,
      Body: params.Body,
      NumMedia: params.NumMedia,
      MediaUrl0: params.MediaUrl0,
      MediaContentType0: params.MediaContentType0,
      SmsStatus: params.SmsStatus,
      MessageStatus: params.MessageStatus,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage,
    };

    console.log('[Webhook WhatsApp] Payload recibido:', {
      MessageSid: payload.MessageSid?.substring(0, 8) + '...',
      From: sanitizePhoneForLog(payload.From),
      To: sanitizePhoneForLog(payload.To),
      Status: payload.SmsStatus || payload.MessageStatus,
      HasBody: !!payload.Body,
    });

    const isStatusUpdate = payload.MessageStatus && !payload.Body;

    if (isStatusUpdate) {
      await handleStatusUpdate(
        payload.MessageSid,
        (payload.MessageStatus || payload.SmsStatus) as MessageStatus,
        payload.ErrorCode,
        payload.ErrorMessage
      );
    } else if (payload.Body || payload.NumMedia) {
      const organizationId = await getOrganizationByPhone(payload.To);

      if (!organizationId) {
        console.error(
          '[Webhook WhatsApp] No se encontro organizacion para numero:',
          sanitizePhoneForLog(payload.To)
        );
        return new Response(emptyTwiMLResponse(), {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      try {
        const converseResponse = await fetch(
          new URL('/api/ai/converse', request.url),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-webhook-secret': resolveInternalConverseSecret(),
            },
            body: JSON.stringify({
              channel: 'whatsapp',
              message:
                payload.Body?.trim() ||
                payload.MediaUrl0 ||
                '[audio sin transcripcion]',
              organizationId,
              sessionId: `${payload.From.replace(/^whatsapp:/i, '')}_whatsapp`,
              pathname: '/whatsapp',
              externalId: payload.From,
            }),
          }
        );

        if (!converseResponse.ok) {
          const converseError = await converseResponse
            .json()
            .catch(() => ({ error: 'unknown_error' }));
          console.warn('[Webhook WhatsApp] Unified AI Core skipped:', {
            status: converseResponse.status,
            error: converseError,
          });
        }
      } catch {
        console.warn('[Webhook WhatsApp] Unified AI Core mirror failed');
      }

      await handleIncomingMessage(
        {
          MessageSid: payload.MessageSid,
          AccountSid: payload.AccountSid,
          From: payload.From,
          To: payload.To,
          Body: payload.Body,
          NumMedia: payload.NumMedia,
          MediaUrl0: payload.MediaUrl0,
          MediaContentType0: payload.MediaContentType0,
        },
        organizationId
      );
    }

    return new Response(emptyTwiMLResponse(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch {
    console.error('[Webhook WhatsApp] Error procesando webhook');

    return new Response(emptyTwiMLResponse(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'WhatsApp webhook activo',
    timestamp: new Date().toISOString(),
  });
}
