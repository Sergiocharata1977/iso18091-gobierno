import { getAdminFirestore } from '@/lib/firebase/admin';
import { WhatsAppClient } from '@/lib/whatsapp/WhatsAppClient';
import { WhatsAppAdapter } from '@/services/ai-core/adapters/whatsappAdapter';
import {
  createConversation,
  extractPhoneNumber,
  findConversation,
} from '@/services/whatsapp';
import type {
  WhatsAppConversation,
  WhatsAppWebhookBody,
} from '@/types/whatsapp';
import { waitUntil } from '@vercel/functions';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const MESSAGES_COLLECTION = 'whatsapp_messages';

function logWebhookSummary(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.log('[Public WhatsApp Webhook]', message, meta);
    return;
  }

  console.log('[Public WhatsApp Webhook]', message);
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

async function resolveOrganization(phoneNumberId: string): Promise<{
  id: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  accessToken?: string;
} | null> {
  const db = getAdminFirestore();
  const queries = [
    db
      .collection('organizations')
      .where('whatsapp_phone_number_id', '==', phoneNumberId)
      .limit(1)
      .get(),
    db
      .collection('organizations')
      .where('whatsapp_config.phone_number_id', '==', phoneNumberId)
      .limit(1)
      .get(),
    db
      .collection('organizations')
      .where('whatsapp_config.phoneNumberId', '==', phoneNumberId)
      .limit(1)
      .get(),
  ];

  for (const snapshot of await Promise.all(queries)) {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data() as Record<string, unknown>;
      const whatsappConfig =
        typeof data.whatsapp_config === 'object' && data.whatsapp_config
          ? (data.whatsapp_config as Record<string, unknown>)
          : {};
      const settingsDoc = await db
        .collection('organizations')
        .doc(doc.id)
        .collection('settings')
        .doc('channels_whatsapp')
        .get();
      const settingsData = settingsDoc.data() as
        | Record<string, unknown>
        | undefined;
      const orgAccessToken =
        typeof settingsData?.access_token === 'string'
          ? settingsData.access_token
          : undefined;

      return {
        id: doc.id,
        phoneNumberId:
          (typeof data.whatsapp_phone_number_id === 'string'
            ? data.whatsapp_phone_number_id
            : typeof whatsappConfig.phone_number_id === 'string'
              ? whatsappConfig.phone_number_id
              : typeof whatsappConfig.phoneNumberId === 'string'
                ? whatsappConfig.phoneNumberId
                : phoneNumberId) || phoneNumberId,
        displayPhoneNumber:
          typeof whatsappConfig.display_phone_number === 'string'
            ? whatsappConfig.display_phone_number
            : undefined,
        accessToken: orgAccessToken,
      };
    }
  }

  return null;
}

async function ensureConversation(
  organizationId: string,
  fromPhone: string
): Promise<WhatsAppConversation> {
  const existing = await findConversation(organizationId, fromPhone);
  if (existing) {
    return existing;
  }

  return createConversation({
    organization_id: organizationId,
    type: 'CRM',
    phone: fromPhone,
    contact_name: fromPhone,
    cliente_nombre: fromPhone,
  });
}

async function storeOutboundReply(params: {
  conversationId: string;
  organizationId: string;
  fromPhoneNumberId: string;
  to: string;
  body: string;
  metaMessageId?: string;
}) {
  const db = getAdminFirestore();
  const now = new Date();
  const sanitizedTo = extractPhoneNumber(params.to);

  await db.collection(MESSAGES_COLLECTION).add({
    conversation_id: params.conversationId,
    organization_id: params.organizationId,
    direction: 'OUTBOUND',
    from: params.fromPhoneNumberId,
    to: sanitizedTo,
    type: 'text',
    body: params.body,
    status: 'sent',
    status_updated_at: now,
    meta_message_id: params.metaMessageId || null,
    provider: 'meta',
    sender_user_id: 'don-candido',
    sender_name: 'Don Candido',
    created_at: now,
  });

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .doc(params.conversationId)
    .update({
      ultimo_mensaje: params.body.substring(0, 100),
      ultimo_mensaje_at: now,
      updated_at: now,
      mensajes_no_leidos: 0,
    });
}

