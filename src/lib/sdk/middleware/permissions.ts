/**
 * Permission Middleware
 *
 * Middleware for checking user roles and permissions
 */

import { NextResponse } from 'next/server';
import { ForbiddenError } from '../base/BaseError';
import { UserContext } from '../base/types';
import { AuthenticatedHandler, AuthenticatedRequest } from './auth';

/**
 * Require specific role(s) to access the route
 *
 * @param allowedRoles - One or more roles that are allowed
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export const DELETE = withAuth(
 *   requireRole('admin', 'gerente')(async (req) => {
 *     // Only admin or gerente can access
 *     return NextResponse.json({ success: true });
 *   })
 * );
 * ```
 */
export function requireRole(...allowedRoles: UserContext['role'][]) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
      const { user } = req;

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${user.role}`
        );
      }

      return handler(req);
    };
  };
}

/**
 * Require specific permission(s) to access the route
 *
 * @param requiredPermissions - One or more permissions that are required
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export const POST = withAuth(
 *   requirePermission('audits:create')(async (req) => {
 *     // Only users with audits:create permission can access
 *     return NextResponse.json({ success: true });
 *   })
 * );
 * ```
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
      const { user } = req;

      const hasPermission = requiredPermissions.every(perm =>
        user.permissions.includes(perm)
      );

      if (!hasPermission) {
        throw new ForbiddenError(
          `Access denied. Required permission(s): ${requiredPermissions.join(', ')}`
        );
      }

      return handler(req);
    };
  };
}

/**
 * Require user to belong to specific organization
 *
 * @param getOrganizationId - Function to extract organization ID from request
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export const GET = withAuth(
 *   requireOrganization((req) => req.nextUrl.searchParams.get('orgId')!)(
 *     async (req) => {
 *       // User must belong to the organization specified in query
 *       return NextResponse.json({ success: true });
 *     }
 *   )
 * );
 * ```
 */
export function requireOrganization(
  getOrganizationId: (req: AuthenticatedRequest) => string
) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
      const requestedOrganizationId = getOrganizationId(req);
      const userOrganizationId = req.user.organizationId;

      if (!requestedOrganizationId) {
        throw new ForbiddenError('Organization ID is required');
      }

      if (!userOrganizationId) {
        throw new ForbiddenError('User has no organization assigned');
      }

      if (requestedOrganizationId !== userOrganizationId) {
        throw new ForbiddenError(
          `Access denied. Organization mismatch: ${requestedOrganizationId}`
        );
      }

      return handler(req);
    };
  };
}

/**
 * Require any of the specified roles
 *
 * @param allowedRoles - Roles that are allowed
 * @returns Middleware function
 */
export function requireAnyRole(...allowedRoles: UserContext['role'][]) {
  return requireRole(...allowedRoles);
}

/**
 * Require all of the specified permissions
 *
 * @param requiredPermissions - Permissions that are required
 * @returns Middleware function
 */
export function requireAllPermissions(...requiredPermissions: string[]) {
  return requirePermission(...requiredPermissions);
}

/**
 * Require any of the specified permissions
 *
 * @param requiredPermissions - Permissions where at least one is required
 * @returns Middleware function
 */
export function requireAnyPermission(...requiredPermissions: string[]) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
      const { user } = req;

      const hasPermission = requiredPermissions.some(perm =>
        user.permissions.includes(perm)
      );

      if (!hasPermission) {
        throw new ForbiddenError(
          `Access denied. Required at least one of: ${requiredPermissions.join(', ')}`
        );
      }

      return handler(req);
    };
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require gerente (manager) role
 */
export const requireGerente = requireRole('gerente');

/**
 * Require jefe (supervisor) role
 */
export const requireJefe = requireRole('jefe');

/**
 * Require auditor role
 */
export const requireAuditor = requireRole('auditor');

/**
 * Require management role (admin or gerente)
 */
export const requireManagement = requireRole('admin', 'gerente');

/**
 * Require supervisor role (admin, gerente, or jefe)
 */
export const requireSupervisor = requireRole('admin', 'gerente', 'jefe');

/**
 * Check if user has role (non-throwing version)
 * @param user - User context
 * @param roles - Roles to check
 * @returns True if user has any of the roles
 */
export function checkRole(
  user: UserContext,
  ...roles: UserContext['role'][]
): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user has permission (non-throwing version)
 * @param user - User context
 * @param permissions - Permissions to check
 * @returns True if user has all permissions
 */
export function checkPermission(
  user: UserContext,
  ...permissions: string[]
): boolean {
  return permissions.every(perm => user.permissions.includes(perm));
}

/**
 * Check if user has any permission (non-throwing version)
 * @param user - User context
 * @param permissions - Permissions to check
 * @returns True if user has any permission
 */
export function checkAnyPermission(
  user: UserContext,
  ...permissions: string[]
): boolean {
  return permissions.some(perm => user.permissions.includes(perm));
}
