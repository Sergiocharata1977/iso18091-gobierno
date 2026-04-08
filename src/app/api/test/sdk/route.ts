/**
 * SDK Test Endpoint
 *
 * Simple endpoint to test SDK infrastructure
 */

import { logInfo } from '@/lib/sdk/helpers/logging';
import { withAuth } from '@/lib/sdk/middleware/auth';
import { withErrorHandler } from '@/lib/sdk/middleware/errorHandler';
import { requireRole } from '@/lib/sdk/middleware/permissions';
import {
  rateLimitConfigs,
  withRateLimit,
} from '@/lib/sdk/middleware/rateLimit';
import { NextResponse } from 'next/server';

/**
 * GET /api/test/sdk
 * Test authentication and get user info
 */
export const GET = withAuth(
  withErrorHandler(async req => {
    const { user } = req;

    logInfo('SDK test endpoint accessed', {
      userId: user.uid,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'SDK is working correctly!',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/test/sdk
 * Test with role requirement (only gerente or admin)
 */
export const POST = withAuth(
  requireRole(
    'admin',
    'gerente'
  )(
    withRateLimit(rateLimitConfigs.write)(
      withErrorHandler(async req => {
        const { user } = req;
        const body = await req.json();

        logInfo('SDK POST test endpoint accessed', {
          userId: user.uid,
          body,
        });

        return NextResponse.json(
          {
            success: true,
            message: 'POST request successful! You have the required role.',
            user: {
              uid: user.uid,
              email: user.email,
              role: user.role,
            },
            receivedData: body,
            timestamp: new Date().toISOString(),
          },
          { status: 201 }
        );
      })
    )
  )
);
