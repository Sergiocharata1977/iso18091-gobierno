import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { ZodError } from 'zod';

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  SelfRegistrationError,
  SelfRegistrationInput,
  SelfRegistrationInputSchema,
  SelfRegistrationResult,
} from '@/types/self-registration';

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

function createOrganizationSlug(companyName: string): string {
  const normalized = companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');

  return normalized || `org-${Date.now()}`;
}

function formatValidationError(error: ZodError): string {
  return error.issues.map(issue => issue.message).join(', ');
}

function toInternalError(
  error: unknown,
  fallback = 'No se pudo completar el auto-registro'
): SelfRegistrationError {
  if (error instanceof ZodError) {
    return {
      success: false,
      code: 'validation_error',
      error: formatValidationError(error),
    };
  }

  if (typeof error === 'object' && error !== null) {
    const authError = error as FirebaseAuthError;
    if (authError.code === 'auth/email-already-exists') {
      return {
        success: false,
        code: 'email_exists',
        error: 'Ya existe un usuario con este email',
      };
    }

    if (typeof authError.message === 'string' && authError.message.trim()) {
      return {
        success: false,
        code: 'internal_error',
        error: authError.message,
      };
    }
  }

  return {
    success: false,
    code: 'internal_error',
    error: fallback,
  };
}

export class SelfRegistrationService {
  static async register(
    input: SelfRegistrationInput
  ): Promise<SelfRegistrationResult | SelfRegistrationError> {
    let createdUserId: string | null = null;

    try {
      const parsedInput = SelfRegistrationInputSchema.parse(input);
      const { name, email, password, companyName, trialDays } = parsedInput;

      const auth = getAdminAuth();
      const db = getAdminFirestore();

      try {
        const existingUser = await auth.getUserByEmail(email);
        if (existingUser) {
          return {
            success: false,
            code: 'email_exists',
            error: 'Ya existe un usuario con este email',
          };
        }
      } catch (error) {
        const authError = error as FirebaseAuthError;
        if (authError.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      const createdUser = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });

      createdUserId = createdUser.uid;

      const organizationId = `org_${randomUUID()}`;
      const now = new Date();
      const trialStartsAt = now;
      const trialEndsAt = new Date(now.getTime() + trialDays * 86400000);
      const organizationSlug = createOrganizationSlug(companyName);

      const batch = db.batch();
      const organizationsRef = db.collection('organizations').doc(organizationId);
      const usersRef = db.collection('users').doc(createdUserId);
      const billingSnapshotsRef = db
        .collection('organization_billing_snapshots')
        .doc(organizationId);

      batch.set(organizationsRef, {
        id: organizationId,
        name: companyName,
        slug: organizationSlug,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        onboarding_phase: 'not_started',
        edition: 'standard',
      });

      batch.set(usersRef, {
        email,
        personnel_id: null,
        rol: 'admin',
        activo: true,
        status: 'active',
        planType: 'trial',
        organization_id: organizationId,
        modulos_habilitados: null,
        is_first_login: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      batch.set(billingSnapshotsRef, {
        organizationId,
        planCode: 'trial',
        subscriptionStatus: 'trialing',
        source: 'organization',
        ownerUserId: createdUserId,
        ownerEmail: email,
        trial: {
          status: 'active',
          startedAt: trialStartsAt,
          endsAt: trialEndsAt,
          grantedByUserId: 'self_registration',
          notes: `Auto-trial ${trialDays} días — registro autoservicio`,
        },
        provider: 'manual',
        providerSubscriptionId: null,
        providerCustomerId: null,
        providerReference: null,
        currentPeriodStart: trialStartsAt,
        currentPeriodEnd: trialEndsAt,
        canceledAt: null,
        pastDueAt: null,
        activatedAt: null,
        lastPaymentAt: null,
        lastPaymentError: null,
        metadata: { source: 'self_registration' },
        legacyUserId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      const customToken = await auth.createCustomToken(createdUserId, {
        organizationId,
      });

      return {
        success: true,
        userId: createdUserId,
        organizationId,
        customToken,
        trialEndsAt,
      };
    } catch (error) {
      if (createdUserId) {
        try {
          await getAdminAuth().deleteUser(createdUserId);
        } catch (cleanupError) {
          console.error(
            '[SelfRegistrationService] Cleanup failed deleting auth user:',
            cleanupError
          );
        }
      }

      return toInternalError(error);
    }
  }
}
