// Endpoint de API para eliminar un usuario (Auth + Firestore + Personnel)
// Protected: requires admin or super_admin role

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { getOrganizationBillingSnapshot } from '@/services/billing/OrganizationBillingService';
import { toLegacyUserBillingFields } from '@/lib/billing/organizationBillingStatus';
import { OrganizationOnboardingService } from '@/services/onboarding/OrganizationOnboardingService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const { id: userId } = await context.params;

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        // Allow self lookup fallback from token context (login flow just after sign in)
        if (userId === auth.uid) {
          return NextResponse.json({
            id: auth.uid,
            email: auth.email,
            rol: auth.role,
            organization_id: auth.organizationId || null,
            personnel_id: auth.user?.personnel_id || null,
            activo: auth.user?.activo ?? true,
            status: auth.user?.status || 'active',
          });
        }

        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const data = userDoc.data() as any;
      const isSelf = userId === auth.uid;
      const sameOrg =
        auth.role === 'super_admin' ||
        !auth.organizationId ||
        data.organization_id === auth.organizationId;

      if (!isSelf && !sameOrg) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const expirationDate = data.expirationDate?.toDate?.()
        ? data.expirationDate.toDate().toISOString()
        : data.expirationDate || null;
      const organizationId = data.organization_id || auth.organizationId || null;
      const onboardingState = organizationId
        ? await OrganizationOnboardingService.getOrganizationOnboardingState(
            organizationId
          )
        : null;
      const derivedBilling =
        organizationId && auth.role !== 'super_admin'
          ? toLegacyUserBillingFields(
              await getOrganizationBillingSnapshot(organizationId)
            )
          : null;

      return NextResponse.json({
        id: userDoc.id,
        email: data.email || auth.email,
        rol: data.rol || data.role || 'operario',
        role: data.role || data.rol || 'operario',
        organization_id: organizationId,
        personnel_id: data.personnel_id || null,
        activo: derivedBilling?.activo ?? data.activo ?? true,
        status: derivedBilling?.status || data.status || 'active',
        planType: derivedBilling?.planType || data.planType || 'none',
        billing_status: derivedBilling?.billing_status || data.billing_status || null,
        next_billing_date:
          derivedBilling?.next_billing_date?.toISOString() ||
          data.next_billing_date?.toDate?.()?.toISOString?.() ||
          data.next_billing_date ||
          null,
        expirationDate:
          derivedBilling?.expirationDate?.toISOString() || expirationDate,
        onboarding_phase:
          onboardingState?.onboarding_phase ||
          data.onboarding_phase ||
          data.onboardingPhase ||
          null,
        onboarding_owner_user_id:
          onboardingState?.owner?.user_id ||
          data.onboarding_owner_user_id ||
          data.onboardingOwnerUserId ||
          null,
        onboarding_bootstrap_status:
          onboardingState?.bootstrap?.status || null,
      });
    } catch (error) {
      console.error('[API /users/[id] GET] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener usuario',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'],
    allowInactive: true,
    allowMissingUser: true,
    allowNoOrg: true,
  }
);

export const DELETE = withAuth(
  async (_request, context, auth) => {
    try {
      const { id: userId } = await context.params;

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      console.log(
        '[API /users/delete] Deleting user:',
        userId,
        'by:',
        auth.email
      );

      // Get user data from Firestore to check if has personnel
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      // Security: non-super_admin can only delete users from their own org
      if (
        auth.role !== 'super_admin' &&
        userData?.organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          {
            error:
              'No tienes permisos para eliminar usuarios de otra organización',
          },
          { status: 403 }
        );
      }

      const personnelId = userData?.personnel_id;

      // Delete from Firebase Auth
      try {
        await adminAuth.deleteUser(userId);
        console.log('[API /users/delete] Deleted from Firebase Auth');
      } catch (authError) {
        console.error(
          '[API /users/delete] Error deleting from Auth:',
          authError
        );
        // Continue even if Auth deletion fails (user might not exist)
      }

      // Delete from Firestore users collection
      await db.collection('users').doc(userId).delete();
      console.log('[API /users/delete] Deleted from Firestore users');

      // Delete personnel if exists and is linked
      if (personnelId) {
        try {
          await db.collection('personnel').doc(personnelId).delete();
          console.log(
            '[API /users/delete] Deleted linked personnel:',
            personnelId
          );
        } catch (personnelError) {
          console.error(
            '[API /users/delete] Error deleting personnel:',
            personnelError
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        deletedPersonnel: !!personnelId,
      });
    } catch (error) {
      console.error('[API /users/delete] Error:', error);

      return NextResponse.json(
        {
          error: 'Error al eliminar usuario',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
