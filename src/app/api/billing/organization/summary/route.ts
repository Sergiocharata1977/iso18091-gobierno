import { withAuth } from '@/lib/api/withAuth';
import { getOrganizationBillingSummaryResponse } from '@/lib/billing/organizationBillingApi';
import { MOBBEX_PLANS } from '@/lib/billing/mobbexPlans';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, _context, auth) => {
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
          success: false,
          error:
            'No tienes permisos para administrar la suscripcion de esta organizacion.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ...summary,
      viewer: {
        role: auth.role,
        userId: auth.uid,
        canManage,
      },
      availablePlans: Object.entries(MOBBEX_PLANS).map(([code, plan]) => ({
        code,
        ...plan,
      })),
    });
  },
  { allowInactive: true }
);
