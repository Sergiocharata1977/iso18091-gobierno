/**
 * OrganizationBillingWebhookService
 * Encapsula el procesamiento de eventos de pago de Mobbex para actualizar
 * el estado comercial de la organizacion correspondiente.
 *
 * La ruta /api/billing/mobbex/webhook delega aqui la logica de negocio.
 */

import { adminDb } from '@/firebase/admin';
import { writeIntegrationDLQ } from '@/lib/integration/dlq';
import { OrganizationBillingService } from '@/services/billing/OrganizationBillingService';
import { mobbexService } from '@/services/billing/MobbexService';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export type WebhookProcessResult = {
  received: boolean;
  processed: boolean;
  duplicate?: boolean;
  organizationId?: string | null;
  ownerUserId?: string | null;
  status?: string;
  signatureValid?: boolean;
  replayKey?: string;
  warning?: string;
  error?: string;
};

/**
 * Procesa un webhook de Mobbex.
 * Valida la firma, garantiza idempotencia, y actualiza el billing de la org.
 *
 * @returns objeto con resultado del procesamiento
 * @throws nunca — captura internamente y devuelve error en el resultado
 */
export async function processOrganizationBillingWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookProcessResult> {
  let replayKey = '';

  try {
    if (!mobbexService.validateWebhookSignature(rawBody, signature)) {
      return {
        received: true,
        processed: false,
        error: 'Invalid signature',
      };
    }

    type MobbexPayload = {
      type: string;
      data: {
        payment: { id: string; status: { code: string; text: string }; total: number; reference: string };
        subscriber?: { uid?: string; email?: string };
      };
    };
    const payload = JSON.parse(rawBody) as MobbexPayload;
    const result = mobbexService.parseWebhookPayload(payload, {
      rawBody,
      signature,
    });

    replayKey = createHash('sha256')
      .update(`${signature}:${rawBody}`)
      .digest('hex');

    const receiptRef = adminDb.collection('webhook_receipts').doc(replayKey);
    const receipt = await receiptRef.get();
    if (receipt.exists) {
      const status = String(receipt.data()?.status || 'processed');
      if (status === 'processed') {
        return {
          received: true,
          processed: true,
          duplicate: true,
          replayKey,
        };
      }
    }

    await receiptRef.set(
      {
        provider: 'mobbex',
        status: 'processing',
        replay_key: replayKey,
        transaction_id: result.transactionId || null,
        organization_id: result.organizationId || null,
        user_id: result.ownerUserId || null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (!result.organizationId) {
      return {
        received: true,
        processed: false,
        warning: 'organizationId not found',
      };
    }

    const existingSnapshot = await OrganizationBillingService.getSnapshot(
      result.organizationId
    );
    const ownerUserId = result.ownerUserId || existingSnapshot.ownerUserId;

    const ownerEmail =
      existingSnapshot.ownerEmail ||
      (typeof payload?.data?.subscriber?.email === 'string'
        ? payload.data.subscriber.email
        : null);

    if (result.success) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await OrganizationBillingService.activateSubscription(
        result.organizationId,
        {
          planCode: 'premium',
          ownerUserId: ownerUserId || 'system',
          ownerEmail: ownerEmail || 'system@local',
          provider: 'mobbex',
          providerReference: payload.data?.payment?.reference,
          transactionId: result.transactionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextBillingDate,
          metadata: {
            webhook_type: payload.type,
            payment_status_code: payload.data?.payment?.status?.code,
            payment_status_text: payload.data?.payment?.status?.text,
            payment_total: payload.data?.payment?.total,
          },
        }
      );
    } else if (result.status === 'rejected') {
      await OrganizationBillingService.markPastDue(result.organizationId, {
        ownerUserId,
        ownerEmail,
        provider: 'mobbex',
        providerReference: payload.data?.payment?.reference,
        transactionId: result.transactionId,
        lastPaymentError:
          payload.data?.payment?.status?.text || result.transactionId,
        occurredAt: new Date(),
        metadata: {
          webhook_type: payload.type,
          payment_status_code: payload.data?.payment?.status?.code,
          payment_status_text: payload.data?.payment?.status?.text,
          payment_total: payload.data?.payment?.total,
        },
      });
    }

    await receiptRef.set(
      {
        status: 'processed',
        processed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      received: true,
      processed: true,
      organizationId: result.organizationId,
      ownerUserId,
      status: result.status,
      signatureValid: result.signatureValid,
      replayKey,
    };
  } catch (error) {
    console.error('[OrganizationBillingWebhookService] Error:', error);

    if (replayKey) {
      await adminDb
        .collection('webhook_receipts')
        .doc(replayKey)
        .set(
          {
            status: 'failed',
            failed_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            error_message:
              error instanceof Error ? error.message : 'Processing error',
          },
          { merge: true }
        )
        .catch(() => undefined);
    }

    await writeIntegrationDLQ({
      source: 'billing',
      operation: 'mobbex.webhook.process',
      payload: { replay_key: replayKey || null },
      error,
      traceId: replayKey || undefined,
    });

    return {
      received: true,
      processed: false,
      error: error instanceof Error ? error.message : 'Processing error',
    };
  }
}
