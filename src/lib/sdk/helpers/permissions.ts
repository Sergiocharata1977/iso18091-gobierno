/**
 * Permission Helper Functions
 *
 * Helper functions for checking permissions and resource ownership
 */

import { ForbiddenError } from '../base/BaseError';
import { BaseDocument, UserContext } from '../base/types';

/**
 * Check if user has specific role
 * @param user - User context
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(user: UserContext, role: UserContext['role']): boolean {
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 * @param user - User context
 * @param roles - Roles to check
 * @returns True if user has any of the roles
 */
export function hasAnyRole(
  user: UserContext,
  roles: UserContext['role'][]
): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user has specific permission
 * @param user - User context
 * @param permission - Permission to check
 * @returns True if user has the permission
 */
export function hasPermission(user: UserContext, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user has all specified permissions
 * @param user - User context
 * @param permissions - Permissions to check
 * @returns True if user has all permissions
 */
export function hasAllPermissions(
  user: UserContext,
  permissions: string[]
): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Check if user has any of the specified permissions
 * @param user - User context
 * @param permissions - Permissions to check
 * @returns True if user has any of the permissions
 */
export function hasAnyPermission(
  user: UserContext,
  permissions: string[]
): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Require user to have specific role
 * @param user - User context
 * @param role - Required role
 * @throws ForbiddenError if user doesn't have the role
 */
export function requireRole(
  user: UserContext,
  role: UserContext['role']
): void {
  if (!hasRole(user, role)) {
    throw new ForbiddenError(`Required role: ${role}. Your role: ${user.role}`);
  }
}

/**
 * Require user to have any of the specified roles
 * @param user - User context
 * @param roles - Required roles
 * @throws ForbiddenError if user doesn't have any of the roles
 */
export function requireAnyRole(
  user: UserContext,
  roles: UserContext['role'][]
): void {
  if (!hasAnyRole(user, roles)) {
    throw new ForbiddenError(
      `Required role: ${roles.join(' or ')}. Your role: ${user.role}`
    );
  }
}

/**
 * Require user to have specific permission
 * @param user - User context
 * @param permission - Required permission
 * @throws ForbiddenError if user doesn't have the permission
 */
export function requirePermission(user: UserContext, permission: string): void {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError(`Required permission: ${permission}`);
  }
}

/**
 * Require user to have all specified permissions
 * @param user - User context
 * @param permissions - Required permissions
 * @throws ForbiddenError if user doesn't have all permissions
 */
export function requireAllPermissions(
  user: UserContext,
  permissions: string[]
): void {
  if (!hasAllPermissions(user, permissions)) {
    throw new ForbiddenError(`Required permissions: ${permissions.join(', ')}`);
  }
}

/**
 * Require user to have any of the specified permissions
 * @param user - User context
 * @param permissions - Required permissions
 * @throws ForbiddenError if user doesn't have any permission
 */
export function requireAnyPermission(
  user: UserContext,
  permissions: string[]
): void {
  if (!hasAnyPermission(user, permissions)) {
    throw new ForbiddenError(
      `Required at least one of: ${permissions.join(', ')}`
    );
  }
}

/**
 * Require user to belong to specific organization
 * Note: Not multi-tenant, so this always passes
 * @param user - User context
 * @param organizationId - Required organization ID
 * @throws ForbiddenError if user doesn't belong to the organization
 */
export function requireOrganization(
  user: UserContext,
  organizationId: string
): void {
  // Not multi-tenant - all users belong to the same organization
  // This function is kept for backward compatibility
}

/**
 * Check if user is resource owner
 * @param userId - User ID to check
 * @param resourceOwnerId - Resource owner ID
 * @returns True if user is the owner
 */
export function isResourceOwner(
  userId: string,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId;
}

/**
 * Check if user can modify resource
 * Allows if user is owner OR has management role
 * @param user - User context
 * @param resource - Resource with createdBy field
 * @returns True if user can modify
 */
export function canModifyResource(
  user: UserContext,
  resource: BaseDocument
): boolean {
  // Owner can always modify
  if (isResourceOwner(user.uid, resource.createdBy)) {
    return true;
  }

  // Management roles can modify
  if (hasAnyRole(user, ['admin', 'gerente'])) {
    return true;
  }

  return false;
}

