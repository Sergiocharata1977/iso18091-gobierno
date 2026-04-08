/**
 * Get Token Endpoint
 *
 * Helper endpoint to get your current Firebase token for testing
 * ONLY FOR DEVELOPMENT - Remove in production
 */

import { withAuth } from '@/lib/sdk/middleware/auth';
import { withErrorHandler } from '@/lib/sdk/middleware/errorHandler';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  withErrorHandler(async req => {
    const { user } = req;
    const token = req.headers.get('authorization')?.substring(7); // Remove 'Bearer '

    return NextResponse.json({
      success: true,
      message: 'Copy this token to use in Thunder Client or cURL',
      token,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
      },
      instructions: {
        thunderClient: 'Use this in Authorization header: Bearer <token>',
        curl: `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/test/sdk`,
      },
      expiresIn: '1 hour',
      timestamp: new Date().toISOString(),
    });
  })
);
