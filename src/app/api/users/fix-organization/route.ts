/**
 * DESHABILITADO — endpoint de reparacion manual legacy.
 *
 * Este endpoint fue necesario durante la migracion inicial de usuarios sin organization_id.
 * Tenia hardcodeado el organization_id 'org_los_senores_del_agro', lo que lo convertia en
 * una puerta de corrupcion de datos si se ejecutaba accidentalmente.
 *
 * Para cualquier operacion de backfill futura, usar el script de auditoria:
 *   scripts/audit-onboarding-billing-legacy.ts
 *
 * O el endpoint de reconciliacion:
 *   POST /api/billing/organization/reconcile
 */

import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async () => {
    return NextResponse.json(
      {
        error: 'Endpoint deshabilitado',
        message:
          'Este endpoint fue deshabilitado en la migracion post-federado. ' +
          'Usar /api/billing/organization/reconcile para reconciliar estado comercial.',
      },
      { status: 410 }
    );
  },
  { roles: ['super_admin'] }
);
