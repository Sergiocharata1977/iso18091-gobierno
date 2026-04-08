/**
 * Authentication Helper Functions
 *
 * Helper functions for authentication and user context
 */

import { UnauthorizedError } from '../base/BaseError';
import { UserContext } from '../base/types';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Require authentication - throws if user is not authenticated
 * @param user - User context (can be undefined)
 * @throws UnauthorizedError if user is not authenticated
 */
export function requireAuth(user?: UserContext): asserts user is UserContext {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Get current user from request
 * @param req - Authenticated request
 * @returns User context
 * @throws UnauthorizedError if user is not authenticated
 */
export function getCurrentUser(req: AuthenticatedRequest): UserContext {
  const user = req.user;
  requireAuth(user);
  return user;
}

/**
 * Check if user is authenticated
 * @param user - User context (can be undefined)
 * @returns True if user is authenticated
 */
export function isAuthenticated(user?: UserContext): user is UserContext {
  return user !== undefined && user !== null;
}

/**
 * Get user ID safely
 * @param user - User context
 * @returns User ID or null
 */
export function getUserId(user?: UserContext): string | null {
  return user?.uid || null;
}

/**
 * Get user email safely
 * @param user - User context
 * @returns User email or null
 */
export function getUserEmail(user?: UserContext): string | null {
  return user?.email || null;
}

/**
 * Get user role safely
 * @param user - User context
 * @returns User role or null
 */
export function getUserRole(user?: UserContext): UserContext['role'] | null {
  return user?.role || null;
}

/**
 * Get user organization ID safely
 * @param user - User context
 * @returns Organization ID or null
 */
export function getUserOrganizationId(user?: UserContext): string | null {
  return user?.uid || null;
}

/**
 * Get user permissions safely
 * @param user - User context
 * @returns Array of permissions
 */
export function getUserPermissions(user?: UserContext): string[] {
  return user?.permissions || [];
}

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
  return user.role === 'admin' || user.role === 'gerente';
}

/**
 * Check if user has supervisor role (admin, gerente, or jefe)
 * @param user - User context
 * @returns True if user has supervisor role
 */
export function isSupervisor(user: UserContext): boolean {
  return (
    user.role === 'admin' || user.role === 'gerente' || user.role === 'jefe'
  );
}

/**
 * Check if user belongs to specific organization
 * Note: Not multi-tenant, so this always returns true
 * @param user - User context
 * @param organizationId - Organization ID to check
 * @returns True if user belongs to the organization
 */
export function belongsToOrganization(
  user: UserContext,
  organizationId: string
): boolean {
  // Not multi-tenant - all users belong to the same organization
  return true;
}

/**
 * Require user to belong to specific organization
 * Note: Not multi-tenant, so this always passes
 * @param user - User context
 * @param organizationId - Organization ID to check
 * @throws UnauthorizedError if user doesn't belong to the organization
 */
export function requireOrganization(
  user: UserContext,
  organizationId: string
): void {
  // Not multi-tenant - all users belong to the same organization
  // This function is kept for backward compatibility
}