async function processWebhook(body: WhatsAppWebhookBody): Promise<void> {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const phoneNumberId = value?.phone_number_id;
      const organization = phoneNumberId
        ? await resolveOrganization(phoneNumberId)
        : null;
      const inboundMessages = Array.isArray(value?.messages)
        ? value.messages.length
        : 0;
      const inboundStatuses = Array.isArray(value?.statuses)
        ? value.statuses.length
        : 0;

      logWebhookSummary('Payload parsed', {
        field: change.field ?? null,
        phoneNumberId: phoneNumberId ?? null,
        organizationId: organization?.id ?? null,
        inboundMessages,
        inboundStatuses,
      });

      if (!organization) {
        logWebhookSummary('Skipping payload: organization not found', {
          phoneNumberId: phoneNumberId ?? null,
        });
        continue;
      }

      if (!value?.messages?.length) {
        logWebhookSummary('Skipping payload: no inbound messages to process', {
          organizationId: organization.id,
          phoneNumberId: organization.phoneNumberId,
          statuses: inboundStatuses,
        });
        continue;
      }

      logWebhookSummary('Organization resolved', {
        organizationId: organization.id,
        phoneNumberId: organization.phoneNumberId,
        tokenSource: organization.accessToken ? 'org' : 'global',
      });

      for (const incomingMessage of value.messages) {
        if (incomingMessage.type !== 'text' || !incomingMessage.text?.body) {
          logWebhookSummary('Skipping unsupported inbound message', {
            organizationId: organization.id,
            messageId: incomingMessage.id,
            type: incomingMessage.type,
          });
          continue;
        }

        const normalizedFrom = extractPhoneNumber(incomingMessage.from);
        logWebhookSummary('Processing inbound text message', {
          organizationId: organization.id,
          from: normalizedFrom,
          messageId: incomingMessage.id,
        });

        const reply = await WhatsAppAdapter.handleIncoming({
          from: normalizedFrom,
          message: incomingMessage.text.body,
          organizationId: organization.id,
          messageSid: incomingMessage.id,
        });

        if (!reply) {
          logWebhookSummary('No AI reply generated', {
            organizationId: organization.id,
            from: normalizedFrom,
            messageId: incomingMessage.id,
          });
          continue;
        }

        const conversation = await ensureConversation(
          organization.id,
          normalizedFrom
        );

        await WhatsAppClient.sendTextMessage(
          normalizedFrom,
          reply,
          organization.phoneNumberId,
          organization.accessToken
        );

        logWebhookSummary('Outbound reply sent', {
          organizationId: organization.id,
          to: normalizedFrom,
          messageId: incomingMessage.id,
        });

        await storeOutboundReply({
          conversationId: conversation.id,
          organizationId: organization.id,
          fromPhoneNumberId: organization.phoneNumberId,
          to: normalizedFrom,
          body: reply,
        });
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';

  if (!hasValidMetaSignature(signature, rawBody)) {
    logWebhookSummary('Rejected request: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Return 200 immediately — Meta requires a response within 5 seconds.
  // waitUntil keeps the serverless function alive until processWebhook completes.
  try {
    const body = JSON.parse(rawBody) as WhatsAppWebhookBody;
    logWebhookSummary('Request accepted', {
      object: body?.object ?? null,
      entries: Array.isArray(body?.entry) ? body.entry.length : 0,
    });
    waitUntil(
      processWebhook(body).catch((error: unknown) => {
        console.error(
          '[Public WhatsApp Webhook] Error in async processWebhook:',
          error
        );
      })
    );
  } catch (error) {
    console.error(
      '[Public WhatsApp Webhook] Failed to parse webhook payload:',
      error
    );
  }

  return NextResponse.json({ success: true });
}
