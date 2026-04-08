/**
 * API Route: POST /api/billing/mobbex/webhook
 * Recibe notificaciones de pago de Mobbex y delega el procesamiento
 * a OrganizationBillingWebhookService.
 */

import { processOrganizationBillingWebhook } from '@/services/billing/OrganizationBillingWebhookService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const signature =
    request.headers.get('x-mobbex-signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('x-webhook-signature') ||
    '';

  const rawBody = await request.text();

  if (!signature) {
    console.error('[Mobbex Webhook] Missing signature');
    return NextResponse.json(
      { received: true, processed: false, error: 'Missing signature' },
      { status: 401 }
    );
  }

  const result = await processOrganizationBillingWebhook(rawBody, signature);

  if (result.error === 'Invalid signature') {
    return NextResponse.json(
      { received: true, processed: false, error: result.error },
      { status: 401 }
    );
  }

  if (result.error) {
    return NextResponse.json(
      { received: true, processed: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    service: 'mobbex-webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
