/**
 * Authentication Middleware
 *
 * Middleware for verifying Firebase tokens and attaching user context to requests
 */

import { getAdminAuth } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { UnauthorizedError } from '../base/BaseError';
import { UserContext } from '../base/types';

/**
 * Extended NextRequest with authenticated user context
 */
export interface AuthenticatedRequest extends NextRequest {
  user: UserContext;
}

/**
 * Type for authenticated route handlers
 */
export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: any
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler with authentication
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (req) => {
 *   const { user } = req;
 *   // user is now available with type safety
 *   return NextResponse.json({ userId: user.uid });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');

      if (!authHeader) {
        throw new UnauthorizedError('No authorization header provided');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError(
          'Invalid authorization header format. Expected: Bearer <token>'
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        throw new UnauthorizedError('No token provided');
      }

      // Verify token with Firebase Admin
      const auth = getAdminAuth();
      const decodedToken = await auth.verifyIdToken(token);

      // Extract user info and custom claims
      const user: UserContext = {
        uid: (decodedToken as any).uid,
        email: (decodedToken as any).email || '',
        role: ((decodedToken as any).role as UserContext['role']) || 'empleado',
        permissions: (decodedToken as any).permissions || [],
        organizationId: (decodedToken as any).organization_id || null,
      };

      // Validate required fields (organizationId removed - not multi-tenant)
      if (!user.uid) {
        throw new UnauthorizedError('Invalid user token');
      }

      // Log authentication success (optional, can be disabled in production)
      if (process.env.LOG_AUTH_ATTEMPTS === 'true') {
        console.log(`✅ Auth success: ${user.email} (${user.role})`);
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = user;

      // Call the actual handler
      return await handler(req as AuthenticatedRequest, context);
    } catch (error) {
      // Log authentication failure
      if (process.env.LOG_AUTH_ATTEMPTS === 'true') {
        console.error(
          '❌ Auth failed:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      // Handle specific error types
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // Handle Firebase Auth errors
      if (error instanceof Error) {
        const message = error.message;

        if (message.includes('expired')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Token has expired. Please sign in again.',
              code: 'TOKEN_EXPIRED',
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
        }

        if (message.includes('invalid')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid token. Please sign in again.',
              code: 'INVALID_TOKEN',
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
        }
      }

      // Generic authentication error
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          code: 'AUTHENTICATION_FAILED',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }
  };
}

/**
 * Alias for withAuth for backward compatibility
 */
export const authMiddleware = withAuth;

/**
 * Verify Firebase ID token
 * @param token - Firebase ID token
 * @returns Decoded token with user info
 */
export async function verifyToken(token: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Extract user context from decoded token
 * @param decodedToken - Decoded Firebase token
 * @returns User context
 */
export function extractUserFromToken(decodedToken: any): UserContext {
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
    role: (decodedToken.role as UserContext['role']) || 'empleado',
    permissions: decodedToken.permissions || [],
  };
}

/**
 * Get user from request (only works in authenticated routes)
 * @param req - Authenticated request
 * @returns User context
 */
export function getUserFromRequest(req: AuthenticatedRequest): UserContext {
  return req.user;
}
