import { withAuth } from '@/lib/api/withAuth';
import { createOrganizationCheckout } from '@/lib/billing/organizationBillingApi';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = (await request.json()) as {
        planCode?: string;
        planId?: string;
        userName?: string;
      };

      const response = await createOrganizationCheckout(auth, body);
      return NextResponse.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      const status =
        message.startsWith('Missing required field') ||
        message.startsWith('Invalid planCode') ||
        message.startsWith('Missing authenticated')
          ? 400
          : 500;

      console.error('[Organization Checkout] Error:', error);
      return NextResponse.json({ error: message }, { status });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
