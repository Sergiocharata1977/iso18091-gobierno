/**
 * Custom Claims Management
 *
 * Functions for managing Firebase custom claims (roles and permissions)
 */

import { getAdminAuth } from '@/lib/firebase/admin';
import { ForbiddenError } from '../base/BaseError';
import { UserContext } from '../base/types';

/**
 * Custom claims interface
 */
export interface CustomClaims {
  role?: UserContext['role'];
  organizationId?: string;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Set custom claims for a user
 * @param userId - User ID
 * @param claims - Custom claims to set
 */
export async function setCustomClaims(
  userId: string,
  claims: CustomClaims
): Promise<void> {
  try {
    const auth = getAdminAuth();
    await auth.setCustomUserClaims(userId, claims);

    console.log(`✅ Custom claims set for user ${userId}:`, claims);
  } catch (error) {
    console.error(`❌ Failed to set custom claims for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get custom claims for a user
 * @param userId - User ID
 * @returns Custom claims
 */
export async function getCustomClaims(userId: string): Promise<CustomClaims> {
  try {
    const auth = getAdminAuth();
    const user = await auth.getUser(userId);
    return user.customClaims || {};
  } catch (error) {
    console.error(`❌ Failed to get custom claims for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Set user role
 * @param userId - User ID
 * @param role - Role to set
 * @param requestingUser - User making the request (for validation)
 */
export async function setUserRole(
  userId: string,
  role: UserContext['role'],
  requestingUser?: UserContext
): Promise<void> {
  // Validate role transition if requesting user is provided
  if (requestingUser) {
    validateRoleTransition(requestingUser, role);
  }

  const existingClaims = await getCustomClaims(userId);
  await setCustomClaims(userId, {
    ...existingClaims,
    role,
  });

  // Log role change
  console.log(
    `📝 Role changed for user ${userId}: ${existingClaims.role || 'none'} → ${role}`
  );
}

/**
 * Set user permissions
 * @param userId - User ID
 * @param permissions - Permissions to set
 */
export async function setUserPermissions(
  userId: string,
  permissions: string[]
): Promise<void> {
  const existingClaims = await getCustomClaims(userId);
  await setCustomClaims(userId, {
    ...existingClaims,
    permissions,
  });

  console.log(`📝 Permissions set for user ${userId}:`, permissions);
}

/**
 * Add permission to user
 * @param userId - User ID
 * @param permission - Permission to add
 */
export async function addUserPermission(
  userId: string,
  permission: string
): Promise<void> {
  const existingClaims = await getCustomClaims(userId);
  const permissions = existingClaims.permissions || [];

  if (!permissions.includes(permission)) {
    permissions.push(permission);
    await setUserPermissions(userId, permissions);
  }
}

/**
 * Remove permission from user
 * @param userId - User ID
 * @param permission - Permission to remove
 */
export async function removeUserPermission(
  userId: string,
  permission: string
): Promise<void> {
  const existingClaims = await getCustomClaims(userId);
  const permissions = existingClaims.permissions || [];

  const updatedPermissions = permissions.filter(p => p !== permission);
  await setUserPermissions(userId, updatedPermissions);
}

/**
 * Set user organization
 * @param userId - User ID
 * @param organizationId - Organization ID
 */
export async function setUserOrganization(
  userId: string,
  organizationId: string
): Promise<void> {
  const existingClaims = await getCustomClaims(userId);
  await setCustomClaims(userId, {
    ...existingClaims,
    organizationId,
  });

  console.log(`📝 Organization set for user ${userId}: ${organizationId}`);
}

/**
 * Initialize user claims (for new users)
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param role - Initial role (default: empleado)
 * @param permissions - Initial permissions (default: empty)
 */
export async function initializeUserClaims(
  userId: string,
  organizationId: string,
  role: UserContext['role'] = 'empleado',
  permissions: string[] = []
): Promise<void> {
  await setCustomClaims(userId, {
    role,
    organizationId,
    permissions,
  });

  console.log(`✅ User claims initialized for ${userId}:`, {
    role,
    organizationId,
    permissions,
  });
}

/**
 * Clear all custom claims for a user
 * @param userId - User ID
 */
export async function clearCustomClaims(userId: string): Promise<void> {
  await setCustomClaims(userId, {});
  console.log(`🗑️  Custom claims cleared for user ${userId}`);
}

/**
 * Validate role transition
 * Only admins can assign admin role
 * @param requestingUser - User making the request
 * @param newRole - New role to assign
 * @throws ForbiddenError if transition is not allowed
 */
function validateRoleTransition(
  requestingUser: UserContext,
  newRole: UserContext['role']
): void {
  // Only admin can assign admin role
  if (newRole === 'admin' && requestingUser.role !== 'admin') {
    throw new ForbiddenError('Only admins can assign admin role');
  }

  // Only admin or gerente can assign gerente role
  if (
    newRole === 'gerente' &&
    !['admin', 'gerente'].includes(requestingUser.role)
  ) {
    throw new ForbiddenError('Only admins or gerentes can assign gerente role');
  }
}

/**
 * Force token refresh for user
 * This will make the user's current token invalid and require re-authentication
 * @param userId - User ID
 */
export async function forceTokenRefresh(userId: string): Promise<void> {
  try {
    const auth = getAdminAuth();
    await auth.revokeRefreshTokens(userId);
    console.log(`🔄 Token refresh forced for user ${userId}`);
  } catch (error) {
    console.error(
      `❌ Failed to force token refresh for user ${userId}:`,
      error
    );
    throw error;
  }
}

/**
 * Update user claims and force token refresh
 * @param userId - User ID
 * @param claims - Custom claims to set
 */
export async function updateClaimsAndRefresh(
  userId: string,
  claims: CustomClaims
): Promise<void> {
  await setCustomClaims(userId, claims);
  await forceTokenRefresh(userId);
}

/**
 * Batch update roles for multiple users
 * @param updates - Array of user ID and role pairs
 */
export async function batchUpdateRoles(
  updates: Array<{ userId: string; role: UserContext['role'] }>
): Promise<void> {
  const promises = updates.map(({ userId, role }) => setUserRole(userId, role));
  await Promise.all(promises);
  console.log(`✅ Batch role update completed for ${updates.length} users`);
}

/**
 * Batch update permissions for multiple users
 * @param updates - Array of user ID and permissions pairs
 */
export async function batchUpdatePermissions(
  updates: Array<{ userId: string; permissions: string[] }>
): Promise<void> {
  const promises = updates.map(({ userId, permissions }) =>
    setUserPermissions(userId, permissions)
  );
  await Promise.all(promises);
  console.log(
    `✅ Batch permissions update completed for ${updates.length} users`
  );
}

/**
 * Get all users with specific role
 * @param role - Role to filter by
 * @returns Array of user IDs
 */
export async function getUsersByRole(
  role: UserContext['role']
): Promise<string[]> {
  const auth = getAdminAuth();
  const userIds: string[] = [];

  // List all users (paginated)
  let pageToken: string | undefined;
  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);

    for (const user of listUsersResult.users) {
      if (user.customClaims?.role === role) {
        userIds.push(user.uid);
      }
    }

    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  return userIds;
}

/**
 * Get all users in organization
 * @param organizationId - Organization ID
 * @returns Array of user IDs
 */
export async function getUsersByOrganization(
  organizationId: string
): Promise<string[]> {
  const auth = getAdminAuth();
  const userIds: string[] = [];

  // List all users (paginated)
  let pageToken: string | undefined;
  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);

    for (const user of listUsersResult.users) {
      if (user.customClaims?.organizationId === organizationId) {
        userIds.push(user.uid);
      }
    }

    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  return userIds;
}
