/**
 * API Route: POST /api/billing/mobbex/subscribe
 * Inicia el checkout de suscripcion con Mobbex
 */

import { withAuth } from '@/lib/api/withAuth';
import {
  createOrganizationCheckout,
  getOrganizationBillingSummaryResponse,
} from '@/lib/billing/organizationBillingApi';
import { MOBBEX_PLANS } from '@/lib/billing/mobbexPlans';
import { mobbexService } from '@/services/billing/MobbexService';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = (await request.json()) as {
        userName?: string;
        planId?: string;
        planCode?: string;
      };
      const summary = await getOrganizationBillingSummaryResponse(
        auth.organizationId
      );
      const canManage =
        auth.role === 'super_admin' ||
        auth.role === 'admin' ||
        auth.role === 'gerente' ||
        summary.snapshot.ownerUserId === auth.uid;

      if (!canManage) {
        return NextResponse.json(
          {
            error:
              'No tienes permisos para iniciar el checkout de esta organizacion.',
          },
          { status: 403 }
        );
      }

      const response = await createOrganizationCheckout(auth, body);
      return NextResponse.json(response);
    } catch (error) {
      console.error('[Mobbex Subscribe] Error:', error);
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      const status =
        message.startsWith('Missing required field') ||
        message.startsWith('Invalid planCode') ||
        message.startsWith('Missing authenticated')
          ? 400
          : 500;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  },
  { allowInactive: true }
);

export const GET = withAuth(
  async () => {
    const isConfigured = await mobbexService.verifyCredentials();

    return NextResponse.json({
      service: 'mobbex-subscribe',
      configured: isConfigured,
      plans: MOBBEX_PLANS,
      testMode: process.env.MOBBEX_TEST_MODE === 'true',
    });
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
