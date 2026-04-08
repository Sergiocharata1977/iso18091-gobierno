import { NextRequest } from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
}

/**
 * Verify Firebase Auth token from request headers
 * Returns userId if valid, throws error if invalid
 *
 * NOTE: This is a placeholder implementation.
 * For production, you need to use Firebase Admin SDK to verify tokens.
 */
export async function verifyAuthToken(
  _request: NextRequest
): Promise<string | null> {
  // TODO: Implement Firebase Admin token verification
  // Example:
  // import { getAuth } from 'firebase-admin/auth';
  // const decodedToken = await getAuth().verifyIdToken(token);
  // return decodedToken.uid;

  return null;
}

/**
 * Extract userId from query parameters or request body
 * Used as fallback when no auth token is provided
 */
export function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): string | null {
  // Try query params first
  const { searchParams } = new URL(request.url);
  const userIdFromQuery = searchParams.get('userId');
  if (userIdFromQuery) return userIdFromQuery;

  // Try body
  if (body?.userId && typeof body.userId === 'string') {
    return body.userId;
  }

  return null;
}

/**
 * Middleware helper to ensure user is authenticated
 * Returns userId or throws 401 error
 */
export async function requireAuth(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  // Try to verify token first
  const userIdFromToken = await verifyAuthToken(request);
  if (userIdFromToken) return userIdFromToken;

  // Fallback to extracting from request
  const userId = extractUserId(request, body);
  if (!userId) {
    throw new Error('Authentication required');
  }

  return userId;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200
): Response {
  return Response.json(data, { status });
}
