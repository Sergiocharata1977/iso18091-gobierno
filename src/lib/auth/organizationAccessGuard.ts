/**
 * organizationAccessGuard
 * Guard server-side para verificar el estado comercial de una organizacion.
 * Se usa en API routes y middleware que necesiten evaluar si la org tiene acceso activo.
 *
 * Rollback de emergencia: BILLING_GUARD_DISABLED=true en env vars.
 */

import { OrganizationBillingService } from '@/services/billing/OrganizationBillingService';
import type {
  OrganizationAccessState,
  OrganizationBillingSnapshot,
} from '@/types/organization-billing';

export type OrganizationAccessDecision = {
  allow: boolean;
  reason:
    | OrganizationAccessState
    | 'no_snapshot'
    | 'guard_disabled'
    | 'no_org_id';
  snapshot: OrganizationBillingSnapshot | null;
  lockedReason?: string | null;
};

/**
 * Evalua si una organizacion tiene acceso al producto segun su estado comercial.
 *
 * Retorna `allow: true` en los siguientes casos:
 * - BILLING_GUARD_DISABLED=true (flag de emergencia)
 * - La org no tiene snapshot de billing todavia (orgs legacy no migradas)
 * - accessState es 'active', 'trial', 'grace_period' o 'canceled' (aun dentro de periodo)
 *
 * Retorna `allow: false` solo cuando accessState === 'blocked'.
 */
export async function checkOrganizationBillingAccess(
  organizationId: string | null | undefined
): Promise<OrganizationAccessDecision> {
  if (process.env.BILLING_GUARD_DISABLED === 'true') {
    return { allow: true, reason: 'guard_disabled', snapshot: null };
  }

  if (!organizationId?.trim()) {
    return { allow: false, reason: 'no_org_id', snapshot: null };
  }

  let snapshot: OrganizationBillingSnapshot;
  try {
    snapshot = await OrganizationBillingService.getSnapshot(organizationId);
  } catch (err) {
    console.error(
      '[organizationAccessGuard] Error al leer snapshot de billing:',
      err
    );
    // Si no se puede leer el snapshot, permitir acceso para no bloquear produccion
    return { allow: true, reason: 'no_snapshot', snapshot: null };
  }

  // Org sin datos de billing (aun no migrada o recien creada sin trial asignado)
  if (snapshot.source === 'none') {
    return { allow: true, reason: 'no_snapshot', snapshot };
  }

  const accessState = snapshot.commercialState.accessState;
  const allow = accessState !== 'blocked';

  return {
    allow,
    reason: accessState,
    snapshot,
    lockedReason: snapshot.commercialState.lockedReason ?? null,
  };
}

/**
 * Version simplificada que devuelve solo el booleano.
 * Para uso rapido en guards de API sin necesitar el detalle.
 */
export async function hasOrganizationAccess(
  organizationId: string | null | undefined
): Promise<boolean> {
  const decision = await checkOrganizationBillingAccess(organizationId);
  return decision.allow;
}
