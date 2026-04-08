/**
 * POST /api/billing/organization/reconcile
 * Endpoint de reconciliacion manual de billing por organizacion.
 * Solo super_admin. Para uso de soporte cuando el estado comercial de una org es inconsistente.
 */

import { withAuth } from '@/lib/api/withAuth';
import { OrganizationBillingService } from '@/services/billing/OrganizationBillingService';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    const body = (await request.json().catch(() => ({}))) as {
      organizationId?: string;
      forceRefresh?: boolean;
    };

    // Por defecto reconcilia la propia org del actor, salvo que super_admin especifique otra
    const targetOrgId =
      auth.role === 'super_admin' && body.organizationId
        ? body.organizationId.trim()
        : auth.organizationId;

    if (!targetOrgId) {
      return NextResponse.json(
        { success: false, error: 'organizationId requerido' },
        { status: 400 }
      );
    }

    const snapshot = await OrganizationBillingService.getSnapshot(targetOrgId);

    return NextResponse.json({
      success: true,
      organizationId: targetOrgId,
      reconciledBy: auth.uid,
      reconciledAt: new Date().toISOString(),
      snapshot: {
        source: snapshot.source,
        planCode: snapshot.planCode,
        subscriptionStatus: snapshot.subscriptionStatus,
        accessState: snapshot.commercialState.accessState,
        lockedReason: snapshot.commercialState.lockedReason ?? null,
        accessEndsAt: snapshot.commercialState.accessEndsAt?.toISOString() ?? null,
        currentPeriodEnd: snapshot.currentPeriodEnd?.toISOString() ?? null,
        lastPaymentError: snapshot.lastPaymentError,
        ownerUserId: snapshot.ownerUserId,
        ownerEmail: snapshot.ownerEmail,
        updatedAt: snapshot.updatedAt?.toISOString() ?? null,
      },
    });
  },
  { roles: ['super_admin', 'admin'], allowInactive: true }
);