/**
 * Check if user can delete resource
 * Allows if user has management role
 * @param user - User context
 * @param resource - Resource to delete
 * @returns True if user can delete
 */
export function canDeleteResource(
  user: UserContext,
  resource: BaseDocument
): boolean {
  // Only management roles can delete
  return hasAnyRole(user, ['admin', 'gerente']);
}

/**
 * Require user to be resource owner
 * @param user - User context
 * @param resource - Resource with createdBy field
 * @throws ForbiddenError if user is not the owner
 */
export function requireResourceOwner(
  user: UserContext,
  resource: BaseDocument
): void {
  if (!isResourceOwner(user.uid, resource.createdBy)) {
    throw new ForbiddenError(
      'Access denied: You are not the owner of this resource'
    );
  }
}

/**
 * Require user to be able to modify resource
 * @param user - User context
 * @param resource - Resource to modify
 * @throws ForbiddenError if user cannot modify
 */
export function requireCanModify(
  user: UserContext,
  resource: BaseDocument
): void {
  if (!canModifyResource(user, resource)) {
    throw new ForbiddenError('Access denied: You cannot modify this resource');
  }
}

/**
 * Require user to be able to delete resource
 * @param user - User context
 * @param resource - Resource to delete
 * @throws ForbiddenError if user cannot delete
 */
export function requireCanDelete(
  user: UserContext,
  resource: BaseDocument
): void {
  if (!canDeleteResource(user, resource)) {
    throw new ForbiddenError('Access denied: You cannot delete this resource');
  }
}

/**
 * Check if user is admin
 * @param user - User context
 * @returns True if user is admin
 */
export function isAdmin(user: UserContext): boolean {
  return user.role === 'admin';
}

/**
 * Check if user is gerente (manager)
 * @param user - User context
 * @returns True if user is gerente
 */
export function isGerente(user: UserContext): boolean {
  return user.role === 'gerente';
}

/**
 * Check if user is jefe (supervisor)
 * @param user - User context
 * @returns True if user is jefe
 */
export function isJefe(user: UserContext): boolean {
  return user.role === 'jefe';
}

/**
 * Check if user is auditor
 * @param user - User context
 * @returns True if user is auditor
 */
export function isAuditor(user: UserContext): boolean {
  return user.role === 'auditor';
}

/**
 * Check if user has management role (admin or gerente)
 * @param user - User context
 * @returns True if user has management role
 */
export function isManagement(user: UserContext): boolean {
  return hasAnyRole(user, ['admin', 'gerente']);
}

/**
 * Check if user has supervisor role (admin, gerente, or jefe)
 * @param user - User context
 * @returns True if user has supervisor role
 */
export function isSupervisor(user: UserContext): boolean {
  return hasAnyRole(user, ['admin', 'gerente', 'jefe']);
}

/**
 * Combine multiple permission checks with AND logic
 * @param checks - Array of check functions
 * @returns True if all checks pass
 */
export function checkAll(...checks: (() => boolean)[]): boolean {
  return checks.every(check => check());
}

/**
 * Combine multiple permission checks with OR logic
 * @param checks - Array of check functions
 * @returns True if any check passes
 */
export function checkAny(...checks: (() => boolean)[]): boolean {
  return checks.some(check => check());
}

/**
 * Create a permission checker function
 * @param user - User context
 * @returns Object with permission checking methods
 */
export function createPermissionChecker(user: UserContext) {
  return {
    hasRole: (role: UserContext['role']) => hasRole(user, role),
    hasAnyRole: (roles: UserContext['role'][]) => hasAnyRole(user, roles),
    hasPermission: (permission: string) => hasPermission(user, permission),
    hasAllPermissions: (permissions: string[]) =>
      hasAllPermissions(user, permissions),
    hasAnyPermission: (permissions: string[]) =>
      hasAnyPermission(user, permissions),
    isAdmin: () => isAdmin(user),
    isGerente: () => isGerente(user),
    isJefe: () => isJefe(user),
    isAuditor: () => isAuditor(user),
    isManagement: () => isManagement(user),
    isSupervisor: () => isSupervisor(user),
    canModify: (resource: BaseDocument) => canModifyResource(user, resource),
    canDelete: (resource: BaseDocument) => canDeleteResource(user, resource),
    isOwner: (resource: BaseDocument) =>
      isResourceOwner(user.uid, resource.createdBy),
  };
}
