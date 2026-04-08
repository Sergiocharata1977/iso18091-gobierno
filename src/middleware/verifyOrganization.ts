/**
 * Middleware para verificar que el usuario pertenece a una organizacion valida
 * y tiene acceso al contexto solicitado.
 */

import type { AuthContext } from '@/lib/api/withAuth';
import { UserService } from '@/services/auth/UserService';

export type OrganizationErrorCode =
  | 'USER_NOT_FOUND'
  | 'NO_ORGANIZATION'
  | 'ORGANIZATION_MISMATCH'
  | 'ORGANIZATION_REQUIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

const ORGANIZATION_ERROR_DEFAULT_MESSAGES: Record<
  OrganizationErrorCode,
  string
> = {
  USER_NOT_FOUND: 'Usuario no encontrado',
  NO_ORGANIZATION:
    'Usuario sin organizacion asignada. Por favor contacte al administrador.',
  ORGANIZATION_MISMATCH: 'Acceso denegado',
  ORGANIZATION_REQUIRED: 'organization_id es requerido',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso denegado',
};

export interface OrganizationVerificationResult {
  valid: boolean;
  organization_id?: string;
  error?: string;
  errorCode?: Extract<
    OrganizationErrorCode,
    'USER_NOT_FOUND' | 'NO_ORGANIZATION' | 'ORGANIZATION_MISMATCH' | 'FORBIDDEN'
  >;
}

export interface OrganizationScopeGuardResult {
  ok: boolean;
  organizationId?: string;
  status?: number;
  error?: string;
  errorCode?: OrganizationErrorCode;
}

export interface OrganizationApiErrorContract {
  status: number;
  error: string;
  errorCode: OrganizationErrorCode;
}

function getDefaultStatusForOrganizationError(
  errorCode: OrganizationErrorCode
): number {
  switch (errorCode) {
    case 'UNAUTHORIZED':
      return 401;
    case 'ORGANIZATION_REQUIRED':
      return 400;
    case 'USER_NOT_FOUND':
      return 404;
    case 'NO_ORGANIZATION':
    case 'ORGANIZATION_MISMATCH':
    case 'FORBIDDEN':
    default:
      return 403;
  }
}

function inferOrganizationErrorCode(result: {
  status?: number;
  errorCode?: OrganizationErrorCode;
}): OrganizationErrorCode {
  if (result.errorCode) return result.errorCode;
  if (result.status === 401) return 'UNAUTHORIZED';
  if (result.status === 400) return 'ORGANIZATION_REQUIRED';
  if (result.status === 404) return 'USER_NOT_FOUND';
  return 'FORBIDDEN';
}

/**
 * Contrato reusable para endpoints multi-tenant.
 * Agente 2: usar este helper para serializar errores de scope (Org/Authz) y
 * mantener consistencia de status + errorCode + mensaje por defecto.
 */
export function toOrganizationApiError(
  result: Pick<OrganizationScopeGuardResult, 'status' | 'error' | 'errorCode'>,
  options?: {
    defaultStatus?: number;
    defaultError?: string;
    messageOverrides?: Partial<Record<OrganizationErrorCode, string>>;
  }
): OrganizationApiErrorContract {
  const errorCode = inferOrganizationErrorCode(result);
  const status =
    result.status ??
    options?.defaultStatus ??
    getDefaultStatusForOrganizationError(errorCode);
  const error =
    options?.messageOverrides?.[errorCode] ||
    result.error ||
    options?.defaultError ||
    ORGANIZATION_ERROR_DEFAULT_MESSAGES[errorCode];

  return { status, error, errorCode };
}

/**
 * Verifica que un usuario tenga una organizacion asignada.
 * @param userId Firebase Auth UID
 */
export async function verifyUserOrganization(
  userId: string
): Promise<OrganizationVerificationResult> {
  try {
    const user = await UserService.getById(userId);

    if (!user) {
      return {
        valid: false,
        error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.USER_NOT_FOUND,
        errorCode: 'USER_NOT_FOUND',
      };
    }

    if (!user.organization_id) {
      return {
        valid: false,
        error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.NO_ORGANIZATION,
        errorCode: 'NO_ORGANIZATION',
      };
    }

    return {
      valid: true,
      organization_id: user.organization_id,
    };
  } catch (error) {
    console.error('[verifyUserOrganization] Error:', error);

    if (error instanceof Error && error.message.includes('no organization')) {
      return {
        valid: false,
        error: error.message,
        errorCode: 'NO_ORGANIZATION',
      };
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      errorCode: 'USER_NOT_FOUND',
    };
  }
}

/**
 * Verifica que un usuario tenga acceso a datos de una organizacion especifica.
 * @param userId Firebase Auth UID
 * @param targetOrganizationId ID de la organizacion objetivo
 */
