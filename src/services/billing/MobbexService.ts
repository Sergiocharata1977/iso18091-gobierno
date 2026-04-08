/**
 * MobbexService - Servicio para integracion con Mobbex Payments
 * https://mobbex.dev/
 */

import { MOBBEX_PLANS, MobbexPlanKey } from '@/lib/billing/mobbexPlans';
import { createHmac } from 'crypto';

const MOBBEX_API_BASE = 'https://api.mobbex.com/p';

type MobbexHeaders = Record<string, string>;

interface MobbexCheckoutRequest {
  total: number;
  currency: string;
  reference: string;
  description: string;
  return_url: string;
  webhook: string;
  test?: boolean;
  items?: Array<{
    image: string;
    quantity: number;
    description: string;
    total: number;
  }>;
  customer?: {
    email: string;
    name: string;
    identification: string;
  };
  options?: {
    theme?: {
      type: string;
      background: string;
      showHeader: boolean;
    };
  };
}

interface MobbexCheckoutResponse {
  result: boolean;
  data: {
    id: string;
    url: string;
    description: string;
    currency: {
      code: string;
    };
    total: number;
  };
}

interface MobbexWebhookPayload {
  type: string;
  data: {
    payment: {
      id: string;
      status: {
        code: string;
        text: string;
      };
      total: number;
      reference: string;
    };
    subscriber?: {
      uid?: string;
      email?: string;
    };
  };
}

export class MobbexService {
  private apiKey: string;
  private accessToken: string;
  private testMode: boolean;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.MOBBEX_API_KEY || '';
    this.accessToken = process.env.MOBBEX_ACCESS_TOKEN || '';
    this.testMode = process.env.MOBBEX_TEST_MODE === 'true';
    this.webhookSecret = process.env.MOBBEX_WEBHOOK_SECRET || '';

    if (
      (!this.apiKey || !this.accessToken) &&
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      console.warn('[MobbexService] Missing API credentials');
    }
  }

  private getHeaders(): MobbexHeaders {
    return {
      'x-api-key': this.apiKey,
      'x-access-token': this.accessToken,
      'content-type': 'application/json',
    };
  }

  async createSubscriptionCheckout(params: {
    organizationId: string;
    ownerUserId: string;
    ownerEmail: string;
    userName: string;
    planCode: MobbexPlanKey;
    reference?: string;
    returnUrl: string;
    webhookUrl: string;
  }): Promise<MobbexCheckoutResponse> {
    const plan = MOBBEX_PLANS[params.planCode];
    const reference =
      params.reference || `orgsub_${params.organizationId}_${Date.now()}`;

    const checkoutData: MobbexCheckoutRequest = {
      total: plan.price,
      currency: 'ARS',
      reference,
      description: `Suscripcion ${plan.name} - 9001App`,
      return_url: params.returnUrl,
      webhook: params.webhookUrl,
      test: this.testMode,
      items: [
        {
          image: 'https://9001app.com/logo.png',
          quantity: 1,
          description: plan.description,
          total: plan.price,
        },
      ],
      customer: {
        email: params.ownerEmail,
        name: params.userName,
        identification: params.ownerUserId,
      },
      options: {
        theme: {
          type: 'light',
          background: '#4F46E5',
          showHeader: true,
        },
      },
    };

    const response = await fetch(`${MOBBEX_API_BASE}/checkout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MobbexService] Checkout error:', error);
      throw new Error(`Mobbex checkout failed: ${error}`);
    }

    return response.json();
  }

  validateWebhookSignature(
    rawBody: string,
    providedSignature: string
  ): boolean {
    if (!this.webhookSecret) {
      console.error('[MobbexService] MOBBEX_WEBHOOK_SECRET no configurado');
      return false;
    }

    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (providedSignature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |=
        expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
    }

    return result === 0;
  }

  parseWebhookPayload(
    payload: MobbexWebhookPayload,
    options?: { rawBody?: string; signature?: string }
  ): {
    success: boolean;
    organizationId: string | null;
    ownerUserId: string | null;
    status: 'approved' | 'pending' | 'rejected';
    transactionId: string;
    signatureValid: boolean;
  } {
    let signatureValid = false;
    if (options?.rawBody && options?.signature) {
      signatureValid = this.validateWebhookSignature(
        options.rawBody,
        options.signature
      );
      if (!signatureValid && !this.testMode) {
        console.error('[MobbexService] Firma de webhook invalida');
        return {
          success: false,
          organizationId: null,
          ownerUserId: null,
          status: 'rejected',
          transactionId: '',
          signatureValid: false,
        };
      }
    } else if (!this.testMode) {
      console.warn('[MobbexService] Webhook recibido sin validacion de firma');
    }

    const paymentStatus = payload.data.payment.status.code;
    const reference = payload.data.payment.reference;
    const organizationMatch = reference.match(/orgsub_(.+?)_\d+/);
    const organizationId = organizationMatch ? organizationMatch[1] : null;
    const ownerUserId =
      typeof payload.data.subscriber?.uid === 'string'
        ? payload.data.subscriber.uid
        : null;

    let status: 'approved' | 'pending' | 'rejected' = 'pending';
    const statusCode = parseInt(paymentStatus, 10);
    if (statusCode >= 200 && statusCode < 400) {
      status = 'approved';
    } else if (statusCode >= 400) {
      status = 'rejected';
    }

    return {
      success: status === 'approved',
      organizationId,
      ownerUserId,
      status,
      transactionId: payload.data.payment.id,
      signatureValid,
    };
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${MOBBEX_API_BASE}/sources`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mobbexService = new MobbexService();
