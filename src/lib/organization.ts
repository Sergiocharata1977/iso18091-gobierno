/**
 * @deprecated Este modulo es legacy y no debe usarse en codigo nuevo.
 *
 * Alternativas recomendadas:
 * - En API routes: usar `auth.organizationId` del AuthContext via `withAuth`
 * - Para resolver org desde request: usar `resolveAuthorizedOrganizationId` de `@/middleware/verifyOrganization`
 * - Para verificar acceso comercial de org: usar `checkOrganizationBillingAccess` de `@/lib/auth/organizationAccessGuard`
 * - Para estado de billing: usar `OrganizationBillingService.getSnapshot` de `@/services/billing/OrganizationBillingService`
 */

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getOrganizationId(
  userId: string
): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.error('Usuario no encontrado:', userId);
      return null;
    }

    const organizationId = userDoc.data().organization_id;

    if (!organizationId) {
      console.warn('Usuario sin organization_id:', userId);
      return null;
    }

    return organizationId;
  } catch (error) {
    console.error('Error al obtener organization_id:', error);
    return null;
  }
}

/**
 * Verificar si un usuario es super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) return false;

    return userDoc.data().rol === 'super_admin';
  } catch (error) {
    console.error('Error al verificar super admin:', error);
    return false;
  }
}

/**
 * Obtener todas las organizaciones (solo super admin)
 */
export async function getAllOrganizations(userId: string) {
  const isSuper = await isSuperAdmin(userId);

  if (!isSuper) {
    throw new Error('No autorizado: requiere rol super_admin');
  }

  // Implementar query de organizaciones
  // TODO: Implementar cuando se cree el panel super admin
}