export async function verifyOrganizationAccess(
  userId: string,
  targetOrganizationId: string
): Promise<OrganizationVerificationResult> {
  try {
    const verification = await verifyUserOrganization(userId);

    if (!verification.valid) {
      return verification;
    }

    if (verification.organization_id !== targetOrganizationId) {
      return {
        valid: false,
        error: 'Acceso denegado: el usuario no pertenece a esta organizacion',
        errorCode: 'ORGANIZATION_MISMATCH',
      };
    }

    return {
      valid: true,
      organization_id: verification.organization_id,
    };
  } catch (error) {
    console.error('[verifyOrganizationAccess] Error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      errorCode: 'FORBIDDEN',
    };
  }
}

type MinimalAuthContext = Pick<AuthContext, 'uid' | 'role' | 'organizationId'>;

/**
 * Resuelve y valida el organization_id efectivo para una request autenticada.
 * Reutiliza verifyOrganization* para evitar duplicar reglas multi-tenant.
 */
export async function resolveAuthorizedOrganizationId(
  auth: MinimalAuthContext,
  requestedOrganizationId?: string | null,
  options?: {
    requireOrg?: boolean;
    allowSuperAdminCrossOrg?: boolean;
  }
): Promise<OrganizationScopeGuardResult> {
  const requested = requestedOrganizationId?.trim() || null;
  const tokenOrg = auth.organizationId?.trim() || null;
  const requireOrg = options?.requireOrg ?? true;
  const allowSuperAdminCrossOrg = options?.allowSuperAdminCrossOrg ?? true;

  if (auth.role === 'super_admin') {
    if (
      requested &&
      !allowSuperAdminCrossOrg &&
      tokenOrg &&
      requested !== tokenOrg
    ) {
      return {
        ok: false,
        status: 403,
        error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.ORGANIZATION_MISMATCH,
        errorCode: 'ORGANIZATION_MISMATCH',
      };
    }

    const effectiveOrg = requested || tokenOrg;
    if (!effectiveOrg && requireOrg) {
      return {
        ok: false,
        status: 400,
        error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.ORGANIZATION_REQUIRED,
        errorCode: 'ORGANIZATION_REQUIRED',
      };
    }

    return {
      ok: true,
      organizationId: effectiveOrg || undefined,
    };
  }

  const effectiveOrg = requested || tokenOrg;
  if (!effectiveOrg) {
    return {
      ok: false,
      status: 403,
      error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.NO_ORGANIZATION,
      errorCode: 'NO_ORGANIZATION',
    };
  }

  // Fast path (server-safe): when withAuth already resolved the user's org,
  // avoid re-reading the user through UserService (client SDK), which can fail
  // in API routes and incorrectly return 403.
  if (tokenOrg) {
    if (requested && requested !== tokenOrg) {
      return {
        ok: false,
        status: 403,
        error: ORGANIZATION_ERROR_DEFAULT_MESSAGES.ORGANIZATION_MISMATCH,
        errorCode: 'ORGANIZATION_MISMATCH',
      };
    }

    return {
      ok: true,
      organizationId: tokenOrg,
    };
  }

  const verification = await verifyOrganizationAccess(auth.uid, effectiveOrg);
  if (!verification.valid) {
    return {
      ok: false,
      ...toOrganizationApiError(
        {
          status: 403,
          error: verification.error,
          errorCode: verification.errorCode,
        },
        {
          defaultStatus: 403,
          defaultError: ORGANIZATION_ERROR_DEFAULT_MESSAGES.FORBIDDEN,
        }
      ),
    };
  }

  return {
    ok: true,
    organizationId: verification.organization_id || effectiveOrg,
  };
}

/**
 * Verifica que el usuario objetivo pertenezca a la misma organizacion
 * (salvo super_admin).
 */
export async function verifyTargetUserOrganizationScope(
  auth: MinimalAuthContext,
  targetUserId: string
): Promise<OrganizationScopeGuardResult> {
  if (auth.role === 'super_admin') {
    return { ok: true };
  }

  const targetUser = await verifyUserOrganization(targetUserId);
  if (!targetUser.valid || !targetUser.organization_id) {
    return {
      ok: false,
      ...toOrganizationApiError(
        {
          status: targetUser.errorCode === 'USER_NOT_FOUND' ? 404 : 403,
          error: targetUser.error,
          errorCode: targetUser.errorCode,
        },
        {
          defaultStatus: 403,
          defaultError: ORGANIZATION_ERROR_DEFAULT_MESSAGES.FORBIDDEN,
        }
      ),
    };
  }

  const actorScope = await verifyOrganizationAccess(
    auth.uid,
    targetUser.organization_id
  );
  if (!actorScope.valid) {
    return {
      ok: false,
      ...toOrganizationApiError(
        {
          status: 403,
          error: actorScope.error,
          errorCode: actorScope.errorCode,
        },
        {
          defaultStatus: 403,
          defaultError: ORGANIZATION_ERROR_DEFAULT_MESSAGES.FORBIDDEN,
        }
      ),
    };
  }

  return {
    ok: true,
    organizationId: targetUser.organization_id,
  };
}
